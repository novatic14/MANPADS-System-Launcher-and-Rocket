use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tracing::info;

use crate::lib::LauncherState;

#[derive(Debug, Clone, Copy)]
pub enum LauncherEvent {
    Arm,
    CalibrationComplete,
    Timeout,
    Launch,
    FireConfirm,
    Cancel,
    IgnitionAck,
    EmergencyStop,
    Reset,
    Disarm,
}

#[derive(Debug, Clone)]
pub enum StateError {
    InvalidTransition(String),
    SafetyInterlockNotEngaged,
    Timeout(String),
    NotConnected,
}

impl std::fmt::Display for StateError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            StateError::InvalidTransition(s) => write!(f, "Invalid transition: {}", s),
            StateError::SafetyInterlockNotEngaged => write!(f, "Safety interlock not engaged"),
            StateError::Timeout(s) => write!(f, "Timeout: {}", s),
            StateError::NotConnected => write!(f, "Not connected to device"),
        }
    }
}

pub struct LauncherStateMachine {
    state: LauncherState,
    safety_interlock: bool,
    last_transition: Instant,
}

impl LauncherStateMachine {
    pub fn new() -> Self {
        Self {
            state: LauncherState::Safe,
            safety_interlock: false,
            last_transition: Instant::now(),
        }
    }

    pub fn state(&self) -> LauncherState {
        self.state
    }

    pub fn transition(&mut self, event: LauncherEvent) -> Result<LauncherState, StateError> {
        let new_state = match (self.state, event) {
            (LauncherState::Safe, LauncherEvent::Arm) => {
                if !self.safety_interlock {
                    return Err(StateError::SafetyInterlockNotEngaged);
                }
                LauncherState::Calibrating
            }
            (LauncherState::Calibrating, LauncherEvent::CalibrationComplete) => {
                LauncherState::Armed
            }
            (LauncherState::Calibrating, LauncherEvent::Timeout) => {
                LauncherState::Error
            }
            (LauncherState::Armed, LauncherEvent::Launch) => {
                LauncherState::Launching
            }
            (LauncherState::Armed, LauncherEvent::Disarm) => {
                LauncherState::Safe
            }
            (LauncherState::Armed, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            (LauncherState::Launching, LauncherEvent::FireConfirm) => {
                LauncherState::Firing
            }
            (LauncherState::Launching, LauncherEvent::Cancel) => {
                LauncherState::Armed
            }
            (LauncherState::Launching, LauncherEvent::Timeout) => {
                LauncherState::Armed
            }
            (LauncherState::Launching, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            (LauncherState::Firing, LauncherEvent::IgnitionAck) => {
                LauncherState::Recovering
            }
            (LauncherState::Firing, LauncherEvent::Timeout) => {
                LauncherState::Error
            }
            (LauncherState::Firing, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            (LauncherState::Recovering, LauncherEvent::Reset) => {
                LauncherState::Safe
            }
            (LauncherState::Recovering, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            (LauncherState::Error, LauncherEvent::Reset) => {
                LauncherState::Safe
            }
            (LauncherState::Error, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            (current, LauncherEvent::EmergencyStop) => {
                LauncherState::Safe
            }
            _ => return Err(StateError::InvalidTransition(format!("{:?} -> {:?}", self.state, event))),
        };

        info!("State transition: {:?} -> {:?}", self.state, new_state);
        self.state = new_state;
        self.last_transition = Instant::now();
        Ok(new_state)
    }

    pub fn set_safety_interlock(&mut self, engaged: bool) {
        self.safety_interlock = engaged;
    }

    pub fn time_in_state(&self) -> Duration {
        self.last_transition.elapsed()
    }
}

impl Default for LauncherStateMachine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_state_is_safe() {
        let sm = LauncherStateMachine::new();
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_arm_requires_safety_interlock() {
        let mut sm = LauncherStateMachine::new();
        let result = sm.transition(LauncherEvent::Arm);
        assert!(result.is_err());
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_arm_with_safety_interlock() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        let result = sm.transition(LauncherEvent::Arm);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Calibrating);
    }

    #[test]
    fn test_calibrating_to_armed() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        let result = sm.transition(LauncherEvent::CalibrationComplete);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Armed);
    }

    #[test]
    fn test_armed_to_launching() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        let result = sm.transition(LauncherEvent::Launch);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Launching);
    }

    #[test]
    fn test_launching_to_firing() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        let result = sm.transition(LauncherEvent::FireConfirm);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Firing);
    }

    #[test]
    fn test_firing_to_recovering() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::FireConfirm).unwrap();
        let result = sm.transition(LauncherEvent::IgnitionAck);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Recovering);
    }

    #[test]
    fn test_recovering_to_safe() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::FireConfirm).unwrap();
        sm.transition(LauncherEvent::IgnitionAck).unwrap();
        let result = sm.transition(LauncherEvent::Reset);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_emergency_stop_from_any_state() {
        let mut sm = LauncherStateMachine::new();
        
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state(), LauncherState::Safe);

        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state(), LauncherState::Safe);

        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::FireConfirm).unwrap();
        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_calibrating_timeout_leads_to_error() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        let result = sm.transition(LauncherEvent::Timeout);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Error);
    }

    #[test]
    fn test_firing_timeout_leads_to_error() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::FireConfirm).unwrap();
        let result = sm.transition(LauncherEvent::Timeout);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Error);
    }

    #[test]
    fn test_error_state_reset_to_safe() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::Timeout).unwrap();
        assert_eq!(sm.state(), LauncherState::Error);
        
        let result = sm.transition(LauncherEvent::Reset);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_invalid_transition_from_safe() {
        let mut sm = LauncherStateMachine::new();
        let result = sm.transition(LauncherEvent::Launch);
        assert!(result.is_err());
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_disarm_from_armed() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        let result = sm.transition(LauncherEvent::Disarm);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Safe);
    }

    #[test]
    fn test_cancel_from_launching() {
        let mut sm = LauncherStateMachine::new();
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        let result = sm.transition(LauncherEvent::Cancel);
        assert!(result.is_ok());
        assert_eq!(sm.state(), LauncherState::Armed);
    }
}