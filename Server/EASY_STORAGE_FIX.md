# EASY FIX: Make Supabase Storage Buckets Public

## The Issue
Your Supabase Storage buckets have RLS (Row Level Security) enabled, but no policies allow public uploads.

## ✅ SIMPLEST SOLUTION (Recommended for Development)

### Step 1: Make Buckets Public
1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** → **Buckets**  
3. Find `Civic-Image-Bucket` and click the **Settings** icon (⚙️)
4. Toggle **"Public bucket"** to **ON**
5. Repeat for `Civic-Audio-Bucket`

### Step 2: Verify Bucket Settings
Both buckets should now show:
- ✅ Public bucket: **ON**
- ✅ File size limit: **50MB** (or your preferred limit)

## 🔧 Alternative Solutions

### Option A: Use Dashboard Policy Builder
1. Go to **Storage** → **Policies**
2. Click **"New Policy"**
3. Select your bucket (`Civic-Image-Bucket`)
4. Choose **"Allow public access"** template
5. Save the policy
6. Repeat for `Civic-Audio-Bucket`

### Option B: Use Service Role Key (Advanced)
In your `.env` file, you can use the `service_role` key instead of `anon` key:
```
# Replace this line:
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon key

# With this (get from Supabase Dashboard > Settings > API):
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role key
```
**Warning:** Service role key bypasses RLS. Only use for development!

## 🧪 Test the Fix
After applying the fix, try uploading an image again. You should see:
```
✓ Image uploaded to Supabase Storage: https://your-project.supabase.co/storage/v1/object/public/Civic-Image-Bucket/filename.jpg
```
Instead of the RLS policy error.