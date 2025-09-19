use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use std::sync::Mutex;
use chrono;

mod config;
use config::{init_config, get_endpoint};

#[cfg(feature = "api-client")]
use reqwest::multipart;
#[cfg(feature = "api-client")]
use base64::{Engine as _, engine::general_purpose};



#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Issue {
    id: u32,
    title: String,
    description: String,
    date: String,
    latitude: f64,
    longitude: f64,
    status: String,
    category: Option<String>,
    priority: Option<String>,
    created_at: Option<String>,
    image_filename: Option<String>,
    audio_filename: Option<String>,
    vouch_priority: Option<u32>,
    vouch_count: Option<u32>,
}

#[derive(Serialize, Deserialize)]
pub struct CreateIssueRequest {
    title: String,
    description: String,
    latitude: f64,
    longitude: f64,
    category: String,
    priority: String,
    image_data: Option<String>, // Base64 encoded image
    audio_data: Option<String>, // Base64 encoded audio
    description_mode: String, // "text" or "audio"
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FlaskIssuesResponse {
    issues: Vec<FlaskIssue>,
    source: String,
    count: u32,
    limit: Option<u32>,
    offset: Option<u32>,
    total: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FlaskIssue {
    id: u32,
    title: String,
    description: String,
    latitude: f64,
    longitude: f64,
    category: String,
    priority: String,
    status: String,
    created_at: String,
    image_filename: Option<String>,
    audio_filename: Option<String>,
    image_base64: Option<String>,
    audio_base64: Option<String>,
    image_url: Option<String>,
    audio_url: Option<String>,
    description_mode: Option<String>,
    vouch_priority: Option<u32>,
    vouch_count: Option<u32>,
}

type IssueStorage = Mutex<HashMap<u32, Issue>>;

// Helper function to convert FlaskIssue to Issue
impl From<FlaskIssue> for Issue {
    fn from(flask_issue: FlaskIssue) -> Self {
        // Convert created_at to a simpler date format
        let date = if let Ok(datetime) = chrono::DateTime::parse_from_rfc3339(&flask_issue.created_at) {
            datetime.format("%b %d").to_string()
        } else {
            chrono::Local::now().format("%b %d").to_string()
        };

        Issue {
            id: flask_issue.id,
            title: flask_issue.title,
            description: flask_issue.description,
            date,
            latitude: flask_issue.latitude,
            longitude: flask_issue.longitude,
            status: flask_issue.status,
            category: Some(flask_issue.category),
            priority: Some(flask_issue.priority),
            created_at: Some(flask_issue.created_at),
            image_filename: flask_issue.image_filename,
            audio_filename: flask_issue.audio_filename,
            vouch_priority: flask_issue.vouch_priority,
            vouch_count: flask_issue.vouch_count,
        }
    }
}

// Helper function to get API endpoint using configuration
fn get_api_endpoint() -> String {
    get_endpoint("issues_api")
}


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn test_form_data_reception(request: CreateIssueRequest) -> Result<String, String> {
    println!("=== TEST: Form data received in Rust ===");
    println!("Title: '{}'", request.title);
    println!("Description: '{}'", request.description);
    println!("Category: '{}'", request.category);
    println!("Priority: '{}'", request.priority);
    
    Ok(format!(
        "✅ Rust received: Title='{}', Category='{}', Priority='{}', HasImage={}, HasAudio={}",
        request.title,
        request.category, 
        request.priority,
        request.image_data.is_some(),
        request.audio_data.is_some()
    ))
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn test_simple_issue_submission() -> Result<String, String> {
    println!("=== RUST: Testing simple issue submission ===");
    
    let flask_url = get_api_endpoint();
    
    println!("Sending test issue to: {}", flask_url);
    println!("Loaded from .env: {}", flask_url);
    
    let client = reqwest::Client::new();
    
    // Create simple form without files
    let form = multipart::Form::new()
        .text("title", "Test Issue")
        .text("description", "This is a test issue")
        .text("latitude", "28.6139")
        .text("longitude", "77.2090")
        .text("category", "infrastructure")
        .text("priority", "medium")
        .text("description_mode", "text");
    
    match client.post(&flask_url).multipart(form).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Flask server responded with status: {}", status);
            
            if status.is_success() {
                match response.text().await {
                    Ok(body) => {
                        println!("Flask server response: {}", body);
                        Ok(format!("✅ Test issue submitted successfully! Response: {}", body))
                    },
                    Err(e) => Err(format!("Failed to read response: {}", e))
                }
            } else {
                Err(format!("Flask server returned error status: {}", status))
            }
        }
        Err(e) => {
            let error_msg = format!("❌ Cannot reach Flask server: {}", e);
            println!("Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn test_flask_connection() -> Result<String, String> {
    println!("=== RUST: Testing Flask server connection ===");
    
    let flask_url = get_api_endpoint().replace("/api/issues", "/api/test");
    
    println!("Testing connection to: {}", flask_url);
    println!("Base endpoint loaded from .env: {}", get_api_endpoint());
    
    let client = reqwest::Client::new();
    
    match client.get(&flask_url).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Flask server responded with status: {}", status);
            
            if status.is_success() {
                match response.text().await {
                    Ok(body) => {
                        println!("Flask server response: {}", body);
                        Ok(format!("✅ Flask server is reachable! Response: {}", body))
                    },
                    Err(e) => Err(format!("Failed to read response: {}", e))
                }
            } else {
                Err(format!("Flask server returned error status: {}", status))
            }
        }
        Err(e) => {
            let error_msg = format!("❌ Cannot reach Flask server: {}", e);
            println!("Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn test_flask_connection() -> Result<String, String> {
    Ok("HTTP client not available on mobile platform".to_string())
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn fetch_issues_from_flask() -> Result<Vec<Issue>, String> {
    println!("=== RUST: Fetching issues from Flask server ===");
    
    let flask_url = get_api_endpoint().replace("/api/issues", "/api/issues");
    
    println!("Fetching issues from: {}", flask_url);
    
    let client = reqwest::Client::new();
    
    match client.get(&flask_url).send().await {
        Ok(response) => {
            let status = response.status();
            println!("Flask server responded with status: {}", status);
            
            if status.is_success() {
                match response.text().await {
                    Ok(body) => {
                        println!("Flask server response body length: {}", body.len());
                        
                        // Parse the JSON response
                        match serde_json::from_str::<FlaskIssuesResponse>(&body) {
                            Ok(flask_response) => {
                                println!("Successfully parsed {} issues from Flask", flask_response.issues.len());
                                
                                // Convert FlaskIssue to Issue
                                let issues: Vec<Issue> = flask_response.issues
                                    .into_iter()
                                    .map(|flask_issue| flask_issue.into())
                                    .collect();
                                
                                Ok(issues)
                            }
                            Err(e) => {
                                println!("Failed to parse Flask response: {}", e);
                                println!("Response body: {}", body);
                                Err(format!("Failed to parse Flask response: {}", e))
                            }
                        }
                    }
                    Err(e) => {
                        let error_msg = format!("Failed to read Flask response: {}", e);
                        println!("Error: {}", error_msg);
                        Err(error_msg)
                    }
                }
            } else {
                let error_msg = format!("Flask server returned error status: {}", status);
                println!("Error: {}", error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to connect to Flask server: {}", e);
            println!("Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn fetch_issues_from_flask() -> Result<Vec<Issue>, String> {
    Err("HTTP client not available on mobile platform".to_string())
}

#[tauri::command]
fn get_issues(storage: State<IssueStorage>) -> Result<Vec<Issue>, String> {
    let issues = storage.lock().map_err(|_| "Failed to lock storage")?;
    Ok(issues.values().cloned().collect())
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn send_issue_to_flask_server(request: CreateIssueRequest, auth_token: Option<String>) -> Result<String, String> {
    println!("=== RUST: Received issue data from frontend ===");
    println!("Title: {}", request.title);
    println!("Description: {}", request.description);
    println!("Category: {}", request.category);
    println!("Priority: {}", request.priority);
    println!("Description Mode: {}", request.description_mode);
    println!("Latitude: {}", request.latitude);
    println!("Longitude: {}", request.longitude);
    println!("Has Image: {}", request.image_data.is_some());
    println!("Has Audio: {}", request.audio_data.is_some());
    println!("🔐 Auth token provided: {}", auth_token.is_some());
    if let Some(ref token) = auth_token {
        println!("🔐 Auth token length: {}", token.len());
    }
    
    // Validate required fields
    if request.title.trim().is_empty() {
        return Err("Title cannot be empty".to_string());
    }
    
    if request.description.trim().is_empty() {
        return Err("Description cannot be empty".to_string());
    }
    
    // Log data sizes for debugging
    if let Some(ref image_data) = request.image_data {
        println!("Image data size: {} characters", image_data.len());
    }
    if let Some(ref audio_data) = request.audio_data {
        println!("Audio data size: {} characters", audio_data.len());
    }
    
    // Get Flask server URL from .env file
    let flask_url = get_api_endpoint();
    
    println!("Sending to Flask server: {}", flask_url);
    println!("✅ Successfully loaded endpoint from .env file");
    
    let client = reqwest::Client::new();
    
    // Create multipart form
    let mut form = multipart::Form::new()
        .text("title", request.title.clone())
        .text("description", request.description.clone())
        .text("latitude", request.latitude.to_string())
        .text("longitude", request.longitude.to_string())
        .text("category", request.category.clone())
        .text("priority", request.priority.clone())
        .text("description_mode", request.description_mode.clone());
    
    // Add image if present
    if let Some(image_base64) = &request.image_data {
        println!("Decoding image base64 data...");
        match general_purpose::STANDARD.decode(image_base64) {
            Ok(image_bytes) => {
                println!("Image decoded successfully, size: {} bytes", image_bytes.len());
                let image_part = multipart::Part::bytes(image_bytes)
                    .file_name("issue_image.jpg")
                    .mime_str("image/jpeg")
                    .map_err(|e| format!("Failed to create image part: {}", e))?;
                form = form.part("image", image_part);
                println!("Image part added to form");
            }
            Err(e) => {
                let error_msg = format!("Failed to decode image base64: {}", e);
                println!("Error: {}", error_msg);
                return Err(error_msg);
            }
        }
    }
    
    // Add audio if present
    if let Some(audio_base64) = &request.audio_data {
        match general_purpose::STANDARD.decode(audio_base64) {
            Ok(audio_bytes) => {
                let audio_part = multipart::Part::bytes(audio_bytes)
                    .file_name("issue_audio.webm")
                    .mime_str("audio/webm")
                    .map_err(|e| format!("Failed to create audio part: {}", e))?;
                form = form.part("audio", audio_part);
            }
            Err(e) => return Err(format!("Failed to decode audio: {}", e)),
        }
    }
    
    // Send the request to Flask server
    println!("Sending multipart form to Flask...");
    println!("Request URL: {}", flask_url);
    
    let mut request_builder = client.post(&flask_url).multipart(form);
    
    // Add authorization header if auth token is provided
    if let Some(token) = &auth_token {
        println!("🔐 Adding Authorization header with token (length: {})", token.len());
        request_builder = request_builder.header("Authorization", format!("Bearer {}", token));
    } else {
        println!("⚠️ No auth token provided - creating issue anonymously");
    }
    
    match request_builder.send().await {
        Ok(response) => {
            let status = response.status();
            println!("Flask server responded with status: {}", status);
            
            if status.is_success() {
                match response.text().await {
                    Ok(body) => {
                        println!("Flask server response: {}", body);
                        Ok(format!("Successfully sent to Flask server. Response: {}", body))
                    },
                    Err(e) => {
                        let error_msg = format!("Failed to read Flask response: {}", e);
                        println!("Error: {}", error_msg);
                        Err(error_msg)
                    }
                }
            } else {
                let error_msg = format!("Flask server returned error status: {}", status);
                println!("Error: {}", error_msg);
                Err(error_msg)
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to connect to Flask server: {}", e);
            println!("Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

// Mobile version - API client not available on mobile targets
#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn send_issue_to_flask_server(request: CreateIssueRequest) -> Result<String, String> {
    println!("=== MOBILE: HTTP client not available on mobile platform ===");
    println!("Issue data received: Title='{}', Category='{}'", request.title, request.category);
    
    // On mobile, you could:
    // 1. Save to local storage and sync later
    // 2. Use platform-specific HTTP APIs
    // 3. Use a different networking approach
    
    Err("HTTP client not available on mobile platform. Data received but not sent to server.".to_string())
}

#[tauri::command]
fn create_issue(
    request: CreateIssueRequest,
    storage: State<IssueStorage>,
) -> Result<Issue, String> {
    let mut issues = storage.lock().map_err(|_| "Failed to lock storage")?;
    
    let id = (issues.len() as u32) + 1;
    let current_date = chrono::Local::now().format("%b %d").to_string();
    
    let issue = Issue {
        id,
        title: request.title,
        description: request.description,
        date: current_date,
        latitude: request.latitude,
        longitude: request.longitude,
        status: "Open".to_string(),
        category: Some(request.category),
        priority: Some(request.priority),
        created_at: Some(chrono::Local::now().to_rfc3339()),
        image_filename: None,
        audio_filename: None,
        vouch_priority: Some(0),
        vouch_count: Some(0),
    };
    
    issues.insert(id, issue.clone());
    Ok(issue)
}

#[tauri::command]
fn update_issue_status(
    issue_id: u32,
    new_status: String,
    storage: State<IssueStorage>,
) -> Result<Issue, String> {
    let mut issues = storage.lock().map_err(|_| "Failed to lock storage")?;
    
    if let Some(issue) = issues.get_mut(&issue_id) {
        issue.status = new_status;
        Ok(issue.clone())
    } else {
        Err("Issue not found".to_string())
    }
}

#[tauri::command]
fn delete_issue(
    issue_id: u32,
    storage: State<IssueStorage>,
) -> Result<bool, String> {
    let mut issues = storage.lock().map_err(|_| "Failed to lock storage")?;
    
    if issues.remove(&issue_id).is_some() {
        Ok(true)
    } else {
        Err("Issue not found".to_string())
    }
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn vouch_for_issue(issue_id: String, auth_token: String) -> Result<String, String> {
    let api_base_url = get_api_endpoint();
    // Remove the /api/issues suffix if present and add the vouch endpoint
    let base_url = api_base_url.replace("/api/issues", "");
    
    let client = reqwest::Client::new();
    let url = format!("{}/api/issues/{}/vouch", base_url, issue_id);
    
    println!("🗳️ Sending vouch request to: {}", url);
    
    match client
        .post(&url)
        .header("Authorization", format!("Bearer {}", auth_token))
        .header("Content-Type", "application/json")
        .send()
        .await {
        Ok(response) => {
            let status = response.status();
            println!("📊 Vouch response status: {}", status);
            
            match response.text().await {
                Ok(body) => {
                    println!("📋 Vouch response body: {}", body);
                    
                    if status.is_success() {
                        // Try to parse the JSON response to get more details
                        match serde_json::from_str::<serde_json::Value>(&body) {
                            Ok(json) => {
                                let message = json.get("message").and_then(|m| m.as_str()).unwrap_or("Success");
                                let vouch_count = json.get("vouch_count").and_then(|c| c.as_u64()).unwrap_or(0);
                                let user_vouched = json.get("user_vouched").and_then(|v| v.as_bool()).unwrap_or(true);
                                
                                println!("✅ Vouch successful: {} (Count: {}, User vouched: {})", message, vouch_count, user_vouched);
                                Ok(format!("{} - Total vouches: {}", message, vouch_count))
                            }
                            Err(_) => {
                                println!("✅ Vouch successful: {}", body);
                                Ok(body)
                            }
                        }
                    } else {
                        // Handle error response
                        match serde_json::from_str::<serde_json::Value>(&body) {
                            Ok(json) => {
                                let error_msg = json.get("error").and_then(|e| e.as_str()).unwrap_or("Unknown error");
                                let full_error = format!("HTTP {} - {}", status.as_u16(), error_msg);
                                println!("❌ {}", full_error);
                                Err(full_error)
                            }
                            Err(_) => {
                                let error_msg = format!("HTTP {} - {}", status.as_u16(), body);
                                println!("❌ {}", error_msg);
                                Err(error_msg)
                            }
                        }
                    }
                }
                Err(e) => {
                    let error_msg = format!("Failed to read vouch response: {}", e);
                    println!("❌ {}", error_msg);
                    Err(error_msg)
                }
            }
        }
        Err(e) => {
            let error_msg = format!("Failed to send vouch request: {}", e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn vouch_for_issue(issue_id: String, auth_token: String) -> Result<String, String> {
    println!("⚠️ API client feature not enabled, simulating vouch for issue {} with token {}", issue_id, &auth_token[..10]);
    Ok(format!("Simulated vouch for issue {} (API client not enabled)", issue_id))
}


// OTP Authentication Commands
#[derive(Serialize, Deserialize)]
pub struct SendOtpRequest {
    mobile_number: String,
    #[serde(rename = "type")]
    otp_type: String,
    user_data: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize)]
pub struct VerifyOtpRequest {
    mobile_number: String,
    otp: String,
    #[serde(rename = "type")]
    otp_type: String,
    user_data: Option<serde_json::Value>,
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn send_otp_rust(mobile_number: String, otp_type: String, user_data: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    println!("🔐 Sending OTP to mobile number: {}", mobile_number);
    
    let client = reqwest::Client::new();
    let api_url = get_endpoint("send_otp");
    
    let request_body = SendOtpRequest {
        mobile_number: mobile_number.clone(),
        otp_type,
        user_data,
    };
    
    match client
        .post(api_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            println!("📡 OTP request status: {}", status);
            
            match response.json::<serde_json::Value>().await {
                Ok(json_response) => {
                    println!("✅ OTP sent successfully for: {}", mobile_number);
                    Ok(json_response)
                },
                Err(e) => {
                    let error_msg = format!("Failed to parse OTP response: {}", e);
                    println!("❌ {}", error_msg);
                    Err(error_msg)
                }
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to send OTP request: {}", e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(feature = "api-client")]
#[tauri::command]
async fn verify_otp_rust(mobile_number: String, otp: String, otp_type: String, user_data: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    println!("🔐 Verifying OTP for mobile number: {}", mobile_number);
    
    let client = reqwest::Client::new();
    let api_url = get_endpoint("verify_otp");
    
    let request_body = VerifyOtpRequest {
        mobile_number: mobile_number.clone(),
        otp,
        otp_type,
        user_data,
    };
    
    match client
        .post(api_url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            println!("📡 OTP verification status: {}", status);
            
            match response.json::<serde_json::Value>().await {
                Ok(json_response) => {
                    println!("✅ OTP verified successfully for: {}", mobile_number);
                    Ok(json_response)
                },
                Err(e) => {
                    let error_msg = format!("Failed to parse OTP verification response: {}", e);
                    println!("❌ {}", error_msg);
                    Err(error_msg)
                }
            }
        },
        Err(e) => {
            let error_msg = format!("Failed to send OTP verification request: {}", e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn send_otp_rust(mobile_number: String, otp_type: String, user_data: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    println!("⚠️ API client feature not enabled, simulating OTP send for {}", mobile_number);
    let response = serde_json::json!({
        "success": true,
        "message": "OTP sent successfully (simulated)",
        "mobile_number": mobile_number
    });
    Ok(response)
}

#[cfg(not(feature = "api-client"))]
#[tauri::command]
async fn verify_otp_rust(mobile_number: String, otp: String, otp_type: String, user_data: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    println!("⚠️ API client feature not enabled, simulating OTP verification for {}", mobile_number);
    let response = serde_json::json!({
        "success": true,
        "message": "OTP verified successfully (simulated)",
        "token": "fake_jwt_token_for_testing",
        "user": {
            "mobile_number": mobile_number,
            "civic_id": "CIV123456789"
        }
    });
    Ok(response)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize configuration first
    println!("🚀 Starting Tauri application...");
    println!("📁 Current working directory: {:?}", std::env::current_dir().unwrap_or_default());
    
    // Initialize API configuration
    if let Err(e) = init_config() {
        println!("❌ Failed to initialize API configuration: {}", e);
        println!("⚠️ Using fallback endpoints");
    }
    
    // Test endpoint loading during startup
    let startup_endpoint = get_api_endpoint();
    println!("🌐 Configured API endpoint: {}", startup_endpoint);
    
    // List all environment variables that start with TAURI_
    println!("🔍 Environment variables starting with TAURI_:");
    for (key, value) in std::env::vars() {
        if key.starts_with("TAURI_") {
            println!("  {} = {}", key, value);
        }
    }
    
    // Initialize storage with some sample data
    let mut initial_issues = HashMap::new();
    
    initial_issues.insert(1, Issue {
        id: 1,
        title: "Garbage".to_string(),
        description: "Garbage pile needs to be cleared".to_string(),
        date: "Jul 14".to_string(),
        latitude: 28.6139,
        longitude: 77.2090,
        status: "Open".to_string(),
        category: Some("infrastructure".to_string()),
        priority: Some("medium".to_string()),
        created_at: Some("2025-07-14T10:00:00Z".to_string()),
        image_filename: None,
        audio_filename: None,
        vouch_priority: Some(1),
        vouch_count: Some(1),
    });
    
    initial_issues.insert(2, Issue {
        id: 2,
        title: "Street Light".to_string(),
        description: "Street light is not working".to_string(),
        date: "Jul 12".to_string(),
        latitude: 28.6150,
        longitude: 77.2100,
        status: "Open".to_string(),
        category: Some("electricity".to_string()),
        priority: Some("high".to_string()),
        created_at: Some("2025-07-12T08:30:00Z".to_string()),
        image_filename: None,
        audio_filename: None,
        vouch_priority: Some(1),
        vouch_count: Some(1),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_geolocation::init())
        .manage(IssueStorage::new(initial_issues))
        .invoke_handler(tauri::generate_handler![
            greet,
            test_form_data_reception,
            test_flask_connection,
            test_simple_issue_submission,
            get_issues,
            fetch_issues_from_flask,
            create_issue,
            send_issue_to_flask_server,
            update_issue_status,
            delete_issue,
            vouch_for_issue,
            send_otp_rust,
            verify_otp_rust
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
