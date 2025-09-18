import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')

if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

    print("=== CHECKING USER WITH ID 4 ===")
    # Check if user with ID 4 exists
    result = supabase.table('users').select('*').eq('id', 4).execute()
    print('User with ID 4:', result.data)

    print("\n=== ALL USERS IN DATABASE ===")
    # Check all users
    all_users = supabase.table('users').select('*').execute()
    print('All users:', all_users.data)

    print("\n=== CHECKING USER BY MOBILE NUMBER ===")
    # Check user by mobile number from the logs
    mobile_result = supabase.table('users').select('*').eq('mobile_number', '9538325964').execute()
    print('User with mobile 9538325964:', mobile_result.data)
else:
    print('Supabase credentials not found')