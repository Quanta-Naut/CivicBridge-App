"""
Flask API server to receive issue reports and store them in Supabase
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import random
import string
import jwt
import json
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from dotenv import load_dotenv
import io
import uuid

# Firebase imports
try:
    import firebase_admin
    from firebase_admin import auth, credentials
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️  Firebase Admin SDK not installed. Run: pip install firebase-admin")

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size (accounts for base64 encoding + large images)

# Initialize Supabase client
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if not supabase_url or not supabase_key:
    print("Warning: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY in .env file")
    supabase = None
else:
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        print("✓ Supabase client initialized successfully")
    except Exception as e:
        print(f"✗ Failed to initialize Supabase client: {e}")
        supabase = None

# Initialize Firebase Admin SDK
if FIREBASE_AVAILABLE:
    firebase_cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
    if firebase_cred_json:
        try:
            cred_dict = json.loads(firebase_cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Firebase Admin SDK: {e}")
    else:
        print("⚠️  Firebase service account key not found in environment")
else:
    print("⚠️  Firebase Admin SDK not available")

# Error handlers
@app.errorhandler(413)
def too_large(e):
    """Handle file too large errors"""
    return jsonify({
        'success': False,
        'error': 'File too large. Maximum file size is 100MB.',
        'message': 'Please compress your image or use a smaller file. Large images are automatically compressed on upload.'
    }), 413

@app.errorhandler(400)
def bad_request(e):
    """Handle bad request errors"""
    return jsonify({
        'success': False,
        'error': 'Bad request',
        'message': 'Invalid request data or format.'
    }), 400

def log_api_access(endpoint, method, client_ip):
    """Log API access with timestamp"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\n{'='*60}")
    print(f"🌐 API ACCESS LOG - {timestamp}")
    print(f"Endpoint: {method} {endpoint}")
    print(f"Client IP: {client_ip}")
    print(f"User Agent: {request.headers.get('User-Agent', 'Unknown')}")
    print(f"{'='*60}")

def log_response(response_data, status_code):
    """Log the response being sent"""
    print(f"\n📤 RESPONSE LOG:")
    print(f"Status Code: {status_code}")
    print(f"Response Size: {len(str(response_data))} characters")
    
    # Pretty print response (truncate if too long)
    import json
    if isinstance(response_data, dict):
        response_str = json.dumps(response_data, indent=2)
        if len(response_str) > 500:
            print(f"Response Preview (truncated):")
            print(response_str[:300] + "\n... [response truncated for readability] ...")
        else:
            print(f"Response Data:")
            print(response_str)
    else:
        print(f"Response Data: {response_data}")
    
    print(f"{'='*60}\n")

def save_issue_to_supabase(issue_data, firebase_token=None):
    """Save issue data to Supabase database with Firebase authentication context"""
    try:
        if not supabase:
            print("Supabase client not available, storing in memory only")
            return None
        
        # Create a client instance for this request
        client = supabase
        
        # If we have a Firebase token, use it to authenticate with Supabase
        if firebase_token:
            try:
                # Create a new Supabase client with the user's token
                from supabase import create_client
                client = create_client(
                    os.getenv('SUPABASE_URL'),
                    os.getenv('SUPABASE_KEY'),
                    options={
                        'auth': {
                            'auto_refresh_token': False,
                            'persist_session': False
                        }
                    }
                )
                # Set the session with the Firebase JWT token
                # This allows RLS policies to access the JWT claims
                client.auth.set_session(firebase_token, refresh_token=None)
                print(f"✓ Using authenticated Supabase client for user context")
            except Exception as auth_error:
                print(f"⚠️  Failed to authenticate with Firebase token: {auth_error}")
                print("   Falling back to service account (admin) access")
                # Fall back to admin client - we'll need to bypass RLS
                client = supabase
        
        # Insert into 'issues' table
        result = client.table('issues').insert(issue_data).execute()
        
        if result.data:
            print(f"✓ Issue saved to Supabase with ID: {result.data[0].get('id')}")
            return result.data[0]
        else:
            print("✗ Failed to save issue to Supabase")
            return None
            
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        print(f"Error type: {type(e).__name__}")
        print(f"Error details: {str(e)}")
        
        # If RLS is blocking, try using service role key
        if "row-level security policy" in str(e).lower():
            print("🔧 RLS policy blocking insert, attempting service role bypass...")
            return save_issue_with_service_role(issue_data)
        
        return None

def save_issue_with_service_role(issue_data):
    """Save issue using service role key to bypass RLS"""
    try:
        # Use service role key if available
        service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if service_role_key:
            print("🔑 Using service role key to bypass RLS...")
            from supabase import create_client
            service_client = create_client(
                os.getenv('SUPABASE_URL'),
                service_role_key
            )
            result = service_client.table('issues').insert(issue_data).execute()
            if result.data:
                print(f"✓ Issue saved with service role, ID: {result.data[0].get('id')}")
                return result.data[0]
        else:
            print("❌ No service role key available, cannot bypass RLS")
            # As fallback, temporarily disable RLS for this operation
            print("🔧 Attempting to insert with RLS bypass using admin client...")
            
            # Direct SQL insert that bypasses RLS
            columns = ', '.join(issue_data.keys())
            placeholders = ', '.join(['%s'] * len(issue_data))
            values = list(issue_data.values())
            
            # Use RPC call to bypass RLS
            try:
                result = supabase.rpc('create_issue_safe', {
                    'p_title': issue_data.get('title'),
                    'p_description': issue_data.get('description'),
                    'p_category': issue_data.get('category'),
                    'p_location': issue_data.get('location'),
                    'p_address': issue_data.get('address'),
                    'p_latitude': issue_data.get('latitude'),
                    'p_longitude': issue_data.get('longitude'),
                    'p_image_path': issue_data.get('image_path'),
                    'p_audio_path': issue_data.get('audio_path'),
                    'p_status': issue_data.get('status', 'open'),
                    'p_priority': issue_data.get('priority', 'medium'),
                    'p_user_id': issue_data.get('user_id')
                }).execute()
                
                if result.data:
                    print(f"✓ Issue inserted via create_issue_safe RPC")
                    return result.data
            except Exception as rpc_error:
                print(f"RPC function failed: {rpc_error}")
                # Try the jsonb version
                result = supabase.rpc('insert_issue_bypass_rls', {
                    'issue_data': issue_data
                }).execute()
                
                if result.data:
                    print(f"✓ Issue inserted via insert_issue_bypass_rls RPC")
                    return result.data
                
        return None
    except Exception as e:
        print(f"❌ Service role bypass failed: {e}")
        return None

@app.route('/api/issues', methods=['POST'])
def create_issue():
    log_api_access('/api/issues', 'POST', request.remote_addr)
    
    print(f"Content-Type: {request.content_type}")
    print(f"Form data keys: {list(request.form.keys())}")
    print(f"Files: {list(request.files.keys())}")
    
    try:
        # Check authentication (optional for public issue reporting)
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        print(f"🔍 CREATE ISSUE DEBUG: Auth header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            print(f"🔍 CREATE ISSUE DEBUG: Token extracted (length: {len(token)})")
            
            auth_data = verify_auth_token(token)
            print(f"🔍 CREATE ISSUE DEBUG: Auth verification result: {bool(auth_data)}")
            
            if auth_data:
                user_id = auth_data['user_id']
                print(f"✓ CREATE ISSUE: Authenticated user ID: {user_id} (via {auth_data['type']})")
                print(f"✓ CREATE ISSUE: User details - mobile: {auth_data.get('mobile_number', 'N/A')}")
            else:
                print("⚠️ CREATE ISSUE: Invalid token provided, proceeding as anonymous")
        else:
            print("ℹ️ CREATE ISSUE: No authentication provided, creating issue anonymously")
        
        print(f"🔍 CREATE ISSUE DEBUG: Final user_id to be saved: {user_id} (type: {type(user_id)})")
        
        # Get form data
        title = request.form.get('title')
        description = request.form.get('description')
        latitude = float(request.form.get('latitude', 0))
        longitude = float(request.form.get('longitude', 0))
        category = request.form.get('category')
        priority = request.form.get('priority')
        description_mode = request.form.get('description_mode')
        
        # Validate required fields
        if not title or not description:
            error_response = {'error': 'Title and description are required'}
            log_response(error_response, 400)
            return jsonify(error_response), 400
        
        # Handle image file if present
        image_url = None
        image_filename = None
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                # Create a clean filename
                original_filename = secure_filename(f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_issue_image.jpg")
                
                # Upload to Supabase Storage
                upload_result = upload_to_supabase_storage(image_file, original_filename)
                
                if upload_result['success']:
                    image_url = upload_result['url']
                    image_filename = upload_result['filename']
                    print(f"✓ Image uploaded to Supabase Storage: {image_url}")
                else:
                    print(f"✗ Failed to upload image to Supabase Storage: {upload_result['error']}")
                    # Fallback to local storage for backwards compatibility
                    image_file.seek(0)  # Reset file pointer
                    image_filename = original_filename
                    image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                    image_file.save(image_path)
                    print(f"✓ Image saved locally as fallback: {image_path}")
        
        # Handle audio file if present
        audio_url = None
        audio_filename = None
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                # Create a clean filename  
                original_audio_filename = secure_filename(f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_issue_audio.webm")
                
                # Upload to Supabase Storage
                upload_result = upload_to_supabase_storage(audio_file, original_audio_filename, 'Civic-Audio-Bucket')
                
                if upload_result['success']:
                    audio_url = upload_result['url']
                    audio_filename = upload_result['filename']
                    print(f"✓ Audio uploaded to Supabase Storage: {audio_url}")
                else:
                    print(f"✗ Failed to upload audio to Supabase Storage: {upload_result['error']}")
                    # Fallback to local storage for backwards compatibility
                    audio_file.seek(0)  # Reset file pointer
                    audio_filename = original_audio_filename
                    audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
                    audio_file.save(audio_path)
                    print(f"✓ Audio saved locally as fallback: {audio_path}")
        
        # Create issue data
        issue_data = {
            'user_id': user_id,
            'title': title,
            'description': description,
            'latitude': latitude,
            'longitude': longitude,
            'category': category,
            'priority': priority,
            'description_mode': description_mode,
            'image_filename': image_filename,
            'audio_filename': audio_filename,
            'image_url': image_url,  # Supabase Storage URL
            'audio_url': audio_url,  # Supabase Storage URL  
            'vouch_priority': 1,  # Initialize vouch priority to 1
            'status': 'Open',
            'created_at': datetime.now().isoformat()
        }
        
        print(f"🔍 CREATE ISSUE DEBUG: Issue data to save:")
        print(f"   - user_id: {issue_data['user_id']} (type: {type(issue_data['user_id'])})")
        print(f"   - title: {issue_data['title']}")
        print(f"   - category: {issue_data['category']}")
        print(f"   - status: {issue_data['status']}")
        
        # Save to Supabase first, fallback to memory storage
        # Pass Firebase token if available for proper authentication context
        firebase_token = None
        if auth_header and auth_header.startswith('Bearer '):
            firebase_token = auth_header.split(' ')[1]
        
        saved_issue = save_issue_to_supabase(issue_data, firebase_token)
        
        if saved_issue:
            # Successfully saved to Supabase
            response_data = {
                'message': 'Issue created successfully and saved to database',
                'issue': saved_issue
            }
            log_response(response_data, 201)
            return jsonify(response_data), 201
        else:
            # Fallback to memory storage
            issue_data['id'] = len(issues) + 1
            issues.append(issue_data)
            response_data = {
                'message': 'Issue created successfully (saved locally)',
                'issue': issue_data,
                'warning': 'Could not save to database'
            }
            log_response(response_data, 201)
            return jsonify(response_data), 201
        
    except Exception as e:
        print(f"=== FLASK ERROR: {str(e)} ===")
        error_response = {'error': str(e)}
        log_response(error_response, 500)
        return jsonify(error_response), 500

@app.route('/api/test', methods=['GET'])
def test_connection():
    """Simple test endpoint to check connectivity"""
    log_api_access('/api/test', 'GET', request.remote_addr)
    
    response_data = {'message': 'Flask server is working!', 'status': 'ok'}
    log_response(response_data, 200)
    return jsonify(response_data)

@app.route('/api/issues', methods=['GET'])
def get_issues():
    """Get all issues from Supabase or memory storage with vouch counts"""
    log_api_access('/api/issues', 'GET', request.remote_addr)
    
    try:
        if supabase:
            print("🔍 Fetching issues from Supabase database...")
            
            # Try to use the issue_vouch_counts view for unrestricted access with accurate vouch data
            try:
                vouch_result = supabase.table('issue_vouch_counts').select('*').order('created_at', desc=True).execute()
                
                if vouch_result.data:
                    # Add compatible fields for frontend
                    for issue in vouch_result.data:
                        issue['vouch_count'] = issue.get('vouch_count', issue.get('vouch_priority', 0))
                        # Add missing media fields if not present
                        if 'image_filename' not in issue:
                            issue['image_filename'] = None
                        if 'audio_filename' not in issue:
                            issue['audio_filename'] = None
                        if 'image_url' not in issue:
                            issue['image_url'] = None
                        if 'audio_url' not in issue:
                            issue['audio_url'] = None
                        if 'description_mode' not in issue:
                            issue['description_mode'] = None
                    
                    response_data = {'issues': vouch_result.data, 'source': 'issue_vouch_counts_view', 'count': len(vouch_result.data)}
                    print(f"✓ Found {len(vouch_result.data)} issues with vouch data from unrestricted view")
                    log_response(response_data, 200)
                    return jsonify(response_data)
                    
            except Exception as view_error:
                print(f"⚠️ issue_vouch_counts view not available: {view_error}")
                # Fallback to regular issues table
            
            # Fallback: use regular issues table
            select_fields = 'id,title,description,latitude,longitude,category,priority,vouch_priority,status,created_at,image_filename,audio_filename,image_url,audio_url,description_mode'
            result = supabase.table('issues').select(select_fields).order('created_at', desc=True).execute()
            
            if result.data:
                # Add vouch_count field using the existing vouch_priority for consistency
                for issue in result.data:
                    issue['vouch_count'] = issue.get('vouch_priority', 0)
                
                response_data = {'issues': result.data, 'source': 'database', 'count': len(result.data)}
                print(f"✓ Found {len(result.data)} issues in database (fallback mode)")
                log_response(response_data, 200)
                return jsonify(response_data)
        
        # Fallback to memory storage
        print("💾 Using memory storage fallback...")
        response_data = {'issues': issues, 'source': 'memory', 'count': len(issues)}
        log_response(response_data, 200)
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error fetching issues: {e}")
        error_response = {'issues': issues, 'source': 'memory', 'error': str(e), 'count': len(issues)}
        log_response(error_response, 200)
        return jsonify(error_response)

@app.route('/api/issues/vouch-details', methods=['GET'])
def get_all_issues_with_vouch_details():
    """Get all issues with detailed vouch information using unrestricted view"""
    log_api_access('/api/issues/vouch-details', 'GET', request.remote_addr)
    
    try:
        if supabase:
            print("🔍 Fetching detailed issue vouch data from unrestricted view...")
            
            # Use the issue_vouch_counts view for complete vouch details
            result = supabase.table('issue_vouch_counts').select('*').order('vouch_count', desc=True).execute()
            
            if result.data:
                response_data = {
                    'issues': result.data, 
                    'source': 'issue_vouch_counts_view', 
                    'count': len(result.data),
                    'includes_vouch_details': True,
                    'includes_voucher_list': True
                }
                print(f"✓ Found {len(result.data)} issues with complete vouch details")
                log_response(response_data, 200)
                return jsonify(response_data)
            else:
                return jsonify({'issues': [], 'source': 'issue_vouch_counts_view', 'count': 0})
        
        # Fallback to memory storage
        return jsonify({'issues': issues, 'source': 'memory', 'count': len(issues)})
        
    except Exception as e:
        print(f"❌ Error fetching detailed vouch data: {e}")
        return jsonify({'error': str(e), 'issues': [], 'count': 0}), 500

@app.route('/api/issues/nearby', methods=['GET'])
def get_nearby_issues():
    """Get issues excluding those reported by the current user (for homepage)"""
    log_api_access('/api/issues/nearby', 'GET', request.remote_addr)
    
    try:
        # Extract current user information from authentication token
        current_user_id = None
        current_user_info = None
        auth_header = request.headers.get('Authorization')
        
        print(f"🔍 NEARBY ISSUES DEBUG: Auth header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
                print(f"🔍 NEARBY ISSUES DEBUG: Token extracted (length: {len(token)})")
                
                auth_data = verify_auth_token(token)
                print(f"🔍 NEARBY ISSUES DEBUG: Auth verification result: {bool(auth_data)}")
                
                if auth_data:
                    current_user_id = auth_data.get('user_id')
                    current_user_info = auth_data
                    print(f"✓ NEARBY ISSUES: Authenticated user ID: {current_user_id} (via {auth_data.get('type', 'unknown')})")
                    print(f"✓ NEARBY ISSUES: User details - mobile: {auth_data.get('mobile_number', 'N/A')}, firebase_uid: {auth_data.get('firebase_uid', 'N/A')}")
                else:
                    print("⚠️ NEARBY ISSUES: Authentication token verification failed")
            except Exception as auth_error:
                print(f"❌ NEARBY ISSUES: Authentication error: {auth_error}")
                current_user_id = None
        else:
            print("ℹ️ NEARBY ISSUES: No authentication header provided")
        
        if supabase:
            print("🔍 Fetching nearby issues (excluding user's own issues)...")
            
            # Try to use the issue_vouch_counts view first
            try:
                result = supabase.table('issue_vouch_counts').select('*').order('created_at', desc=True).execute()
                
                if result.data:
                    # Filter out current user's issues if user is authenticated
                    filtered_issues = result.data
                    original_count = len(result.data)
                    
                    if current_user_id:
                        print(f"🔍 FILTERING DEBUG: Current user ID: {current_user_id} (type: {type(current_user_id)})")
                        print(f"🔍 FILTERING DEBUG: Total issues from view: {original_count}")
                        
                        # Log sample issues for debugging
                        for i, issue in enumerate(result.data[:3]):
                            issue_user_id = issue.get('user_id')
                            print(f"🔍 FILTERING DEBUG: Issue {i+1}:")
                            print(f"   - Issue ID: {issue.get('id')}")
                            print(f"   - Issue user_id: {issue_user_id} (type: {type(issue_user_id)})")
                            print(f"   - Title: {issue.get('title', 'No title')[:30]}...")
                            print(f"   - Match current user? {issue_user_id == current_user_id}")
                        
                        # Enhanced filtering with type conversion handling
                        def should_exclude_issue(issue):
                            issue_user_id = issue.get('user_id')
                            
                            # Handle None cases
                            if issue_user_id is None or current_user_id is None:
                                return False
                            
                            # Convert both to same type for comparison
                            try:
                                # Try to convert both to integers for comparison
                                issue_user_id_int = int(issue_user_id)
                                current_user_id_int = int(current_user_id)
                                return issue_user_id_int == current_user_id_int
                            except (ValueError, TypeError):
                                # Fallback to string comparison
                                return str(issue_user_id) == str(current_user_id)
                        
                        # Filter out issues reported by current user
                        filtered_issues = [issue for issue in result.data if not should_exclude_issue(issue)]
                        filtered_count = len(filtered_issues)
                        excluded_count = original_count - filtered_count
                        
                        print(f"✓ FILTERING RESULT: Excluded {excluded_count} user's own issues")
                        print(f"✓ FILTERING RESULT: Showing {filtered_count} of {original_count} total issues")
                        
                        if excluded_count == 0:
                            print("⚠️ WARNING: No issues were filtered out - user may not have any issues OR filtering failed")
                            print(f"⚠️ WARNING: Check if user_id {current_user_id} exists in issues table")
                    else:
                        print("ℹ️ FILTERING: No authentication provided - showing all issues")
                    
                    # Add compatible fields for frontend
                    for issue in filtered_issues:
                        issue['vouch_count'] = issue.get('vouch_count', issue.get('vouch_priority', 0))
                        # Add missing media fields if not present
                        if 'image_filename' not in issue:
                            issue['image_filename'] = None
                        if 'audio_filename' not in issue:
                            issue['audio_filename'] = None
                        if 'image_url' not in issue:
                            issue['image_url'] = None
                        if 'audio_url' not in issue:
                            issue['audio_url'] = None
                        if 'description_mode' not in issue:
                            issue['description_mode'] = None
                    
                    response_data = {
                        'issues': filtered_issues, 
                        'source': 'issue_vouch_counts_view_filtered', 
                        'count': len(filtered_issues),
                        'original_count': original_count,
                        'excluded_count': excluded_count,
                        'excluded_user_issues': current_user_id is not None,
                        'current_user_id': current_user_id,
                        'user_info': {
                            'id': current_user_id,
                            'mobile_number': current_user_info.get('mobile_number') if current_user_info else None,
                            'firebase_uid': current_user_info.get('firebase_uid') if current_user_info else None
                        } if current_user_info else None
                    }
                    print(f"✓ VIEW RESULT: Returning {len(filtered_issues)} nearby issues (excluded {excluded_count} user's own)")
                    log_response(response_data, 200)
                    return jsonify(response_data)
                    
            except Exception as view_error:
                print(f"⚠️ issue_vouch_counts view not available: {view_error}")
                # Fallback to regular issues table
            
            # Fallback: use regular issues table with user filtering
            print("🔍 FALLBACK: Using regular issues table")
            select_fields = 'id,title,description,latitude,longitude,category,priority,vouch_priority,status,created_at,image_filename,audio_filename,image_url,audio_url,description_mode,user_id'
            
            # Always fetch all issues first, then filter in Python for consistency
            result = supabase.table('issues').select(select_fields).order('created_at', desc=True).execute()
            
            if result.data:
                original_count = len(result.data)
                filtered_issues = result.data
                
                if current_user_id:
                    print(f"🔍 FALLBACK FILTERING: User ID: {current_user_id}, Original count: {original_count}")
                    
                    # Apply same filtering logic as above
                    def should_exclude_issue(issue):
                        issue_user_id = issue.get('user_id')
                        
                        if issue_user_id is None or current_user_id is None:
                            return False
                        
                        try:
                            issue_user_id_int = int(issue_user_id)
                            current_user_id_int = int(current_user_id)
                            return issue_user_id_int == current_user_id_int
                        except (ValueError, TypeError):
                            return str(issue_user_id) == str(current_user_id)
                    
                    filtered_issues = [issue for issue in result.data if not should_exclude_issue(issue)]
                    excluded_count = original_count - len(filtered_issues)
                    print(f"✓ FALLBACK FILTERING: Excluded {excluded_count} user's own issues")
                
                # Add vouch_count field using the existing vouch_priority for consistency
                for issue in filtered_issues:
                    issue['vouch_count'] = issue.get('vouch_priority', 0)
                
                response_data = {
                    'issues': filtered_issues, 
                    'source': 'database_fallback_filtered', 
                    'count': len(filtered_issues),
                    'original_count': original_count,
                    'excluded_user_issues': current_user_id is not None,
                    'user_id': current_user_id
                }
                print(f"✓ FALLBACK RESULT: Returning {len(filtered_issues)} nearby issues from database")
                log_response(response_data, 200)
                return jsonify(response_data)
        
        # Fallback to memory storage
        print("💾 Using memory storage fallback for nearby issues...")
        memory_issues = issues
        
        # Note: Memory storage might not have user_id filtering capability
        response_data = {
            'issues': memory_issues, 
            'source': 'memory', 
            'count': len(memory_issues),
            'excluded_user_issues': False,
            'user_id': None
        }
        log_response(response_data, 200)
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error fetching nearby issues: {e}")
        error_response = {'issues': [], 'source': 'error', 'error': str(e), 'count': 0}
        log_response(error_response, 200)
        return jsonify(error_response)

@app.route('/api/debug/user-issues', methods=['GET'])
def debug_user_issues():
    """Debug endpoint to check user's issues and filtering logic"""
    log_api_access('/api/debug/user-issues', 'GET', request.remote_addr)
    
    try:
        # Extract current user information
        current_user_id = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            auth_data = verify_auth_token(token)
            if auth_data:
                current_user_id = auth_data.get('user_id')
        
        if not current_user_id:
            return jsonify({
                'error': 'No authentication provided',
                'message': 'Please login to see debug information'
            }), 401
        
        debug_info = {
            'current_user_id': current_user_id,
            'current_user_id_type': str(type(current_user_id)),
            'auth_data': auth_data
        }
        
        if supabase:
            # Get all issues
            result = supabase.table('issues').select('id,title,user_id,created_at').order('created_at', desc=True).execute()
            
            if result.data:
                all_issues = result.data
                user_issues = [issue for issue in all_issues if issue.get('user_id') == current_user_id]
                other_issues = [issue for issue in all_issues if issue.get('user_id') != current_user_id]
                
                debug_info.update({
                    'total_issues': len(all_issues),
                    'user_issues_count': len(user_issues),
                    'other_issues_count': len(other_issues),
                    'user_issues': user_issues[:5],  # First 5 user issues
                    'other_issues_sample': other_issues[:5],  # First 5 other issues
                    'all_issues_sample': all_issues[:5]  # First 5 all issues
                })
                
                # Check data types in issues
                if all_issues:
                    sample_issue = all_issues[0]
                    debug_info['sample_issue_user_id'] = sample_issue.get('user_id')
                    debug_info['sample_issue_user_id_type'] = str(type(sample_issue.get('user_id')))
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/issues/<int:issue_id>/vouch', methods=['POST'])
def vouch_issue(issue_id):
    """Increment vouch_priority of an issue by +1 and track user vouch"""
    log_api_access(f'/api/issues/{issue_id}/vouch', 'POST', request.remote_addr)
    
    try:
        # Get user ID from authentication if available
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            auth_data = verify_auth_token(token)
            if auth_data:
                user_id = auth_data['user_id']
                print(f"✓ Authenticated user vouching: {user_id} (via {auth_data['type']})")
            else:
                print("⚠️ Invalid token, proceeding as anonymous vouch")
        else:
            print("ℹ️ No authentication provided, anonymous vouch")
        
        if supabase:
            # Use the enhanced database function to handle vouching with user tracking
            try:
                # Call the vouch function with user_id parameter
                params = {
                    'issue_id_param': issue_id,
                    'user_id_param': user_id
                }
                result = supabase.rpc('vouch_issue', params).execute()
                
                if result.data:
                    vouch_result = result.data
                    if vouch_result.get('success'):
                        print(f"✓ Issue {issue_id} vouched successfully - count: {vouch_result['vouch_count']}, user: {vouch_result.get('user_id', 'anonymous')}")
                        response_data = {
                            'message': 'Issue vouched successfully',
                            'issue_id': vouch_result['issue_id'],
                            'vouch_count': vouch_result['vouch_count'],
                            'vouch_priority': vouch_result['vouch_priority'],
                            'user_vouched': vouch_result.get('user_vouched', False),
                            'user_id': vouch_result.get('user_id'),
                            'source': 'database'
                        }
                        log_response(response_data, 200)
                        return jsonify(response_data), 200
                    else:
                        error_msg = vouch_result.get('error', 'Vouch failed')
                        status_code = 409 if vouch_result.get('already_vouched') else (404 if 'not found' in error_msg.lower() else 500)
                        error_response = {
                            'error': error_msg,
                            'already_vouched': vouch_result.get('already_vouched', False)
                        }
                        log_response(error_response, status_code)
                        return jsonify(error_response), status_code
                else:
                    error_response = {'error': 'No response from vouch function'}
                    log_response(error_response, 500)
                    return jsonify(error_response), 500
                    
            except Exception as db_error:
                print(f"Database vouch function error: {db_error}")
                # Fallback to simple vouch_priority increment (legacy support)
                result = supabase.table('issues').select('vouch_priority').eq('id', issue_id).execute()
                
                if not result.data:
                    return jsonify({'error': 'Issue not found'}), 404
                
                current_vouch = result.data[0].get('vouch_priority', 0)
                new_vouch = current_vouch + 1
                
                # Try direct update (fallback)
                update_result = supabase.table('issues').update({
                    'vouch_priority': new_vouch
                }).eq('id', issue_id).execute()
                
                if update_result.data:
                    print(f"✓ Issue {issue_id} vouch_priority updated to {new_vouch} (legacy fallback)")
                    response_data = {
                        'message': 'Issue vouched successfully (legacy mode)',
                        'issue_id': issue_id,
                        'vouch_count': new_vouch,
                        'vouch_priority': new_vouch,
                        'user_vouched': False,
                        'source': 'database',
                        'warning': 'Using legacy vouch mode - user tracking not available'
                    }
                    log_response(response_data, 200)
                    return jsonify(response_data), 200
                else:
                    error_response = {'error': 'Failed to update vouch priority'}
                    log_response(error_response, 500)
                    return jsonify(error_response), 500
        
        # Fallback to memory storage (simplified vouch system)
        for issue in issues:
            if issue.get('id') == issue_id:
                current_vouch = issue.get('vouch_priority', 0)
                issue['vouch_priority'] = current_vouch + 1
                print(f"✓ Issue {issue_id} vouch_priority updated to {issue['vouch_priority']} (memory)")
                return jsonify({
                    'message': 'Issue vouched successfully',
                    'issue_id': issue_id,
                    'vouch_count': issue['vouch_priority'],
                    'user_vouched': True,
                    'source': 'memory'
                }), 200
        
        return jsonify({'error': 'Issue not found'}), 404
        
    except Exception as e:
        print(f"=== FLASK ERROR: {str(e)} ===")
        return jsonify({'error': str(e)}), 500

@app.route('/api/issues/<int:issue_id>/vouch', methods=['GET'])
def get_vouch_details(issue_id):
    """Get the current vouch count and user vouch status for an issue"""
    log_api_access(f'/api/issues/{issue_id}/vouch', 'GET', request.remote_addr)
    try:
        # Get user ID from authentication if available
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            auth_data = verify_auth_token(token)
            if auth_data:
                user_id = auth_data['user_id']
        
        if supabase:
            try:
                # Use the check_user_vouch function to get detailed vouch information
                params = {
                    'issue_id_param': issue_id,
                    'user_id_param': user_id
                }
                result = supabase.rpc('check_user_vouch', params).execute()
                
                if result.data:
                    vouch_data = result.data
                    
                    # Also get issue title for compatibility
                    issue_result = supabase.table('issues').select('id, title').eq('id', issue_id).execute()
                    issue_title = issue_result.data[0]['title'] if issue_result.data else 'Unknown'
                    
                    return jsonify({
                        'issue_id': vouch_data['issue_id'],
                        'title': issue_title,
                        'vouch_count': vouch_data['vouch_count'],
                        'vouch_priority': vouch_data['vouch_priority'],
                        'user_vouched': vouch_data['user_vouched'],
                        'user_id': vouch_data.get('user_id'),
                        'source': 'database'
                    })
                else:
                    # Fallback to simple query
                    result = supabase.table('issues').select('id, title, vouch_priority').eq('id', issue_id).execute()
                    
                    if result.data:
                        issue_data = result.data[0]
                        vouch_count = issue_data.get('vouch_priority', 0)
                        return jsonify({
                            'issue_id': issue_data['id'],
                            'title': issue_data['title'],
                            'vouch_count': vouch_count,
                            'vouch_priority': vouch_count,
                            'user_vouched': False,
                            'source': 'database'
                        })
                    else:
                        return jsonify({'error': 'Issue not found'}), 404
                        
            except Exception as db_error:
                print(f"Database check function error: {db_error}")
                # Fallback to simple query
                result = supabase.table('issues').select('id, title, vouch_priority').eq('id', issue_id).execute()
                
                if result.data:
                    issue_data = result.data[0]
                    vouch_count = issue_data.get('vouch_priority', 0)
                    return jsonify({
                        'issue_id': issue_data['id'],
                        'title': issue_data['title'],
                        'vouch_count': vouch_count,
                        'vouch_priority': vouch_count,
                        'user_vouched': False,  # Can't determine without function
                        'source': 'database'
                    })
                else:
                    return jsonify({'error': 'Issue not found'}), 404
        
        # Fallback to memory storage
        for issue in issues:
            if issue.get('id') == issue_id:
                vouch_count = issue.get('vouch_priority', 0)
                return jsonify({
                    'issue_id': issue['id'],
                    'title': issue['title'],
                    'vouch_count': vouch_count,
                    'vouch_priority': vouch_count,
                    'user_vouched': False,
                    'source': 'memory'
                })
        
        return jsonify({'error': 'Issue not found'}), 404
        
    except Exception as e:
        print(f"Error getting vouch count: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/vouches', methods=['GET'])
def get_user_vouches():
    """Get all issues vouched by the current user"""
    log_api_access('/api/user/vouches', 'GET', request.remote_addr)
    
    try:
        # Check authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            payload = verify_auth_token(token)
            if payload:
                user_id = payload['user_id']
            else:
                return jsonify({'error': 'Invalid or expired token'}), 401
        else:
            return jsonify({'error': 'Authorization token required'}), 401
        
        if supabase:
            # Get all issues vouched by this user
            vouches_result = supabase.table('vouches').select('''
                created_at,
                issues (
                    id,
                    title,
                    description,
                    category,
                    priority,
                    status,
                    created_at
                )
            ''').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            vouched_issues = []
            if vouches_result.data:
                for vouch in vouches_result.data:
                    if vouch.get('issues'):
                        issue_data = vouch['issues']
                        issue_data['vouched_at'] = vouch['created_at']
                        vouched_issues.append(issue_data)
            
            return jsonify({
                'vouched_issues': vouched_issues,
                'count': len(vouched_issues),
                'source': 'database'
            })
        
        # Fallback to memory storage
        return jsonify({
            'vouched_issues': [],
            'count': 0,
            'source': 'memory'
        })
        
    except Exception as e:
        print(f"Error getting user vouches: {e}")
        return jsonify({'error': str(e)}), 500

# Test endpoint to debug vouch counts using vouch_priority
@app.route('/api/test-vouch-counts', methods=['GET'])
def test_vouch_counts():
    """Test endpoint to see vouch_priority values clearly"""
    try:
        if supabase:
            # Get first few issues with their vouch_priority
            issues_result = supabase.table('issues').select('id, title, vouch_priority').limit(10).execute()
            
            test_data = []
            total_vouches = 0
            if issues_result.data:
                for issue in issues_result.data:
                    vouch_priority = issue.get('vouch_priority', 0)
                    total_vouches += vouch_priority
                    test_data.append({
                        'id': issue['id'],
                        'title': issue['title'][:30],
                        'vouch_priority': vouch_priority
                    })
            
            return jsonify({
                'total_vouches': total_vouches,
                'sample_issues': test_data,
                'note': 'Using vouch_priority field from issues table'
            })
        
        return jsonify({'error': 'No database connection'})
        
    except Exception as e:
        return jsonify({'error': str(e)})

# In-memory storage (replace with database in production)
issues = []

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# OTP storage (in production, use Redis or database with TTL)
otp_store = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def generate_civic_id():
    """Generate a unique civic ID"""
    prefix = 'CIV'
    random_num = random.randint(100000, 999999)
    return f"{prefix}{random_num}"

def normalize_phone_number(phone_number):
    """
    Convert Firebase phone number format to database format
    Firebase: "+919876543210" -> Database: "9876543210" (10 digits)
    """
    if not phone_number:
        return None
    
    # Remove any spaces or special characters except +
    cleaned = phone_number.replace(' ', '').replace('-', '')
    
    # Handle Indian phone numbers (+91)
    if cleaned.startswith('+91'):
        return cleaned[3:]  # Remove +91, keep 10 digits
    elif cleaned.startswith('91') and len(cleaned) == 12:
        return cleaned[2:]  # Remove 91, keep 10 digits  
    elif cleaned.startswith('+'):
        return cleaned[1:]  # Remove + for other countries
    else:
        return cleaned[-10:] if len(cleaned) >= 10 else cleaned  # Take last 10 digits

def generate_jwt_token(user_data):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_data['id'],
        'mobile_number': user_data['mobile_number'],
        'exp': datetime.utcnow() + timedelta(days=30)  # Token expires in 30 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def upload_to_supabase_storage(file_data, filename, bucket_name='Civic-Image-Bucket'):
    """
    Upload file to Supabase Storage and return the public URL
    
    Args:
        file_data: Binary file data or file-like object
        filename: Name for the file in storage
        bucket_name: Supabase storage bucket name
    
    Returns:
        dict: {'success': True, 'url': 'public_url'} or {'success': False, 'error': 'message'}
    """
    if not supabase:
        return {'success': False, 'error': 'Supabase client not initialized'}
    
    try:
        # Generate unique filename to prevent conflicts
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # Determine folder based on bucket type
        if bucket_name == 'Civic-Image-Bucket':
            folder_path = f"Images/{unique_filename}"
        elif bucket_name == 'Civic-Audio-Bucket':
            folder_path = f"Audio/{unique_filename}"
        else:
            folder_path = unique_filename  # Fallback for other buckets
        
        # Convert file_data to bytes if it's a file-like object
        if hasattr(file_data, 'read'):
            file_bytes = file_data.read()
        else:
            file_bytes = file_data
            
        # Upload to Supabase Storage with folder organization
        response = supabase.storage.from_(bucket_name).upload(
            path=folder_path,
            file=file_bytes,
            file_options={"cache-control": "3600", "upsert": "false"}
        )
        
        if response:
            # Get public URL using the folder path
            public_url = supabase.storage.from_(bucket_name).get_public_url(folder_path)
            print(f"✓ File uploaded successfully: {public_url}")
            return {'success': True, 'url': public_url, 'filename': folder_path}
        else:
            return {'success': False, 'error': 'Upload failed - no response from storage'}
            
    except Exception as e:
        print(f"✗ Error uploading to Supabase Storage: {e}")
        return {'success': False, 'error': str(e)}

def verify_jwt_token(token):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info"""
    if not FIREBASE_AVAILABLE:
        return {'success': False, 'error': 'Firebase not available'}

    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)

        # Extract user information
        phone_number = decoded_token.get('phone_number')
        uid = decoded_token.get('uid')

        return {
            'success': True,
            'phone_number': phone_number,
            'uid': uid,
            'firebase_user': True
        }

    except auth.ExpiredIdTokenError:
        return {'success': False, 'error': 'Token expired'}
    except auth.InvalidIdTokenError:
        return {'success': False, 'error': 'Invalid token'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def sync_firebase_user_to_database(firebase_result):
    """Sync Firebase user to Supabase users table and ensure authenticated role"""
    if not supabase:
        return None
        
    try:
        firebase_uid = firebase_result['uid']
        phone_number = firebase_result.get('phone_number', '')
        
        # Normalize phone number (remove +91 prefix)
        mobile_number = normalize_phone_number(phone_number)
        
        # Check if user already exists
        existing_user = supabase.table('users').select('*').eq('firebase_uid', firebase_uid).execute()
        
        if existing_user.data and len(existing_user.data) > 0:
            # User exists, return existing user data
            user = existing_user.data[0]
            print(f"✓ Firebase user {firebase_uid} found in database: {user['id']}")
            return user
        else:
            # User doesn't exist, create new user
            civic_id = generate_civic_id()
            user_data = {
                'firebase_uid': firebase_uid,
                'mobile_number': mobile_number or '',
                'civic_id': civic_id,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            new_user = supabase.table('users').insert(user_data).execute()
            
            if new_user.data and len(new_user.data) > 0:
                user = new_user.data[0]
                print(f"✓ New Firebase user created in database: {user['id']} (UID: {firebase_uid})")
                return user
            else:
                print(f"✗ Failed to create Firebase user in database")
                return None
                
    except Exception as e:
        print(f"Error syncing Firebase user to database: {e}")
        return None

def create_supabase_client_with_firebase_jwt(firebase_token):
    """Create Supabase client with Firebase JWT for authenticated requests"""
    try:
        # Create a Supabase client with the Firebase JWT token
        # This ensures the user gets the 'authenticated' role
        firebase_supabase = create_client(
            supabase_url, 
            supabase_key,
            options={
                'auth': {
                    'access_token': firebase_token,
                    'token_type': 'bearer'
                }
            }
        )
        return firebase_supabase
    except Exception as e:
        print(f"Error creating Firebase-authenticated Supabase client: {e}")
        return None

def verify_auth_token(token):
    """Verify authentication token (supports both JWT and Firebase tokens)"""
    if not token:
        return None

    # First try JWT token
    jwt_payload = verify_jwt_token(token)
    if jwt_payload:
        return {
            'type': 'jwt',
            'user_id': jwt_payload.get('user_id'),
            'mobile_number': jwt_payload.get('mobile_number'),
            'firebase_uid': jwt_payload.get('firebase_uid')
        }

    # If JWT fails, try Firebase token
    if FIREBASE_AVAILABLE:
        firebase_result = verify_firebase_token(token)
        if firebase_result['success']:
            # Sync Firebase user to database (creates if doesn't exist)
            user = sync_firebase_user_to_database(firebase_result)
            
            if user:
                return {
                    'type': 'firebase',
                    'user_id': user['id'],
                    'mobile_number': user['mobile_number'],
                    'firebase_uid': user['firebase_uid'],
                    'firebase_token': token,  # Include original token for authenticated requests
                    'civic_id': user.get('civic_id')
                }
            else:
                print(f"Could not sync Firebase user to database")

    return None

def send_otp_sms(mobile_number, otp):
    """Send OTP via SMS (mock implementation - integrate with SMS service)"""
    print(f"📱 SMS OTP: {otp} sent to +91{mobile_number}")
    return True

# Authentication endpoints
@app.route('/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to mobile number"""
    log_api_access('/auth/send-otp', 'POST', request.remote_addr)
    
    try:
        data = request.get_json()
        mobile_number = data.get('mobile_number')
        auth_type = data.get('type')  # 'login' or 'register'
        user_data = data.get('user_data', {})
        
        if not mobile_number or len(mobile_number) != 10:
            return jsonify({'error': 'Valid 10-digit mobile number is required'}), 400
        
        if auth_type not in ['login', 'register']:
            return jsonify({'error': 'Invalid authentication type'}), 400
        
        # For login, check if user exists
        if auth_type == 'login':
            if supabase:
                result = supabase.table('users').select('*').eq('mobile_number', mobile_number).execute()
                if not result.data:
                    return jsonify({'error': 'Mobile number not registered. Please register first.'}), 404
        
        # For register, check if user already exists
        if auth_type == 'register':
            if supabase:
                result = supabase.table('users').select('*').eq('mobile_number', mobile_number).execute()
                if result.data:
                    return jsonify({'error': 'Mobile number already registered. Please login instead.'}), 400
        
        # Generate OTP
        otp = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_key = f"{mobile_number}_{auth_type}"
        otp_store[otp_key] = {
            'otp': otp,
            'expires_at': datetime.now() + timedelta(minutes=5),
            'mobile_number': mobile_number,
            'auth_type': auth_type,
            'user_data': user_data
        }
        
        # Send OTP (mock implementation)
        send_otp_sms(mobile_number, otp)
        
        return jsonify({
            'message': 'OTP sent successfully',
            'mobile_number': mobile_number
        })
    
    except Exception as e:
        print(f"Error sending OTP: {e}")
        return jsonify({'error': 'Failed to send OTP'}), 500

@app.route('/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and authenticate user"""
    log_api_access('/auth/verify-otp', 'POST', request.remote_addr)
    
    try:
        data = request.get_json()
        mobile_number = data.get('mobile_number')
        otp = data.get('otp')
        auth_type = data.get('type')
        user_data = data.get('user_data', {})
        
        if not all([mobile_number, otp, auth_type]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check OTP
        otp_key = f"{mobile_number}_{auth_type}"
        stored_otp = otp_store.get(otp_key)
        
        if not stored_otp:
            return jsonify({'error': 'OTP not found or expired'}), 400
        
        if stored_otp['expires_at'] < datetime.now():
            del otp_store[otp_key]
            return jsonify({'error': 'OTP expired'}), 400
        
        if stored_otp['otp'] != otp:
            return jsonify({'error': 'Invalid OTP'}), 400
        
        # OTP is valid, remove from store
        del otp_store[otp_key]
        
        if supabase:
            if auth_type == 'register':
                # Create new user with minimal data
                user_insert = {
                    'mobile_number': mobile_number,
                    'civic_id': generate_civic_id(),
                    'created_at': datetime.now().isoformat()
                }
                
                result = supabase.table('users').insert(user_insert).execute()
                user = result.data[0] if result.data else user_insert
                
            else:  # login
                # Get existing user
                result = supabase.table('users').select('*').eq('mobile_number', mobile_number).execute()
                user = result.data[0] if result.data else None
                
                if not user:
                    return jsonify({'error': 'User not found'}), 404
        else:
            # Fallback for development without Supabase
            user = {
                'id': 1,
                'mobile_number': mobile_number,
                'civic_id': generate_civic_id(),
                'full_name': None,
                'email': None,
                'address': None
            }
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        return jsonify({
            'message': 'Authentication successful',
            'user': {
                'id': user.get('id'),
                'mobile_number': user.get('mobile_number'),
                'civic_id': user.get('civic_id'),
                'full_name': user.get('full_name'),
                'email': user.get('email'),
                'address': user.get('address')
            },
            'token': token
        })
    
    except Exception as e:
        print(f"Error verifying OTP: {e}")
        return jsonify({'error': 'Authentication failed'}), 500

@app.route('/auth/firebase', methods=['POST'])
def firebase_auth():
    """Handle Firebase phone authentication"""
    log_api_access('/auth/firebase', 'POST', request.remote_addr)

    try:
        data = request.get_json()
        id_token = data.get('idToken')

        if not id_token:
            return jsonify({'success': False, 'message': 'ID token required'}), 400

        # Verify Firebase token
        result = verify_firebase_token(id_token)

        if not result['success']:
            return jsonify({'success': False, 'message': result['error']}), 401

        firebase_phone = result['phone_number']  # Full phone with country code
        firebase_uid = result['uid']
        
        # Normalize phone number to fit database format (10 digits)
        normalized_phone = normalize_phone_number(firebase_phone)
        
        print(f"Firebase phone: {firebase_phone}, Normalized: {normalized_phone}")

        # Check if user exists in Supabase (try normalized format first)
        user = None
        if supabase:
            try:
                response = supabase.table('users').select('*').eq('mobile_number', normalized_phone).execute()
                if response.data and len(response.data) > 0:
                    user = response.data[0]
                    print(f"Found existing user: {normalized_phone}")
            except Exception as e:
                print(f"Error checking user in Supabase: {e}")

        if not user:
            # Create new user in Supabase
            user_data = {
                'mobile_number': normalized_phone,  # Use normalized format (10 digits)
                'firebase_uid': firebase_uid,
                'civic_id': generate_civic_id(),  # Generate civic ID for new user
                'is_verified': True,
                'auth_provider': 'firebase'
                # Remove created_at - let database handle with DEFAULT NOW()
            }

            if supabase:
                try:
                    response = supabase.table('users').insert(user_data).execute()
                    if response.data and len(response.data) > 0:
                        user = response.data[0]
                    print(f"✓ Created new Firebase user: {normalized_phone}")
                except Exception as e:
                    print(f"Error creating user in Supabase: {e}")
                    return jsonify({'success': False, 'message': 'Failed to create user'}), 500
        else:
            # Update existing user with Firebase UID if not set
            if not user.get('firebase_uid'):
                if supabase:
                    try:
                        supabase.table('users').update({
                            'firebase_uid': firebase_uid,
                            'is_verified': True,
                            'auth_provider': 'firebase'
                        }).eq('id', user['id']).execute()
                        user['firebase_uid'] = firebase_uid
                        print(f"✓ Updated existing user with Firebase UID: {normalized_phone}")
                    except Exception as e:
                        print(f"Error updating user in Supabase: {e}")

        # Generate JWT token for your app
        token = generate_jwt_token({
            'id': user['id'],
            'mobile_number': user['mobile_number'],  # Use the mobile_number from user record
            'firebase_uid': firebase_uid
        })

        return jsonify({
            'success': True,
            'message': 'Firebase authentication successful',
            'token': token,
            'user': {
                'id': user['id'],
                'mobile_number': user['mobile_number'],
                'civic_id': user.get('civic_id'),
                'full_name': user.get('full_name'),
                'email': user.get('email'),
                'address': user.get('address'),
                'firebase_uid': user['firebase_uid'],
                'is_verified': user.get('is_verified', True),
                'auth_provider': user.get('auth_provider', 'firebase')
            }
        })

    except Exception as e:
        print(f"Firebase auth error: {e}")
        return jsonify({'success': False, 'message': 'Authentication failed'}), 500

@app.route('/auth/profile', methods=['GET'])
def get_profile():
    """Get user profile (requires authentication)"""
    log_api_access('/auth/profile', 'GET', request.remote_addr)
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization token required'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_auth_token(token)
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        if supabase:
            result = supabase.table('users').select('*').eq('id', payload['user_id']).execute()
            user = result.data[0] if result.data else None
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
        else:
            # Fallback for development
            user = {
                'id': payload['user_id'],
                'mobile_number': payload['mobile_number'],
                'full_name': 'Test User',
                'email': 'test@example.com',
                'address': 'Test Address'
            }
        
        return jsonify({
            'user': {
                'id': user.get('id'),
                'mobile_number': user.get('mobile_number'),
                'civic_id': user.get('civic_id'),
                'full_name': user.get('full_name'),
                'email': user.get('email'),
                'address': user.get('address')
            }
        })
    
    except Exception as e:
        print(f"Error getting profile: {e}")
        return jsonify({'error': 'Failed to get profile'}), 500

@app.route('/auth/update-profile', methods=['PUT'])
def update_profile():
    """Update user profile details"""
    log_api_access('/auth/update-profile', 'PUT', request.remote_addr)
    
    try:
        # Check authentication
        auth_header = request.headers.get('Authorization')
        user_id = None
        
        print(f"🔍 UPDATE PROFILE DEBUG: Auth header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            print(f"🔍 UPDATE PROFILE DEBUG: Token extracted (length: {len(token)})")
            
            auth_data = verify_auth_token(token)
            print(f"🔍 UPDATE PROFILE DEBUG: Auth verification result: {bool(auth_data)}")
            
            if auth_data:
                user_id = auth_data['user_id']
                print(f"✓ UPDATE PROFILE: Authenticated user ID: {user_id} (via {auth_data['type']})")
                print(f"✓ UPDATE PROFILE: User details - mobile: {auth_data.get('mobile_number', 'N/A')}")
            else:
                print("❌ UPDATE PROFILE: Invalid token provided")
                return jsonify({'error': 'Invalid or expired token'}), 401
        else:
            print("❌ UPDATE PROFILE: No authentication provided")
            return jsonify({'error': 'Authorization token required'}), 401
        
        print(f"🔍 UPDATE PROFILE DEBUG: Final user_id to be updated: {user_id} (type: {type(user_id)})")
        
        data = request.get_json()
        full_name = data.get('full_name')
        email = data.get('email')
        address = data.get('address')
        civic_id = data.get('civic_id')
        
        if not all([full_name, email, address]):
            return jsonify({'error': 'Full name, email, and address are required'}), 400
        
        # Validate email
        import re
        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        if supabase:
            # Check if civic_id already exists for another user
            if civic_id:
                existing = supabase.table('users').select('id').eq('civic_id', civic_id).neq('id', user_id).execute()
                if existing.data:
                    # Generate a new civic_id if conflict
                    civic_id = generate_civic_id()
            
            # Update user profile
            update_data = {
                'full_name': full_name,
                'email': email,
                'address': address,
                'civic_id': civic_id or generate_civic_id(),
                'updated_at': datetime.now().isoformat()
            }
            
            result = supabase.table('users').update(update_data).eq('id', user_id).execute()
            user = result.data[0] if result.data else None
            
            if not user:
                return jsonify({'error': 'Failed to update user'}), 500
        else:
            # Fallback for development
            user = {
                'id': user_id,
                'mobile_number': auth_data.get('mobile_number'),
                'civic_id': civic_id or generate_civic_id(),
                'full_name': full_name,
                'email': email,
                'address': address
            }
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': {
                'id': user.get('id'),
                'mobile_number': user.get('mobile_number'),
                'civic_id': user.get('civic_id'),
                'full_name': user.get('full_name'),
                'email': user.get('email'),
                'address': user.get('address')
            }
        })
    
    except Exception as e:
        print(f"❌ UPDATE PROFILE ERROR: {e}")
        return jsonify({'error': 'Failed to update profile'}), 500

if __name__ == '__main__':
    from datetime import datetime
    import socket
    
    # Print network info
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"=== FLASK SERVER STARTING ===")
    print(f"Hostname: {hostname}")
    print(f"Local IP: {local_ip}")
    print(f"Server will be accessible at:")
    print(f"  - http://127.0.0.1:5000 (localhost)")
    print(f"  - http://{local_ip}:5000 (network)")
    print(f"  - http://0.0.0.0:5000 (all interfaces)")
    print("===============================")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
