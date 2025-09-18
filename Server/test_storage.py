#!/usr/bin/env python3
"""
Test script to verify Supabase Storage integration
Run this to test if your storage setup is working correctly
"""

import os
import sys
from dotenv import load_dotenv
import requests
import json

# Load environment variables
load_dotenv()

def test_supabase_storage():
    """Test Supabase Storage connectivity and bucket access"""
    
    # Get environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL or SUPABASE_KEY not found in environment")
        print("   Please check your .env file")
        return False
    
    print("🔧 Testing Supabase Storage Integration...")
    print(f"📍 Supabase URL: {supabase_url}")
    
    # Test bucket access
    buckets = ['Civic-Image-Bucket', 'Civic-Audio-Bucket']
    
    for bucket in buckets:
        print(f"\n🪣 Testing bucket: {bucket}")
        
        # Test bucket existence by trying to list files
        try:
            from supabase import create_client, Client
            client = create_client(supabase_url, supabase_key)
            
            # Try to list files in bucket (this will fail if bucket doesn't exist)
            response = client.storage.from_(bucket).list()
            print(f"   ✅ Bucket '{bucket}' exists and is accessible")
            print(f"   📁 Files in bucket: {len(response) if response else 0}")
            
        except Exception as e:
            print(f"   ❌ Error accessing bucket '{bucket}': {e}")
            print(f"   💡 Make sure the bucket exists in your Supabase dashboard")
            return False
    
    print("\n🧪 Testing file upload...")
    
    # Create a test image file
    test_content = b"Test image content for Supabase Storage"
    test_filename = "images/test_upload.txt"  # Store in images folder
    
    try:
        # Upload test file
        upload_response = client.storage.from_('Civic-Image-Bucket').upload(
            path=test_filename,
            file=test_content,
            file_options={"cache-control": "3600", "upsert": "true"}
        )
        
        if upload_response:
            print("   ✅ Test file uploaded successfully to images/ folder")
            
            # Get public URL
            public_url = client.storage.from_('Civic-Image-Bucket').get_public_url(test_filename)
            print(f"   🔗 Public URL: {public_url}")
            
            # Test URL accessibility
            url_response = requests.get(public_url)
            if url_response.status_code == 200:
                print("   ✅ Public URL is accessible")
            else:
                print(f"   ⚠️  Public URL returned status: {url_response.status_code}")
            
            # Clean up test file
            try:
                client.storage.from_('Civic-Image-Bucket').remove([test_filename])
                print("   🧹 Test file cleaned up")
            except:
                print("   ⚠️  Could not clean up test file (this is okay)")
                
        else:
            print("   ❌ Test file upload failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Upload test failed: {e}")
        return False
    
    print("\n✅ All tests passed! Supabase Storage is ready.")
    return True

def test_api_endpoint():
    """Test if the Flask API is running and responding"""
    
    api_url = "http://civicbridge.duckdns.org/api/issues"
    
    print(f"\n🌐 Testing API endpoint: {api_url}")
    
    try:
        response = requests.get(api_url, timeout=10)
        if response.status_code == 200:
            print("   ✅ API endpoint is accessible")
            
            # Try to parse JSON response
            try:
                data = response.json()
                print(f"   📊 Returned {len(data.get('issues', []))} issues")
            except:
                print("   ⚠️  Response is not valid JSON")
                
        else:
            print(f"   ⚠️  API returned status: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("   ❌ API request timed out")
    except requests.exceptions.ConnectionError:
        print("   ❌ Could not connect to API")
    except Exception as e:
        print(f"   ❌ API test failed: {e}")

def main():
    """Run all tests"""
    
    print("🚀 CivicBridge Supabase Storage Test")
    print("="*50)
    
    # Test Supabase Storage
    storage_ok = test_supabase_storage()
    
    # Test API endpoint
    test_api_endpoint()
    
    print("\n" + "="*50)
    if storage_ok:
        print("🎉 Setup looks good! You can start using Supabase Storage.")
    else:
        print("🔧 Please fix the issues above before proceeding.")
    
    return storage_ok

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)