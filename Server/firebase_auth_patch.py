"""
Backend patch for Firebase authentication with flexible phone number handling
Add this function to main.py and update the firebase_auth endpoint
"""

def normalize_phone_number(phone_number):
    """
    Convert Firebase phone number format to match database format
    Firebase: "+919876543210" -> Database: "9876543210" (if using VARCHAR(10))
    """
    if not phone_number:
        return None
    
    # Remove country code if present and database expects 10 digits
    if phone_number.startswith('+91'):
        return phone_number[3:]  # Remove +91
    elif phone_number.startswith('+'):
        # For other country codes, you might want different logic
        return phone_number[1:]  # Remove just the +
    else:
        return phone_number

def firebase_auth_fixed():
    """Updated Firebase auth endpoint with better error handling"""
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

        firebase_phone = result['phone_number']  # This comes with country code
        firebase_uid = result['uid']
        
        # Normalize phone number for database lookup
        normalized_phone = normalize_phone_number(firebase_phone)
        
        print(f"Firebase phone: {firebase_phone}, Normalized: {normalized_phone}")

        # Check if user exists in Supabase (try both formats)
        user = None
        if supabase:
            try:
                # First try with normalized phone number
                response = supabase.table('users').select('*').eq('mobile_number', normalized_phone).execute()
                if response.data and len(response.data) > 0:
                    user = response.data[0]
                    print(f"Found user with normalized phone: {normalized_phone}")
                else:
                    # Try with full Firebase phone number
                    response = supabase.table('users').select('*').eq('mobile_number', firebase_phone).execute()
                    if response.data and len(response.data) > 0:
                        user = response.data[0]
                        print(f"Found user with Firebase phone: {firebase_phone}")
            except Exception as e:
                print(f"Error checking user in Supabase: {e}")

        if not user:
            # Create new user in Supabase
            user_data = {
                'mobile_number': normalized_phone,  # Use normalized format for consistency
                'firebase_uid': firebase_uid,
                'is_verified': True,
                'auth_provider': 'firebase'
                # Remove created_at - let database handle it with DEFAULT NOW()
            }

            # Only add these fields if they exist in the table
            try:
                # Test insert with minimal data first
                if supabase:
                    response = supabase.table('users').insert(user_data).execute()
                    if response.data and len(response.data) > 0:
                        user = response.data[0]
                        print(f"✓ Created new Firebase user: {normalized_phone}")
                    else:
                        raise Exception("Insert returned no data")
            except Exception as e:
                print(f"Error creating user in Supabase: {e}")
                
                # Try with minimal data if the full insert failed
                try:
                    minimal_data = {
                        'mobile_number': normalized_phone,
                        'firebase_uid': firebase_uid
                    }
                    response = supabase.table('users').insert(minimal_data).execute()
                    if response.data and len(response.data) > 0:
                        user = response.data[0]
                        print(f"✓ Created user with minimal data: {normalized_phone}")
                    else:
                        raise Exception("Minimal insert also failed")
                except Exception as e2:
                    print(f"Both insert attempts failed: {e2}")
                    return jsonify({'success': False, 'message': f'Failed to create user: {str(e2)}'}), 500
        else:
            # Update existing user with Firebase UID if not set
            if not user.get('firebase_uid'):
                if supabase:
                    try:
                        update_data = {'firebase_uid': firebase_uid}
                        # Only update fields that exist
                        if 'is_verified' in user:
                            update_data['is_verified'] = True
                        if 'auth_provider' in user:
                            update_data['auth_provider'] = 'firebase'
                            
                        supabase.table('users').update(update_data).eq('id', user['id']).execute()
                        user.update(update_data)
                        print(f"✓ Updated existing user with Firebase UID: {normalized_phone}")
                    except Exception as e:
                        print(f"Error updating user in Supabase: {e}")

        # Generate JWT token for your app
        token = generate_jwt_token({
            'id': user['id'],
            'mobile_number': user['mobile_number'],
            'firebase_uid': firebase_uid
        })

        return jsonify({
            'success': True,
            'message': 'Firebase authentication successful',
            'user': {
                'id': user['id'],
                'mobile_number': user['mobile_number'],
                'firebase_uid': firebase_uid,
                'is_verified': user.get('is_verified', True)
            },
            'token': token
        })

    except Exception as e:
        print(f"Firebase auth error: {e}")
        return jsonify({'success': False, 'message': f'Authentication failed: {str(e)}'}), 500