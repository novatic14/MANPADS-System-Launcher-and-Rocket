use tauri::{AppHandle, Emitter};
use crate::lib::{AppError, ControlCommand};
use crate::backend::udp::socket;
use std::sync::atomic::{AtomicBool, Ordering};
use tracing::{info, error, debug};

static TELEMETRY_RUNNING: AtomicBool = AtomicBool::new(false);

const VALID_COMMANDS: &[&str] = &[
    "launch",
    "calibrate",
    "emergency_stop",
    "estop",
    "arm",
    "disarm",
    "update_pid",
];

#[tauri::command]
pub async fn connect(ip: String, port: u16) -> Result<(), AppError> {
    if ip.len() > 45 {
        return Err(AppError::ParseError("IP address too long".to_string()));
    }
    
    let ip_chars: Vec<char> = ip.chars().collect();
    let valid_chars = ip_chars.iter().all(|c| c.is_ascii_digit() || *c == '.' || *c == ':');
    if !valid_chars {
        return Err(AppError::ParseError("IP contains invalid characters".to_string()));
    }
    
    info!("Connecting to {}:{}", ip, port);
    
    socket::connect(&ip, port).await.map_err(|e| {
        error!("Connection failed: {}", e);
        AppError::ConnectionError(e)
    })?;
    
    Ok(())
}

#[tauri::command]
pub async fn disconnect() -> Result<(), AppError> {
    info!("Disconnecting...");
    
    socket::disconnect().await;
    TELEMETRY_RUNNING.store(false, Ordering::SeqCst);
    
    Ok(())
}

#[tauri::command]
pub async fn get_connection_status() -> Result<bool, AppError> {
    Ok(socket::is_connected().await)
}

#[tauri::command]
pub async fn send_command(cmd_type: String, params: Option<serde_json::Value>) -> Result<(), AppError> {
    if !VALID_COMMANDS.contains(&cmd_type.as_str()) {
        error!("Invalid command rejected: {}", cmd_type);
        return Err(AppError::ParseError(format!("Invalid command: {}", cmd_type)));
    }
    
    if cmd_type.len() > 32 {
        return Err(AppError::ParseError("Command name too long".to_string()));
    }
    
    info!("Sending command: {}", cmd_type);
    
    let command = match cmd_type.as_str() {
        "launch" => ControlCommand::Launch,
        "calibrate" => ControlCommand::Calibrate,
        "emergency_stop" | "estop" => ControlCommand::EmergencyStop,
        "arm" => ControlCommand::Arm,
        "disarm" => ControlCommand::Disarm,
        "update_pid" => {
            let kp = params.as_ref()
                .and_then(|p| p.get("kp"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0) as f32;
            let kd = params.as_ref()
                .and_then(|p| p.get("kd"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0) as f32;
            
            if kp < 0.0 || kp > 100.0 || kd < 0.0 || kd > 100.0 {
                return Err(AppError::ParseError("PID values out of range".to_string()));
            }
            
            if !kp.is_finite() || !kd.is_finite() {
                return Err(AppError::ParseError("Invalid PID values".to_string()));
            }
            
            ControlCommand::UpdatePid { kp, kd }
        }
        _ => return Err(AppError::ParseError(format!("Unknown command: {}", cmd_type))),
    };
    
    socket::send(&command).await.map_err(|e| {
        error!("Command send failed: {}", e);
        AppError::UdpError(e)
    })?;
    
    Ok(())
}

#[tauri::command]
pub async fn start_telemetry_stream(app_handle: AppHandle) -> Result<(), AppError> {
    info!("Starting telemetry stream");
    
    if TELEMETRY_RUNNING.load(Ordering::SeqCst) {
        return Ok(());
    }
    
    TELEMETRY_RUNNING.store(true, Ordering::SeqCst);
    
    let app = app_handle.clone();
    
    tokio::spawn(async move {
        let mut buffer = [0u8; 1024];
        
        loop {
            if !TELEMETRY_RUNNING.load(Ordering::SeqCst) {
                break;
            }
            
            if !socket::is_connected().await {
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
                continue;
            }
            
            match socket::receive(&mut buffer).await {
                Ok((len, _addr)) => {
                    if len > 8192 {
                        error!("Received packet too large: {} bytes", len);
                        continue;
                    }
                    
                    let data = &buffer[..len];
                    let messages = socket::parse_incoming_data(data);
                    
                    for msg in messages {
                        debug!("Emitting telemetry: {:?}", msg);
                        if let Err(e) = app.emit("telemetry:update", &msg) {
                            error!("Failed to emit: {}", e);
                        }
                    }
                }
                Err(e) => {
                    debug!("Receive error: {}", e);
                }
            }
            
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
        
        info!("Telemetry stream stopped");
    });
    
    Ok(())
}

#[tauri::command]
pub async fn stop_telemetry_stream() -> Result<(), AppError> {
    info!("Stopping telemetry stream");
    TELEMETRY_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}