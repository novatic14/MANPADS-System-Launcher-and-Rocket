use crate::lib::{ControlCommand, AppError, LauncherState, StateChangedEvent};
use crate::backend::state::{LauncherEvent, LauncherStateMachine};
use crate::backend::udp::socket;
use parking_lot::RwLock;
use lazy_static::lazy_static;
use tracing::{info, error};
use tauri::{AppHandle, Emitter};
use std::time::SystemTime;

lazy_static! {
    static ref STATE_MACHINE: RwLock<LauncherStateMachine> = RwLock::new(LauncherStateMachine::new());
}

#[tauri::command]
pub fn get_launcher_state() -> LauncherState {
    STATE_MACHINE.read().state()
}

#[tauri::command]
pub fn set_safety_interlock(engaged: bool) {
    STATE_MACHINE.write().set_safety_interlock(engaged);
}

#[tauri::command]
pub async fn transition_state(event: String, app_handle: Option<AppHandle>) -> Result<LauncherState, AppError> {
    let e = match event.as_str() {
        "arm" => LauncherEvent::Arm,
        "calibration_complete" => LauncherEvent::CalibrationComplete,
        "timeout" => LauncherEvent::Timeout,
        "launch" => LauncherEvent::Launch,
        "fire_confirm" => LauncherEvent::FireConfirm,
        "cancel" => LauncherEvent::Cancel,
        "ignition_ack" => LauncherEvent::IgnitionAck,
        "emergency_stop" => LauncherEvent::EmergencyStop,
        "reset" => LauncherEvent::Reset,
        _ => return Err(AppError::ParseError(format!("Unknown event: {}", event))),
    };

    let (from, to) = {
        let mut sm = STATE_MACHINE.write();
        let from = sm.state();
        let result = sm.transition(e).map_err(|e| AppError::ParseError(e.to_string()))?;
        (from, result)
    };

    if let Some(app) = app_handle {
        let timestamp_ms = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let state_event = StateChangedEvent {
            from,
            to,
            timestamp_ms,
        };
        let _ = app.emit("launcher:state", &state_event);
    }

    info!("State transition: {:?} -> {:?}", from, to);
    Ok(to)
}

#[tauri::command]
pub async fn update_pid(kp: f32, kd: f32) -> Result<(), AppError> {
    info!("Updating PID: kp={}, kd={}", kp, kd);
    
    if kp < 0.0 || kp > 10.0 {
        return Err(AppError::ParseError("kp must be between 0.0 and 10.0".to_string()));
    }
    if kd < 0.0 || kd > 5.0 {
        return Err(AppError::ParseError("kd must be between 0.0 and 5.0".to_string()));
    }
    
    socket::send(&ControlCommand::UpdatePid { kp, kd }).await.map_err(|e| {
        error!("PID update failed: {}", e);
        AppError::UdpError(e)
    })?;
    
    Ok(())
}