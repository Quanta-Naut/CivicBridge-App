fn main() {
    // Load .env file at build time
    if let Err(_) = dotenvy::dotenv() {
        // Try loading from src-tauri directory specifically
        let _ = dotenvy::from_filename(".env");
    }
    
    // Pass environment variables to the build
    if let Ok(endpoint) = std::env::var("TAURI_API_ENDPOINT") {
        println!("cargo:rustc-env=TAURI_API_ENDPOINT={}", endpoint);
    }
    
    // Pass the new CIVIC_API_ENV variable to the build
    if let Ok(api_env) = std::env::var("CIVIC_API_ENV") {
        println!("cargo:rustc-env=CIVIC_API_ENV={}", api_env);
    }
    
    tauri_build::build()
}
