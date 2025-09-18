import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

    print("=== RUNNING RLS POLICY FIX ===")

    # Read and execute the SQL file
    try:
        with open('fix_rls_policies.sql', 'r') as f:
            sql_content = f.read()

        print("SQL to execute:")
        print(sql_content)

        # Note: The Supabase Python client doesn't support raw SQL execution
        # This would need to be run in the Supabase dashboard
        print("\n❌ Cannot execute SQL via Python client")
        print("Please run the fix_rls_policies.sql file in your Supabase SQL editor")

    except Exception as e:
        print(f'Error reading SQL file: {e}')

    print("\n=== ALTERNATIVE: TRYING DIRECT USER CREATION ===")

    # Try creating user directly (this might work if policies allow it)
    user_data = {
        'mobile_number': '9538325964',
        'civic_id': 'CIV579899',
        'full_name': 'Tarun S A',
        'email': 'tarun.green42@gmail.com',
        'address': 'Bengaluru, Karnataka ',
    }

    try:
        result = supabase.table('users').insert(user_data).execute()
        print('User creation result:', result.data)

        if result.data:
            user_id = result.data[0]['id']
            print(f'✅ User created successfully with ID: {user_id}')

            # Now try to update the user to set the correct ID if needed
            if user_id != 4:
                print(f'⚠️  User created with ID {user_id}, but JWT expects ID 4')
                print('You may need to update your JWT token or re-login')

    except Exception as e:
        print(f'❌ Error creating user: {e}')
        print('This is likely due to RLS policies blocking the insert')

else:
    print('Supabase credentials not found')