use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointConfig {
    pub issues_api: String,
    pub auth_base: String,
    pub send_otp: String,
    pub verify_otp: String,
    pub firebase_auth: String,
    pub profile: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiConfig {
    pub production: EndpointConfig,
    pub development: EndpointConfig,
    pub local_network: EndpointConfig,
}

impl ApiConfig {
    /// Load configuration from embedded JSON file
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        let config_json = include_str!("../config/endpoints.json");
        let config: ApiConfig = serde_json::from_str(config_json)?;
        Ok(config)
    }

    /// Get the appropriate endpoint configuration based on build target and environment
    pub fn get_endpoints(&self) -> &EndpointConfig {
        // First check compile-time environment variable (for Android builds)
        match option_env!("CIVIC_API_ENV") {
            Some("production") => {
                println!("🌍 Using production endpoints (from build env)");
                &self.production
            },
            Some("local_network") => {
                println!("🏠 Using local network endpoints (from build env)");
                &self.local_network
            },
            Some("development") => {
                println!("🛠️ Using development endpoints (from build env)");
                &self.development
            },
            _ => {
                // Then check runtime environment variable
                match std::env::var("CIVIC_API_ENV").as_deref() {
                    Ok("production") => {
                        println!("🌍 Using production endpoints (from runtime env)");
                        &self.production
                    },
                    Ok("local_network") => {
                        println!("🏠 Using local network endpoints (from runtime env)");
                        &self.local_network
                    },
                    Ok("development") => {
                        println!("🛠️ Using development endpoints (from runtime env)");
                        &self.development
                    },
                    _ => {
                        // Default behavior: production for Android, development for desktop
                        #[cfg(target_os = "android")]
                        {
                            println!("📱 Android detected - defaulting to production endpoints (no CIVIC_API_ENV found)");
                            &self.production
                        }
                        
                        #[cfg(not(target_os = "android"))]
                        {
                            println!("🛠️ Desktop detected - defaulting to development endpoints");
                            &self.development
                        }
                    }
                }
            }
        }
    }

    /// Get a specific endpoint URL
    pub fn get_endpoint(&self, endpoint_type: &str) -> String {
        let endpoints = self.get_endpoints();
        match endpoint_type {
            "issues_api" => endpoints.issues_api.clone(),
            "send_otp" => endpoints.send_otp.clone(),
            "verify_otp" => endpoints.verify_otp.clone(),
            "firebase_auth" => endpoints.firebase_auth.clone(),
            "profile" => endpoints.profile.clone(),
            _ => {
                println!("⚠️ Unknown endpoint type: {}, falling back to auth_base", endpoint_type);
                endpoints.auth_base.clone()
            }
        }
    }
}

/// Global configuration instance
static API_CONFIG: OnceLock<ApiConfig> = OnceLock::new();

/// Initialize the API configuration (call once at startup)
pub fn init_config() -> Result<(), Box<dyn std::error::Error>> {
    let config = ApiConfig::load()?;
    API_CONFIG.set(config).map_err(|_| "Configuration already initialized")?;
    println!("✅ API configuration initialized");
    Ok(())
}

/// Get the current API configuration
pub fn get_config() -> Option<&'static ApiConfig> {
    API_CONFIG.get()
}

/// Helper function to get an endpoint URL
pub fn get_endpoint(endpoint_type: &str) -> String {
    match get_config() {
        Some(config) => config.get_endpoint(endpoint_type),
        None => {
            println!("❌ API configuration not initialized, using fallback");
            // Fallback URLs
            match endpoint_type {
                "issues_api" => "http://localhost:5000/api/issues".to_string(),
                "send_otp" => "http://localhost:5000/auth/send-otp".to_string(),
                "verify_otp" => "http://localhost:5000/auth/verify-otp".to_string(),
                "firebase_auth" => "http://localhost:5000/auth/firebase".to_string(),
                "profile" => "http://localhost:5000/auth/profile".to_string(),
                _ => "http://localhost:5000".to_string(),
            }
        }
    }
}