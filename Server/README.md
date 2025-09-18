# Flask + Supabase Server Setup Guide

This Flask server receives issue reports and stores them in Supabase database with file upload support.

## Prerequisites

- Python 3.7+
- Supabase account and project
- pip package manager

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Supabase Setup

1. **Create a Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be ready

2. **Get your credentials:**
   - Go to Settings > API in your Supabase dashboard
   - Copy your Project URL and anon public key

3. **Create the database table:**
   - Go to SQL Editor in your Supabase dashboard
   - Run the SQL commands from `database_schema.sql`

4. **Create storage buckets:**
   - Go to Storage in your Supabase dashboard
   - Create the following buckets:
     - 'Civic-Image-Bucket' for issue images
     - 'Civic-Audio-Bucket' for issue audio files
   - Set both buckets to public if you want direct file access
   - Configure upload policies as needed

### 3. Environment Configuration

1. **Create `.env` file:**
   ```bash
   copy .env.example .env
   ```

2. **Update `.env` with your Supabase credentials:**
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   FLASK_ENV=development
   FLASK_DEBUG=True
   MAX_FILE_SIZE=16777216
   ```

### 4. Run the Server

```bash
python flask_api_example.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST /api/issues
Creates a new issue with optional file uploads.

**Form Data:**
- `title` (required): Issue title
- `description` (required): Issue description
- `latitude` (optional): Location latitude
- `longitude` (optional): Location longitude
- `category` (optional): Issue category
- `priority` (optional): Issue priority
- `description_mode` (optional): How the description was created
- `image` (optional): Image file upload
- `audio` (optional): Audio file upload

**Response:**
```json
{
  "message": "Issue created successfully and saved to database",
  "issue": {
    "id": 1,
    "title": "Sample Issue",
    "description": "Issue description",
    "latitude": 0.0,
    "longitude": 0.0,
    "category": "infrastructure",
    "priority": "high",
    "image_url": "https://your-supabase-url/storage/v1/object/public/uploads/images/filename.jpg",
    "audio_url": "https://your-supabase-url/storage/v1/object/public/uploads/audio/filename.mp3",
    "status": "Open",
    "created_at": "2024-01-01T12:00:00+00:00"
  }
}
```

### GET /api/issues
Retrieves all issues from the database.

### GET /api/test
Simple test endpoint to verify server connectivity.

## Features

- ✅ Supabase database integration
- ✅ File upload to Supabase storage
- ✅ CORS enabled for cross-origin requests
- ✅ Error handling and fallback to local storage
- ✅ Automatic file naming with timestamps
- ✅ Environment variable configuration
- ✅ SQL schema with indexes and triggers

## File Structure

```
Server/
├── flask_api_example.py    # Main Flask application
├── requirements.txt        # Python dependencies
├── database_schema.sql     # Supabase database setup
├── .env.example           # Environment variables template
├── .env                   # Your actual environment variables (create this)
├── uploads/               # Local file storage (created automatically)
└── README.md             # This file
```

## Troubleshooting

1. **Supabase connection issues:**
   - Verify your SUPABASE_URL and SUPABASE_KEY in .env
   - Check if your Supabase project is active
   - Ensure the database table exists

2. **File upload issues:**
   - Verify the 'Civic-Image-Bucket' and 'Civic-Audio-Bucket' buckets exist in Supabase Storage
   - Check bucket policies and permissions
   - Ensure file size doesn't exceed limit (16MB default)

3. **CORS issues:**
   - The server has CORS enabled for all origins
   - If needed, modify CORS settings in the Flask app

## Production Considerations

- Use environment variables for all sensitive data
- Set up proper authentication and authorization
- Configure Supabase RLS (Row Level Security) policies
- Use a production WSGI server like Gunicorn
- Set up proper logging
- Configure backup strategies
- Monitor file storage usage
