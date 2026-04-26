use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::UdpSocket;
use tracing::{debug, info, warn};
use crate::lib::{TelemetryMessage, ControlCommand};

lazy_static::lazy_static! {
    static ref SOCKET: tokio::sync::RwLock<Option<Arc<UdpSocket>>> = tokio::sync::RwLock::new(None);
    static ref TARGET: tokio::sync::RwLock<Option<SocketAddr>> = tokio::sync::RwLock::new(None);
}

const MAX_LINE_LENGTH: usize = 512;
const MAX_PARTS: usize = 20;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(3);

pub async fn send_heartbeat() -> Result<(), String> {
    send(&ControlCommand::Heartbeat).await
}

pub async fn connect(ip: &str, port: u16) -> Result<(), String> {
    if ip.is_empty() {
        return Err("IP address cannot be empty".to_string());
    }
    
    let parts: Vec<&str> = ip.split('.').collect();
    if parts.len() != 4 {
        return Err("Invalid IP address format".to_string());
    }
    
    for part in &parts {
        match part.parse::<u8>() {
            Ok(_) => {}
            Err(_) => return Err("Invalid IP address: octet out of range".to_string()),
        }
    }
    
    if port < 1024 {
        return Err("Port must be between 1024 and 65535".to_string());
    }
    
    let local_addr = format!("0.0.0.0:{}", port + 1);
    
    let socket = Arc::new(
        UdpSocket::bind(&local_addr)
            .await
            .map_err(|e| format!("Failed to bind socket: {}", e))?
    );

    let target_addr: SocketAddr = format!("{}:{}", ip, port)
        .parse()
        .map_err(|e| format!("Invalid address: {}", e))?;

    info!("Connected to {}:{}", ip, port);
    
    *SOCKET.write().await = Some(socket);
    *TARGET.write().await = Some(target_addr);
    
    Ok(())
}

pub async fn disconnect() {
    info!("Disconnected from UDP");
    *SOCKET.write().await = None;
    *TARGET.write().await = None;
}

pub async fn send(cmd: &ControlCommand) -> Result<(), String> {
    let socket = SOCKET.read().await;
    let socket = socket.as_ref().ok_or("Not connected")?;
    
    let target = TARGET.read().await;
    let target = target.ok_or("No target address")?;

    let data = serialize_command(cmd);
    
    if data.len() > MAX_LINE_LENGTH {
        return Err("Command too long".to_string());
    }
    
    socket
        .send_to(data.as_bytes(), target)
        .await
        .map_err(|e| format!("Send failed: {}", e))?;

    debug!("Sent: {:?}", cmd);
    Ok(())
}

pub async fn receive(buffer: &mut [u8]) -> Result<(usize, SocketAddr), String> {
    let socket = SOCKET.read().await;
    let socket = socket.as_ref().ok_or("Not connected")?;
    
    socket
        .recv_from(buffer)
        .await
        .map_err(|e| format!("Receive failed: {}", e))
}

pub async fn is_connected() -> bool {
    SOCKET.read().await.is_some() && TARGET.read().await.is_some()
}

pub fn parse_incoming_data(data: &[u8]) -> Vec<TelemetryMessage> {
    if data.len() > 8192 {
        warn!("Received packet too large, discarding");
        return Vec::new();
    }
    
    let text = match std::str::from_utf8(data) {
        Ok(t) => t,
        Err(_) => return Vec::new(),
    };

    text.lines()
        .take(100)
        .filter_map(|line| {
            if line.len() > MAX_LINE_LENGTH {
                warn!("Line too long, truncating");
                return None;
            }
            let msg = parse_telemetry(line);
            if msg.is_some() {
                debug!("Parsed: {}", line);
            }
            msg
        })
        .collect()
}

fn parse_telemetry(line: &str) -> Option<TelemetryMessage> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    let parts: Vec<&str> = line.split(',').take(MAX_PARTS).collect();
    if parts.is_empty() {
        return None;
    }
    
    match parts[0] {
        "ROCKET" => {
            if parts.len() >= 5 {
                let timestamp_ms = parts[1].parse::<u64>().ok()?;
                let roll_deg = parts[2].parse::<f32>().ok()?;
                let rotation_rate = parts[3].parse::<f32>().ok()?;
                let servo_output = parts[4].parse::<i32>().ok()?;
                
                if !roll_deg.is_finite() || !rotation_rate.is_finite() {
                    return None;
                }
                
                Some(TelemetryMessage::Rocket {
                    timestamp_ms,
                    roll_deg,
                    rotation_rate,
                    servo_output,
                })
            } else {
                None
            }
        }
        "STATUS" => {
            if parts.len() >= 5 {
                let state = parts[1].to_string();
                let kp = parts[2].parse::<f32>().ok()?;
                let kd = parts[3].parse::<f32>().ok()?;
                let skew = parts[4].parse::<f32>().ok()?;
                
                if !kp.is_finite() || !kd.is_finite() || !skew.is_finite() {
                    return None;
                }
                
                if kp < 0.0 || kp > 100.0 || kd < 0.0 || kd > 100.0 {
                    return None;
                }
                
                Some(TelemetryMessage::RocketStatus {
                    state,
                    kp,
                    kd,
                    skew,
                })
            } else {
                None
            }
        }
        "LAUNCHER" => {
            if parts.len() >= 7 {
                let latitude = parts[1].parse::<f32>().ok()?;
                let longitude = parts[2].parse::<f32>().ok()?;
                let altitude_m = parts[3].parse::<f32>().ok()?;
                let pressure = parts[4].parse::<f32>().ok()?;
                let temperature = parts[5].parse::<f32>().ok()?;
                let heading = parts[6].parse::<f32>().ok()?;
                
                if !latitude.is_finite() || !longitude.is_finite() || !altitude_m.is_finite() {
                    return None;
                }
                
                if latitude < -90.0 || latitude > 90.0 || longitude < -180.0 || longitude > 180.0 {
                    return None;
                }
                
                Some(TelemetryMessage::Launcher {
                    latitude,
                    longitude,
                    altitude_m,
                    pressure,
                    temperature,
                    heading,
                })
            } else {
                None
            }
        }
        "HEADING" => {
            if parts.len() >= 2 {
                let heading = parts[1].parse::<f32>().ok()?;
                if !heading.is_finite() || heading < 0.0 || heading > 360.0 {
                    return None;
                }
                Some(TelemetryMessage::Launcher {
                    latitude: 0.0,
                    longitude: 0.0,
                    altitude_m: 0.0,
                    pressure: 0.0,
                    temperature: heading,
                    heading,
                })
            } else {
                None
            }
        }
        "DEBUG" => {
            let message = parts.get(1).unwrap_or(&"").to_string();
            if message.len() > 256 {
                warn!("Debug message too long, truncating");
                None
            } else {
                Some(TelemetryMessage::Debug {
                    message,
                })
            }
        }
        "ALIVE" | "PONG" | "READY" => {
            Some(TelemetryMessage::Debug {
                message: "heartbeat".to_string(),
            })
        }
        _ => None
    }
}

fn serialize_command(cmd: &ControlCommand) -> String {
    match cmd {
        ControlCommand::UpdatePid { kp, kd } => {
            if !kp.is_finite() || !kd.is_finite() {
                return String::new();
            }
            format!("PID,{},{}\n", kp, kd)
        }
        ControlCommand::Launch => "LAUNCH\n".to_string(),
        ControlCommand::Calibrate => "CALIBRATE\n".to_string(),
        ControlCommand::EmergencyStop => "ESTOP\n".to_string(),
        ControlCommand::Arm => "ARM\n".to_string(),
        ControlCommand::Disarm => "DISARM\n".to_string(),
        ControlCommand::Heartbeat => "PING\n".to_string(),
    }
}