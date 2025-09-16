# API Configuration for Testing

## Environment Variables

You can set the API endpoint using environment variables:

### Windows (Command Prompt)
```cmd
set API_ENDPOINT=https://your-actual-api-endpoint.com/api/issues
```

### Windows (PowerShell)
```powershell
$env:API_ENDPOINT = "https://your-actual-api-endpoint.com/api/issues"
```

### Linux/Mac
```bash
export API_ENDPOINT=https://your-actual-api-endpoint.com/api/issues
```

## API Endpoint Format

Your API endpoint should accept a POST request with the following multipart form data:

### Form Fields:
- `title` (string): Issue title
- `description` (string): Issue description
- `latitude` (string): Latitude coordinate
- `longitude` (string): Longitude coordinate
- `category` (string): Issue category (infrastructure, garbage, water, etc.)
- `priority` (string): Issue priority (low, medium, high, urgent)
- `description_mode` (string): Either "text" or "audio"
- `image` (file, optional): Image file (JPEG format)
- `audio` (file, optional): Audio file (WebM format)

### Expected Response:
The API should return a success response (200-299 status code) with any JSON response body.

## Testing with a Mock Server

For testing purposes, you can use services like:
- JSONPlaceholder (https://jsonplaceholder.typicode.com/posts)
- Webhook.site (https://webhook.site/)
- PostBin (https://postb.in/)

Example with webhook.site:
1. Go to https://webhook.site/
2. Copy your unique URL
3. Update the API_ENDPOINT environment variable or modify the Rust code
4. Submit an issue to see the data being sent

## Local Development Server

You can also create a simple local server to test:

```javascript
// test-server.js
const express = require('express');
const multer = require('multer');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/issues', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  console.log('Form data:', req.body);
  console.log('Files:', req.files);
  res.json({ success: true, message: 'Issue received successfully' });
});

app.listen(3001, () => {
  console.log('Test server running on http://localhost:3001');
});
```

Then set API_ENDPOINT=http://localhost:3001/api/issues
