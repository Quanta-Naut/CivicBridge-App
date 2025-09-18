# Firebase Backend Integration for Flask

# 1. Install Firebase Admin SDK
# pip install firebase-admin

# 2. Add this to your main.py imports
"""
import firebase_admin
from firebase_admin import auth, credentials
import json
"""

# 3. Initialize Firebase Admin (add after other imports)
"""
# Initialize Firebase Admin SDK
# Download service account key from Firebase Console > Project Settings > Service Accounts
try:
    # Option 1: Use service account key file
    # cred = credentials.Certificate("path/to/serviceAccountKey.json")
    
    # Option 2: Use environment variable with service account JSON
    firebase_cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
    if firebase_cred_json:
        cred_dict = json.loads(firebase_cred_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized successfully")
    else:
        print("⚠️  Firebase service account key not found in environment")
        
except Exception as e:
    print(f"❌ Failed to initialize Firebase Admin SDK: {e}")
"""

# 4. Add Firebase token verification function
"""
def verify_firebase_token(id_token):
    '''Verify Firebase ID token and return user info'''
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
"""

# 5. Add new Firebase authentication route
"""
@app.route('/api/auth/firebase', methods=['POST'])
def firebase_auth():
    '''Handle Firebase phone authentication'''
    try:
        data = request.get_json()
        id_token = data.get('idToken')
        
        if not id_token:
            return jsonify({'success': False, 'message': 'ID token required'}), 400
        
        # Verify Firebase token
        result = verify_firebase_token(id_token)
        
        if not result['success']:
            return jsonify({'success': False, 'message': result['error']}), 401
        
        phone_number = result['phone_number']
        firebase_uid = result['uid']
        
        # Check if user exists in database
        user = User.query.filter_by(phone_number=phone_number).first()
        
        if not user:
            # Create new user
            user = User(
                phone_number=phone_number,
                firebase_uid=firebase_uid,
                is_verified=True  # Firebase handles verification
            )
            db.session.add(user)
            db.session.commit()
        else:
            # Update existing user with Firebase UID
            user.firebase_uid = firebase_uid
            user.is_verified = True
            db.session.commit()
        
        # Generate JWT token for your app
        token = jwt.encode({
            'user_id': user.id,
            'phone_number': phone_number,
            'firebase_uid': firebase_uid,
            'exp': datetime.utcnow() + timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'success': True,
            'message': 'Authentication successful',
            'token': token,
            'user': {
                'id': user.id,
                'phone_number': user.phone_number,
                'firebase_uid': user.firebase_uid
            }
        })
        
    except Exception as e:
        print(f"Firebase auth error: {e}")
        return jsonify({'success': False, 'message': 'Authentication failed'}), 500
"""

# 6. Update token verification middleware
"""
def token_required(f):
    '''Updated token verification that supports both JWT and Firebase tokens'''
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            
            # Try to decode as JWT first
            try:
                data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                current_user = User.query.filter_by(id=data['user_id']).first()
                
                if not current_user:
                    return jsonify({'message': 'Invalid token!'}), 401
                    
            except jwt.InvalidTokenError:
                # If JWT fails, try Firebase token
                firebase_result = verify_firebase_token(token)
                
                if not firebase_result['success']:
                    return jsonify({'message': 'Invalid token!'}), 401
                
                current_user = User.query.filter_by(
                    firebase_uid=firebase_result['uid']
                ).first()
                
                if not current_user:
                    return jsonify({'message': 'User not found!'}), 401
            
            return f(current_user, *args, **kwargs)
            
        except Exception as e:
            print(f"Token verification error: {e}")
            return jsonify({'message': 'Token is invalid!'}), 401
    
    return decorated
"""

# 7. Add to .env file
"""
# Firebase Service Account Key (JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
"""