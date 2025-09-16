"""
Sample Flask API endpoint to receive issue reports from Tauri app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

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
        image_filename = None
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename != '':
                image_filename = secure_filename(f"{title}_{image_file.filename}")
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], image_filename)
                image_file.save(image_path)
        
        # Handle audio file if present
        audio_filename = None
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                audio_filename = secure_filename(f"{title}_{audio_file.filename}")
                audio_path = os.path.join(app.config['UPLOAD_FOLDER'], audio_filename)
                audio_file.save(audio_path)
        
        # Create issue data (you would typically save this to a database)
        issue_data = {
            'id': len(issues) + 1,  # Simple ID generation
            'title': title,
            'description': description,
            'latitude': latitude,
            'longitude': longitude,
            'category': category,
            'priority': priority,
            'description_mode': description_mode,
            'image_filename': image_filename,
            'audio_filename': audio_filename,
            'status': 'Open',
            'created_at': str(datetime.now())
        }
        
        # Store in memory (replace with database in production)
        issues.append(issue_data)
        
        return jsonify({
            'message': 'Issue created successfully',
            'issue': issue_data
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
    """Get all issues"""
    return jsonify({'issues': issues})

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
