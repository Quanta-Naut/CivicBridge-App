"""
Flask API server to receive issue reports and store them in Supabase
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
from datetime import datetime
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

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

def upload_file_to_supabase(file_path, storage_path):
    """Upload file to Supabase storage and return public URL"""
    try:
        if not supabase:
            return None
        
        with open(file_path, 'rb') as file:
            file_data = file.read()
        
        # Upload to Supabase storage bucket 'uploads'
        result = supabase.storage.from_('uploads').upload(storage_path, file_data)
        
        if result:
            # Get public URL
            public_url = supabase.storage.from_('uploads').get_public_url(storage_path)
            return public_url
        
    except Exception as e:
        print(f"Error uploading file to Supabase: {e}")
        return None

def save_issue_to_supabase(issue_data):
    """Save issue data to Supabase database"""
    try:
        if not supabase:
            print("Supabase client not available, storing in memory only")
            return None
        
        # Insert into 'issues' table
        result = supabase.table('issues').insert(issue_data).execute()
        
        if result.data:
            print(f"✓ Issue saved to Supabase with ID: {result.data[0].get('id')}")
            return result.data[0]
        else:
            print("✗ Failed to save issue to Supabase")
            return None
            
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        return None

@app.route('/api/issues', methods=['POST'])
def create_issue():
    print("=== FLASK: Received POST request to /api/issues ===")
    print(f"Content-Type: {request.content_type}")
    print(f"Form data keys: {list(request.form.keys())}")
    print(f"Files: {list(request.files.keys())}")
    
    try:
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
            return jsonify({'error': 'Title and description are required'}), 400
        
        # Handle image file if present
        image_url = None
        image_filename = None
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                image_filename = secure_filename(f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image_file.filename}")
                
                # Save locally first
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                image_file.save(image_path)
                
                # Upload to Supabase storage if available
                if supabase:
                    image_url = upload_file_to_supabase(image_path, f"images/{image_filename}")
        
        # Handle audio file if present
        audio_url = None
        audio_filename = None
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                audio_filename = secure_filename(f"{title}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{audio_file.filename}")
                
                # Save locally first
                audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
                audio_file.save(audio_path)
                
                # Upload to Supabase storage if available
                if supabase:
                    audio_url = upload_file_to_supabase(audio_path, f"audio/{audio_filename}")
        
        # Create issue data
        issue_data = {
            'title': title,
            'description': description,
            'latitude': latitude,
            'longitude': longitude,
            'category': category,
            'priority': priority,
            'description_mode': description_mode,
            'image_filename': image_filename,
            'audio_filename': audio_filename,
            'image_url': image_url,
            'audio_url': audio_url,
            'status': 'Open',
            'created_at': datetime.now().isoformat()
        }
        
        # Save to Supabase first, fallback to memory storage
        saved_issue = save_issue_to_supabase(issue_data)
        
        if saved_issue:
            # Successfully saved to Supabase
            return jsonify({
                'message': 'Issue created successfully and saved to database',
                'issue': saved_issue
            }), 201
        else:
            # Fallback to memory storage
            issue_data['id'] = len(issues) + 1
            issues.append(issue_data)
            return jsonify({
                'message': 'Issue created successfully (saved locally)',
                'issue': issue_data,
                'warning': 'Could not save to database'
            }), 201
        
    except Exception as e:
        print(f"=== FLASK ERROR: {str(e)} ===")
        return jsonify({'error': str(e)}), 500

@app.route('/api/test', methods=['GET'])
def test_connection():
    """Simple test endpoint to check connectivity"""
    print("=== FLASK: Test endpoint accessed ===")
    return jsonify({'message': 'Flask server is working!', 'status': 'ok'})

@app.route('/api/issues', methods=['GET'])
def get_issues():
    """Get all issues from Supabase or memory storage"""
    try:
        if supabase:
            # Fetch from Supabase
            result = supabase.table('issues').select('*').order('created_at', desc=True).execute()
            if result.data:
                return jsonify({'issues': result.data, 'source': 'database'})
        
        # Fallback to memory storage
        return jsonify({'issues': issues, 'source': 'memory'})
        
    except Exception as e:
        print(f"Error fetching issues: {e}")
        return jsonify({'issues': issues, 'source': 'memory', 'error': str(e)})

# In-memory storage (replace with database in production)
issues = []

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
