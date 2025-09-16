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
    
    tauri_build::build()
}
