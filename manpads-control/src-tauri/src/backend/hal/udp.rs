use async_trait::async_trait;
use std::net::SocketAddr;
use crate::lib::{ControlCommand, AppError};
use crate::backend::udp::socket;

#[derive(Debug, Clone)]
pub struct UdpHardware;

impl UdpHardware {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl super::HardwareInterface for UdpHardware {
    async fn send_command(&self, cmd: &ControlCommand) -> Result<(), AppError> {
        socket::send(cmd).await.map_err(|e| AppError::ConnectionError(e))
    }

    async fn receive(&self, buffer: &mut [u8]) -> Result<(usize, SocketAddr), AppError> {
        socket::receive(buffer).await.map_err(|e| AppError::ConnectionError(e))
    }

    async fn is_connected(&self) -> bool {
        socket::is_connected().await
    }

    fn protocol_name(&self) -> &'static str {
        "UDP"
    }
}