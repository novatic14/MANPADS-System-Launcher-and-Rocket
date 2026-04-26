# MANPADS Launcher State Machine Specification

**Date:** 2026-04-26
**Status:** Approved
**Scope:** Launcher control state machine with synchronized frontend state

---

## Overview

Implement a formal state machine for launcher control with backend authority and frontend mirroring. The state machine ensures safe launcher operation by enforcing valid state transitions and providing visual feedback.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    RUST BACKEND                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │           LauncherStateMachine                   │    │
│  │  Safe → Calibrating → Armed → Launching → Firing │    │
│  │  (EmergencyStop can interrupt from any state)   │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                              │
│                          │ emits "launcher:state"       │
│                          ▼                              │
│              Tauri commands validate & transition        │
└─────────────────────────────────────────────────────────┘
                           │
                           │ event
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (Zustand)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │           launcherState in telemetry store        │    │
│  │  - Mirrors backend state                         │    │
│  │  - UI indicators per state                       │    │
│  │  - Logs all transitions with timestamps          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## State Machine Definition

### States

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LauncherState {
    Safe,       // Safety engaged, no commands processed
    Calibrating, // Sensors initializing
    Armed,      // Ready to launch, awaiting command
    Launching,  // Launch sequence in progress
    Firing,     // Ignition signal sent
    Recovering, // Post-launch recovery
    Error,      // Error state requiring reset
}
```

### Events

```rust
#[derive(Debug, Clone, Copy)]
pub enum LauncherEvent {
    Arm,              // Request arming
    CalibrationComplete, // Calibration finished
    Timeout,          // State timeout reached
    Launch,           // Request launch
    FireConfirm,      // Physical switch confirmation
    Cancel,           // Cancel current operation
    IgnitionAck,      // Rocket confirmed ignition
    EmergencyStop,    // Emergency stop (from any state)
    Reset,            // Reset from error state
}
```

### Transitions

| Current State | Event | Guard | Next State | Timeout |
|--------------|-------|-------|------------|----------|
| Safe | Arm | Safety interlock | Calibrating | - |
| Calibrating | CalibrationComplete | - | Armed | 5s |
| Calibrating | Timeout | Calibration failed | Error | 5s |
| Armed | Launch | - | Launching | - |
| Armed | Disarm | - | Safe | - |
| Launching | FireConfirm | Physical switch | Firing | 10s |
| Launching | Cancel | - | Armed | - |
| Launching | Timeout | No confirmation | Armed | 10s |
| Firing | IgnitionAck | Rocket confirmed | Recovering | 3s |
| Firing | Timeout | No ACK | Error | 3s |
| Recovering | Reset | - | Safe | - |
| Error | Reset | - | Safe | - |
| Any | EmergencyStop | - | Safe | - |

### State Error

```rust
#[derive(Debug, Clone)]
pub enum StateError {
    InvalidTransition(String),
    SafetyInterlockNotEngaged,
    Timeout(String),
    NotConnected,
}
```

---

## Backend Implementation

### New File: `src-tauri/src/backend/state.rs`

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
            (LauncherState::Launching, LauncherEvent::FireConfirm) => {
                LauncherState::Firing
            }
            (LauncherState::Launching, LauncherEvent::Cancel) => {
                LauncherState::Armed
            }
            (LauncherState::Launching, LauncherEvent::Timeout) => {
                LauncherState::Armed
            }
            (LauncherState::Firing, LauncherEvent::IgnitionAck) => {
                LauncherState::Recovering
            }
            (LauncherState::Firing, LauncherEvent::Timeout) => {
                LauncherState::Error
            }
            (LauncherState::Recovering, LauncherEvent::Reset) => {
                LauncherState::Safe
            }
            (LauncherState::Error, LauncherEvent::Reset) => {
                LauncherState::Safe
            }
            (_, LauncherEvent::EmergencyStop) => {
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

---

## Events Emitted

### State Changed Event

```rust
#[derive(Debug, Clone, Serialize)]
pub struct StateChangedEvent {
    pub from: LauncherState,
    pub to: LauncherState,
    pub timestamp_ms: u64,
}
```

### Tauri Command for State Queries

```rust
#[tauri::command]
pub fn get_launcher_state(state_machine: State<LauncherStateMachine>) -> LauncherState {
    state_machine.state()
}
```

---

## Frontend Integration

### TypeScript Types

```typescript
export type LauncherState = 'safe' | 'calibrating' | 'armed' | 'launching' | 'firing' | 'recovering' | 'error';

export interface StateChangedEvent {
    from: LauncherState;
    to: LauncherState;
    timestamp_ms: number;
}
```

### Zustand Store Extension

In `telemetry.ts`, add to `RocketState`:

```typescript
export interface RocketState {
  // ... existing fields
  launcherState: LauncherState;
  stateHistory: Array<{ from: LauncherState; to: LauncherState; timestamp: Date }>;
}
```

### Event Listener

```typescript
payloadHandler<StateChangedEvent>('launcher:state', (event) => {
    const { from, to, timestamp_ms } = event.payload;
    store.updateRocketState(activeRocketId, {
        launcherState: to,
        stateHistory: [...store.rocketStates[activeRocketId].stateHistory, { from, to, timestamp: new Date(timestamp_ms) }]
    });
    store.addEvent('info', `State: ${from} → ${to}`);
});
```

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `src-tauri/src/backend/state.rs` |
| CREATE | `src-tauri/src/backend/state/tests.rs` |
| MODIFY | `src-tauri/src/backend/commands/mod.rs` |
| MODIFY | `src-tauri/src/backend/commands/connectivity.rs` |
| MODIFY | `src-tauri/src/backend/commands/control.rs` |
| MODIFY | `src/lib/types.ts` |
| MODIFY | `src/store/telemetry.ts` |
| MODIFY | `src/components/control/LaunchWizard.tsx` |

---

## Success Criteria

1. State machine enforces valid transitions only
2. EmergencyStop works from any state → Safe
3. Frontend receives state change events and updates UI
4. All transitions logged with timestamps
5. Invalid transitions return descriptive errors
6. Unit tests verify all transition paths