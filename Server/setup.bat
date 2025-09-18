@echo off
echo Installing Flask + Supabase Server Dependencies...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://python.org
    pause
    exit /b 1
)

REM Install dependencies
echo Installing Python packages...
pip install -r requirements.txt

if errorlevel 1 (
    echo Error: Failed to install packages
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit .env file and add your Supabase credentials!
    echo Open .env file and replace:
    echo   - your_supabase_url_here with your actual Supabase URL
    echo   - your_supabase_anon_key_here with your actual Supabase anon key
    echo.
)

REM Create uploads directory
if not exist uploads (
    mkdir uploads
    echo Created uploads directory
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your Supabase credentials
echo 2. Run the SQL commands from database_schema.sql in your Supabase dashboard
echo 3. Create 'Civic-Image-Bucket' and 'Civic-Audio-Bucket' storage buckets in Supabase dashboard
echo 4. Run: python flask_api_example.py
echo.
pause
