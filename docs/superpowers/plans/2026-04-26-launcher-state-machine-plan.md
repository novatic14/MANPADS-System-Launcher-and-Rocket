# Launcher State Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement formal state machine for launcher control with backend authority and frontend mirroring.

**Architecture:** State machine in Rust backend manages authoritative state. Frontend mirrors state via Tauri events. Invalid transitions return errors, EmergencyStop works from any state.

**Tech Stack:** Rust (Tauri), TypeScript (Zustand), tracing for logging

---

## File Map

| File | Responsibility |
|------|----------------|
| `src-tauri/src/backend/state.rs` | State machine logic with all states/events |
| `src-tauri/src/backend/state/tests.rs` | Unit tests for all transitions |
| `src-tauri/src/backend/commands/mod.rs` | Export state module |
| `src-tauri/src/backend/commands/control.rs` | Use state machine for commands |
| `src-tauri/src/lib.rs` | Add LauncherState type |
| `src/lib/types.ts` | Add LauncherState type |
| `src/store/telemetry.ts` | Listen to state events, store state |
| `src/components/control/LaunchWizard.tsx` | UI indicators per state |

---

## Task 1: Create State Machine Module

**Files:**
- Create: `manpads-control/src-tauri/src/backend/state.rs`
- Create: `manpads-control/src-tauri/src/backend/state/tests.rs`

- [ ] **Step 1: Create state.rs with state machine**

```rust
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tracing::info;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LauncherState {
    Safe,
    Calibrating,
    Armed,
    Launching,
    Firing,
    Recovering,
    Error,
}

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
```

- [ ] **Step 2: Create tests.rs with state machine tests**

```rust
use super::*;

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
        
        // From Armed
        sm.set_safety_interlock(true);
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state(), LauncherState::Safe);

        // From Launching
        sm.transition(LauncherEvent::Arm).unwrap();
        sm.transition(LauncherEvent::CalibrationComplete).unwrap();
        sm.transition(LauncherEvent::Launch).unwrap();
        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state(), LauncherState::Safe);

        // From Firing
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
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd /Users/pallabpc/Desktop/MANPADS-System-Launcher-and-Rocket/manpads-control/src-tauri
cargo test --lib state 2>&1 | tail -30
```

Expected: 15 tests passing

- [ ] **Step 4: Commit**

```bash
git add manpads-control/src-tauri/src/backend/state.rs manpads-control/src-tauri/src/backend/state/tests.rs
git commit -m "feat: add launcher state machine with all transitions"
```

---

## Task 2: Export State Module

**Files:**
- Modify: `manpads-control/src-tauri/src/backend/commands/mod.rs`

- [ ] **Step 1: Add state module export**

Add to `commands/mod.rs`:

```rust
pub mod connectivity;
pub mod control;
pub mod telemetry;
pub mod validation;

pub use crate::backend::state::{LauncherState, LauncherEvent, LauncherStateMachine, StateError};
```

- [ ] **Step 2: Export from backend mod.rs**

Modify `manpads-control/src-tauri/src/backend/mod.rs`:

```rust
pub mod commands;
pub mod storage;
pub mod udp;
pub mod state;

pub use state::{LauncherState, LauncherEvent, LauncherStateMachine, StateError};
```

- [ ] **Step 3: Verify compilation**

```bash
cd /Users/pallabpc/Desktop/MANPADS-System-Launcher-and-Rocket/manpads-control/src-tauri
cargo check 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/src-tauri/src/backend/mod.rs manpads-control/src-tauri/src/backend/commands/mod.rs
git commit -m "feat: export state machine types from backend"
```

---

## Task 3: Add LauncherState to Types

**Files:**
- Modify: `manpads-control/src-tauri/src/lib.rs`
- Modify: `manpads-control/src/lib/types.ts`

- [ ] **Step 1: Add LauncherState to Rust lib.rs**

Add to `lib.rs`:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LauncherState {
    Safe,
    Calibrating,
    Armed,
    Launching,
    Firing,
    Recovering,
    Error,
}

#[derive(Debug, Clone, Serialize)]
pub struct StateChangedEvent {
    pub from: LauncherState,
    pub to: LauncherState,
    pub timestamp_ms: u64,
}
```

- [ ] **Step 2: Add LauncherState to TypeScript types.ts**

Add to `types.ts`:

```typescript
export type LauncherState = 'safe' | 'calibrating' | 'armed' | 'launching' | 'firing' | 'recovering' | 'error';

export interface StateChangedEvent {
    from: LauncherState;
    to: LauncherState;
    timestamp_ms: number;
}

export interface StateHistoryEntry {
    from: LauncherState;
    to: LauncherState;
    timestamp: Date;
}
```

- [ ] **Step 3: Commit**

```bash
git add manpads-control/src-tauri/src/lib.rs manpads-control/src/lib/types.ts
git commit -m "feat: add LauncherState type to frontend and backend"
```

---

## Task 4: Integrate State Machine into Control Commands

**Files:**
- Modify: `manpads-control/src-tauri/src/backend/commands/control.rs`

- [ ] **Step 1: Update control.rs to use state machine**

Replace the content of `control.rs`:

```rust
use crate::lib::{ControlCommand, AppError, LauncherState, StateChangedEvent};
use crate::backend::udp::socket;
use crate::backend::state::{LauncherStateMachine, LauncherEvent};
use std::sync::Arc;
use parking_lot::RwLock;
use lazy_static::lazy_static;
use tracing::{info, error};
use tauri::{AppHandle, Emitter};

lazy_static! {
    static ref STATE_MACHINE: RwLock<LauncherStateMachine> = RwLock::new(LauncherStateMachine::new());
}

#[tauri::command]
pub async fn get_launcher_state() -> LauncherState {
    STATE_MACHINE.read().state()
}

#[tauri::command]
pub async fn set_safety_interlock(engaged: bool) {
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

    // Emit state change event to frontend
    if let Some(app) = app_handle {
        let event = StateChangedEvent {
            from,
            to,
            timestamp_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        };
        let _ = app.emit("launcher:state", &event);
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
```

- [ ] **Step 2: Verify compilation**

```bash
cargo check 2>&1 | tail -15
```

- [ ] **Step 3: Commit**

```bash
git add manpads-control/src-tauri/src/backend/commands/control.rs
git commit -m "feat: integrate state machine into control commands"
```

---

## Task 5: Frontend State Store Integration

**Files:**
- Modify: `manpads-control/src/store/telemetry.ts`

- [ ] **Step 1: Add launcherState to RocketState interface**

In `telemetry.ts`, add to `RocketState` interface:

```typescript
launcherState: LauncherState;
stateHistory: StateHistoryEntry[];
```

- [ ] **Step 2: Initialize launcherState in addRocket**

In `addRocket` function, add to the initial state:

```typescript
launcherState: 'safe',
stateHistory: [],
```

- [ ] **Step 3: Add state change event listener**

Add to `initializeTelemetryListener`:

```typescript
case 'StateChanged':
case 'launcher_state':
    const fromState = (payload as any).from || 'safe';
    const toState = (payload as any).to || 'safe';
    const timestamp = new Date((payload as any).timestamp_ms || Date.now());
    store.updateRocketState(activeRocketId, {
        launcherState: toState,
        stateHistory: [...(store.rocketStates[activeRocketId]?.stateHistory || []), { from: fromState, to: toState, timestamp }]
    });
    store.addEvent('info', `State: ${fromState} → ${toState}`);
    break;
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/src/store/telemetry.ts
git commit -m "feat: add launcher state tracking to Zustand store"
```

---

## Task 6: LaunchWizard UI Indicators

**Files:**
- Modify: `manpads-control/src/components/control/LaunchWizard.tsx`

- [ ] **Step 1: Import launcherState and add visual indicator**

Add import:
```typescript
import type { LauncherState } from '@/lib/types';
```

Add state indicator (after the title, before step 1):
```typescript
const launcherState = useTelemetryStore((s) => {
    const activeId = s.activeRocketId;
    return activeId ? s.rocketStates[activeId]?.launcherState : 'safe';
});

const stateColors: Record<LauncherState, string> = {
    safe: 'bg-gray-500',
    calibrating: 'bg-yellow-500',
    armed: 'bg-green-500',
    launching: 'bg-orange-500',
    firing: 'bg-red-500 animate-pulse',
    recovering: 'bg-blue-500',
    error: 'bg-red-700',
};
```

Add state indicator UI (before step 1):
```tsx
<div className="mb-4 p-2 rounded bg-surface border border-border">
    <span className="text-xs text-text-muted">Launcher State: </span>
    <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${stateColors[launcherState]}`}>
        {launcherState.toUpperCase()}
    </span>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add manpads-control/src/components/control/LaunchWizard.tsx
git commit -m "feat: add launcher state indicator to LaunchWizard"
```

---

## Verification

- [ ] Run Rust tests: `cargo test --lib`
- [ ] Run TypeScript tests: `npx vitest run`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Verify Tauri builds: `npm run build`