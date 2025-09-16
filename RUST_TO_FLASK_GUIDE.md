# Frontend to Rust to Flask Data Flow

## Overview
The form data flows from React frontend → Rust backend → Flask Python server.

## Rust Function: `send_issue_to_flask_server`

### Purpose
This function receives form data from the frontend and forwards it to your Flask server.

### What it does:
1. **Receives** all form data from React frontend
2. **Validates** required fields (title, description)
3. **Logs** received data for debugging
4. **Converts** base64 image/audio to binary files
5. **Creates** multipart form data
6. **Sends POST request** to Flask server
7. **Returns** response or error message

### Input Data Structure (CreateIssueRequest):
```rust
pub struct CreateIssueRequest {
    title: String,                    // Issue title
    description: String,              // Issue description
    latitude: f64,                    // GPS latitude
    longitude: f64,                   // GPS longitude
    category: String,                 // Issue category (infrastructure, etc.)
    priority: String,                 // Priority level (low, medium, high, urgent)
    image_data: Option<String>,       // Base64 encoded image (optional)
    audio_data: Option<String>,       // Base64 encoded audio (optional)
    description_mode: String,         // "text" or "audio"
}
```

### Output to Flask Server:
**HTTP POST** to your Flask endpoint with **multipart/form-data** containing:

**Text Fields:**
- `title` - Issue title
- `description` - Issue description  
- `latitude` - GPS coordinates
- `longitude` - GPS coordinates
- `category` - Issue category
- `priority` - Priority level
- `description_mode` - "text" or "audio"

**File Fields (if present):**
- `image` - Image file (JPEG format)
- `audio` - Audio file (WebM format)

## Frontend Usage

```javascript
// In your React component (IssueForm.jsx)
const apiResponse = await invoke("send_issue_to_flask_server", {
  request: {
    title: "Street light not working",
    description: "The street light has been broken for 3 days",
    latitude: 28.6139,
    longitude: 77.2090,
    category: "infrastructure",
    priority: "medium",
    description_mode: "text",
    image_data: "base64encodedimagedata...", // optional
    audio_data: "base64encodedaudiodata...", // optional
  }
});
```

## Flask Server Requirements

Your Flask server should have an endpoint like:

```python
@app.route('/api/issues', methods=['POST'])
def create_issue():
    # Get text fields
    title = request.form.get('title')
    description = request.form.get('description')
    latitude = float(request.form.get('latitude'))
    longitude = float(request.form.get('longitude'))
    category = request.form.get('category')
    priority = request.form.get('priority')
    description_mode = request.form.get('description_mode')
    
    # Get files (if present)
    image_file = request.files.get('image')
    audio_file = request.files.get('audio')
    
    # Process the data...
    return jsonify({'message': 'Issue created successfully'})
```

## Configuration

Set your Flask server URL in `.env`:
```
TAURI_API_ENDPOINT=http://localhost:5000/api/issues
```

## Testing

1. **Test data reception in Rust:**
   ```javascript
   const result = await invoke("test_form_data_reception", { request: formData });
   console.log(result); // Should show all received data
   ```

2. **Check Rust logs:**
   - Run app in dev mode: `pnpm run tauri dev`
   - Check console for Rust println! messages
   - Verify all form fields are received correctly

3. **Test Flask integration:**
   - Start your Flask server
   - Submit a form in the app
   - Check Flask server receives the POST request

## Debugging

- **Frontend**: Check browser console for errors
- **Rust**: Check terminal output for println! messages  
- **Flask**: Check Flask server logs for incoming requests
- **Network**: Use browser dev tools to see if requests are sent

## Error Handling

The Rust function handles:
- Empty title/description validation
- Base64 decoding errors
- Network connection failures
- HTTP error responses
- File processing errors

All errors are returned as Result<String, String> to the frontend.
