# Supabase Storage Integration Guide

## Overview
The CivicBridge application now uses Supabase Storage to store images and audio files instead of storing them as base64 data in the database. This provides better performance, reduces database size, and allows for more efficient file handling.

## Storage URL
**Supabase Storage Endpoint**: `https://hpltdxodlhwsikmcxuws.storage.supabase.co/storage/v1/s3`
**Storage Region**: `ap-south-1`

## Setup Instructions

### 1. Create Storage Buckets
In your Supabase Dashboard:
1. Go to **Storage** section
2. Create the following buckets:
   - `Civic-Image-Bucket` - For issue images
   - `Civic-Audio-Bucket` - For issue audio files
3. Set both buckets to **public** for direct access

### 2. Database Migration
Run the migration SQL file to update your database schema:
```sql
-- File: migration_storage.sql
-- Add URL columns to issues table
ALTER TABLE issues 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT;
```

### 3. Storage Policies (Optional but Recommended)
Set up Row Level Security (RLS) policies for better security:

```sql
-- Allow public uploads to images bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'Civic-Image-Bucket');

-- Allow public access to images
CREATE POLICY "Allow public access" ON storage.objects FOR SELECT 
USING (bucket_id = 'Civic-Image-Bucket');

-- Similar policies for audio bucket
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'Civic-Audio-Bucket');

CREATE POLICY "Allow public access" ON storage.objects FOR SELECT 
USING (bucket_id = 'Civic-Audio-Bucket');
```

## Changes Made

### Backend (main.py)
1. **Added Storage Upload Function**: `upload_to_supabase_storage()`
   - Handles file upload to Supabase Storage buckets
   - Returns public URLs for uploaded files
   - Includes error handling and fallback to local storage

2. **Modified Issue Creation**: 
   - Images/audio are uploaded to Supabase Storage first
   - Stores public URLs in database instead of base64 data
   - Maintains backward compatibility with local storage fallback

3. **Updated Database Fields**:
   - `image_url` - Supabase Storage URL for images
   - `audio_url` - Supabase Storage URL for audio files
   - Old fields (`image_filename`, `audio_filename`) retained for compatibility

### Frontend
The frontend automatically supports the new URL-based system:
- Images display using standard `<img src={image_url}>` tags
- Works with both base64 data URLs (legacy) and HTTP URLs (new)
- No changes required to React components

### Requirements
The following packages are required and will be automatically installed:
- `supabase==1.2.0` - Supabase Python client (includes storage3 dependency)
- Storage3 will be automatically installed as a dependency of Supabase

## Benefits

### Performance Improvements
- **Faster Database Queries**: No large base64 data to transfer
- **Reduced Database Size**: Files stored separately from metadata
- **Better Caching**: Images served directly from CDN
- **Mobile Optimization**: Progressive loading and better bandwidth usage

### Scalability
- **No Database Size Limits**: Files stored in dedicated storage service
- **CDN Distribution**: Global content delivery for better performance
- **File Management**: Direct access to files for admin operations

### Development
- **Easier Debugging**: Separate file URLs for testing
- **Better Analytics**: File access tracking through Supabase
- **Version Control**: Storage bucket versioning capabilities

## File Naming Convention
Files are stored with unique names to prevent conflicts:
- Images: `{uuid}_{title}_{timestamp}_issue_image.jpg`
- Audio: `{uuid}_{title}_{timestamp}_issue_audio.webm`

## URLs Generated
- **Image URL Format**: `https://hpltdxodlhwsikmcxuws.storage.supabase.co/storage/v1/object/public/Civic-Image-Bucket/{filename}`
- **Audio URL Format**: `https://hpltdxodlhwsikmcxuws.storage.supabase.co/storage/v1/object/public/Civic-Audio-Bucket/{filename}`

## Backward Compatibility
- Existing base64 data in database remains functional
- New uploads use Supabase Storage
- Frontend handles both URL types seamlessly
- Gradual migration possible

## Troubleshooting

### Common Issues
1. **Storage bucket doesn't exist**: Ensure buckets are created in Supabase dashboard
2. **Permission denied**: Check bucket policies and public access settings
3. **Upload fails**: Verify Supabase credentials and network connectivity
4. **Images don't load**: Check bucket public access and CORS settings

### Fallback Behavior
If Supabase Storage upload fails:
- Files are saved locally in `/uploads` folder
- System continues to function normally
- Check server logs for specific error messages

## Testing
Use the provided test HTML file to verify compression functionality:
```html
<!-- File: test-compression.html -->
<!-- Test image compression before upload -->
```

This ensures images are optimized before uploading to Supabase Storage.