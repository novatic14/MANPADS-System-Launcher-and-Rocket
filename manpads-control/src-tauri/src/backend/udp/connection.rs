use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use lazy_static::lazy_static;

lazy_static! {
    pub static ref CONNECTION_MANAGER: RwLock<ConnectionManager> = RwLock::new(ConnectionManager::new());
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConnectionState {
    Disconnected,
    Connected,
    Reconnecting,
}

pub struct ConnectionManager {
    pub state: ConnectionState,
    pub missed_heartbeats: u8,
    pub last_heartbeat: Option<Instant>,
    pub reconnect_attempts: u8,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            state: ConnectionState::Disconnected,
            missed_heartbeats: 0,
            last_heartbeat: None,
            reconnect_attempts: 0,
        }
    }

    pub fn set_connected(&mut self) {
        self.state = ConnectionState::Connected;
        self.missed_heartbeats = 0;
        self.reconnect_attempts = 0;
        self.last_heartbeat = Some(Instant::now());
    }

    pub fn set_disconnected(&mut self) {
        self.state = ConnectionState::Disconnected;
        self.last_heartbeat = None;
    }

    pub fn heartbeat_received(&mut self) {
        self.missed_heartbeats = 0;
        self.last_heartbeat = Some(Instant::now());
    }

    pub fn heartbeat_missed(&mut self) -> bool {
        self.missed_heartbeats += 1;
        self.missed_heartbeats >= 3
    }

    pub fn should_reconnect(&self) -> bool {
        self.reconnect_attempts < 5
    }

    pub fn increment_reconnect(&mut self) {
        self.reconnect_attempts += 1;
        self.state = ConnectionState::Reconnecting;
    }

    pub fn backoff_duration(&self) -> Duration {
        let base = 500_u64;
        let multiplier = 2u64.pow(self.reconnect_attempts.min(4) as u32);
        Duration::from_millis(std::cmp::min(base * multiplier, 10_000))
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}