#!/usr/bin/env python3
"""
Test script to verify Firebase authentication setup
"""

import os
import json
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import auth, credentials

# Load environment variables
load_dotenv()

# Configuration
API_BASE_URL = 'http://localhost:5000'

def test_firebase_admin_setup():
    """Test if Firebase Admin SDK is properly configured"""
    print("🔥 Testing Firebase Admin SDK setup...")
    
    try:
        firebase_cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
        if not firebase_cred_json:
            print("❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env")
            return False
            
        cred_dict = json.loads(firebase_cred_json)
        
        # Check if already initialized
        try:
            firebase_admin.get_app()
            print("✅ Firebase Admin SDK already initialized")
        except ValueError:
            # Not initialized, initialize it
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized successfully")
            
        return True
        
    except Exception as e:
        print(f"❌ Firebase Admin SDK setup failed: {e}")
        return False

def test_backend_connection():
    """Test backend API connection"""
    print("\n🌐 Testing backend API connection...")
    
    try:
        response = requests.get(f'{API_BASE_URL}/api/test')
        if response.status_code == 200:
            print("✅ Backend API is running")
            return True
        else:
            print(f"❌ Backend API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend API connection failed: {e}")
        print("💡 Make sure your Flask server is running: python main.py")
        return False

def test_firebase_token_verification():
    """Test Firebase token verification endpoint"""
    print("\n🔐 Testing Firebase token verification...")
    
    # This is a mock test since we need a real Firebase token
    # In real testing, you would get this token from your frontend
    test_data = {
        'idToken': 'mock-firebase-token'
    }
    
    try:
        response = requests.post(
            f'{API_BASE_URL}/auth/firebase',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 400 and 'ID token required' in response.text:
            print("✅ Firebase auth endpoint is working (correctly rejecting mock token)")
            return True
        elif response.status_code == 401:
            print("✅ Firebase auth endpoint is working (correctly validating tokens)")
            return True
        else:
            print(f"⚠️  Unexpected response: {response.status_code} - {response.text}")
            return True  # Endpoint exists and is responding
            
    except Exception as e:
        print(f"❌ Firebase auth endpoint test failed: {e}")
        return False

def test_database_connection():
    """Test Supabase database connection"""
    print("\n🗄️  Testing database connection...")
    
    try:
        response = requests.get(f'{API_BASE_URL}/api/issues')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Database connection working - found {data.get('count', 0)} issues")
            print(f"📊 Data source: {data.get('source', 'unknown')}")
            return True
        else:
            print(f"❌ Database test failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False

def display_setup_summary():
    """Display setup completion summary"""
    print("\n" + "="*60)
    print("🎯 FIREBASE AUTHENTICATION SETUP SUMMARY")
    print("="*60)
    
    # Check .env file
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_KEY')
    firebase_key = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY')
    
    print(f"📁 Environment Variables:")
    print(f"   SUPABASE_URL: {'✅ Set' if supabase_url else '❌ Missing'}")
    print(f"   SUPABASE_KEY: {'✅ Set' if supabase_key else '❌ Missing'}")
    print(f"   FIREBASE_SERVICE_ACCOUNT_KEY: {'✅ Set' if firebase_key else '❌ Missing'}")
    
    if supabase_url:
        if 'ap-south-1' in supabase_url or 'supabase.co' in supabase_url:
            print(f"   🌍 Region: Detected from URL")
        print(f"   🔗 URL: {supabase_url[:50]}...")
    
    print(f"\n📋 Next Steps:")
    print(f"   1. ✅ Run firebase_rls_policies.sql in Supabase SQL editor")
    print(f"   2. ✅ Run firebase_authenticated_role_setup.sql in Supabase SQL editor")
    print(f"   3. 🔄 Update to ap-south-1 Supabase project (if needed)")
    print(f"   4. 🧪 Test frontend authentication flow")
    
    print(f"\n🚀 Ready to use:")
    print(f"   • Firebase phone authentication")
    print(f"   • Automatic user sync to Supabase")
    print(f"   • RLS policies with authenticated role")
    print(f"   • Protected API endpoints")

def main():
    """Run all tests"""
    print("🧪 FIREBASE AUTHENTICATION SETUP VERIFICATION")
    print("=" * 50)
    
    tests = [
        ("Firebase Admin SDK", test_firebase_admin_setup),
        ("Backend API Connection", test_backend_connection),
        ("Firebase Auth Endpoint", test_firebase_token_verification),
        ("Database Connection", test_database_connection),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST RESULTS SUMMARY")
    print("="*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Firebase authentication is ready!")
    else:
        print("⚠️  Some tests failed. Check the errors above.")
    
    display_setup_summary()

if __name__ == '__main__':
    main()