#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum TelemetryMessage {
    Rocket {
        timestamp_ms: u64,
        roll_deg: f32,
        rotation_rate: f32,
        servo_output: i32,
    },
    RocketStatus {
        state: String,
        kp: f32,
        kd: f32,
        skew: f32,
    },
    Launcher {
        latitude: f32,
        longitude: f32,
        altitude_m: f32,
        pressure: f32,
        temperature: f32,
        heading: f32,
    },
    Debug {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ControlCommand {
    UpdatePid { kp: f32, kd: f32 },
    Launch,
    Calibrate,
    EmergencyStop,
    Arm,
    Disarm,
    Heartbeat,
}

#[derive(Error, Debug)]
pub enum AppError {
    #[error("UDP socket error: {0}")]
    UdpError(String),
    #[error("Protocol parse error: {0}")]
    ParseError(String),
    #[error("Database error: {0}")]
    DbError(String),
    #[error("Device not found: {0}")]
    DeviceNotFound(String),
    #[error("Connection error: {0}")]
    ConnectionError(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::UdpError(e.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::DbError(e.to_string())
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub ip: String,
    pub port: u16,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            ip: "192.168.4.1".to_string(),
            port: 4444,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlightLog {
    pub id: i64,
    pub timestamp: String,
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryRecord {
    pub id: i64,
    pub flight_id: i64,
    pub timestamp_ms: i64,
    pub roll_deg: f32,
    pub rotation_rate: f32,
    pub servo_output: i32,
    pub latitude: f32,
    pub longitude: f32,
    pub altitude_m: f32,
}