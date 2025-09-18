import os
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime

load_dotenv()
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

    print("=== CREATING MISSING USER ===")

    # Create user with ID 4 and mobile number from the logs
    user_data = {
        'id': 4,  # Force the ID to match the JWT token
        'mobile_number': '9538325964',
        'civic_id': 'CIV579899',  # From the update attempt
        'full_name': 'Tarun S A',  # From the update attempt
        'email': 'tarun.green42@gmail.com',  # From the update attempt
        'address': 'Bengaluru, Karnataka ',  # From the update attempt
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    try:
        # Insert the user
        result = supabase.table('users').insert(user_data).execute()
        print('User creation result:', result.data)

        # Verify the user was created
        verify_result = supabase.table('users').select('*').eq('id', 4).execute()
        print('Verification - User with ID 4:', verify_result.data)

    except Exception as e:
        print(f'Error creating user: {e}')

        # Try without forcing the ID (let Supabase auto-generate)
        print("Trying without forced ID...")
        user_data_no_id = user_data.copy()
        del user_data_no_id['id']

        try:
            result = supabase.table('users').insert(user_data_no_id).execute()
            print('User creation result (auto ID):', result.data)

            # Get the new user ID
            if result.data:
                new_user_id = result.data[0]['id']
                print(f'New user created with ID: {new_user_id}')
                print('You may need to update your JWT token or re-login to get the correct user_id')

        except Exception as e2:
            print(f'Error creating user (auto ID): {e2}')

else:
    print('Supabase credentials not found')