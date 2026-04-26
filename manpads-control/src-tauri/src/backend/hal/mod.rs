use async_trait::async_trait;
use std::net::SocketAddr;
use crate::lib::{ControlCommand, AppError};
use crate::backend::udp::socket;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HardwareProtocol {
    Udp,
    Serial,
    Bluetooth,
}

#[async_trait]
pub trait HardwareInterface: Send + Sync {
    async fn send_command(&self, cmd: &ControlCommand) -> Result<(), AppError>;
    async fn receive(&self, buffer: &mut [u8]) -> Result<(usize, SocketAddr), AppError>;
    async fn is_connected(&self) -> bool;
    fn protocol_name(&self) -> &'static str;
}

pub mod udp;
pub use udp::UdpHardware;

pub fn create_hardware(protocol: HardwareProtocol) -> Result<Box<dyn HardwareInterface>, AppError> {
    match protocol {
        HardwareProtocol::Udp => Ok(Box::new(UdpHardware::new())),
        HardwareProtocol::Serial => Err(AppError::ConnectionError("Serial not implemented".to_string())),
        HardwareProtocol::Bluetooth => Err(AppError::ConnectionError("Bluetooth not implemented".to_string())),
    }
}