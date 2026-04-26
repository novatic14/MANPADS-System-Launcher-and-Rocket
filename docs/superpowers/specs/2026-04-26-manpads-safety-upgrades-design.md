# MANPADS System: High-Priority Safety Upgrades Specification

**Date:** 2026-04-26
**Status:** Approved
**Scope:** High-priority safety enhancements only (no cloud/AI/enterprise features)

---

## Overview

Implementing critical safety upgrades for the MANPADS Control System focusing on communication resilience, input validation, firmware watchdog, and comprehensive unit tests.

---

## Phase 1A: UDP Communication Resilience

### Components

**New file:** `src-tauri/src/backend/udp/connection.rs`

```rust
pub struct ConnectionManager {
    state: ConnectionState,
    missed_heartbeats: u8,
    last_heartbeat: Instant,
    reconnect_backoff: Duration,
}

#[derive(Debug, Clone, Copy)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Reconnecting,
}
```

### Behavior

- **Heartbeat:** Send PING every 5 seconds; expect PONG within 3 seconds
- **Reconnection:** On 3 missed heartbeats, initiate reconnection with exponential backoff
- **Backoff schedule:** 500ms → 1s → 2s → 4s → 8s → 10s (max)
- **Max retries:** 5 attempts before giving up

### Changes to Existing Files

| File | Changes |
|------|---------|
| `backend/udp/socket.rs` | Add heartbeat send/receive, track connection state |
| `backend/commands/connectivity.rs` | Use connection manager for reconnection |

---

## Phase 1B: Input Validation

### Frontend Validation (`src/lib/validation.ts`)

```typescript
const AZIMUTH_RANGE = { min: 0, max: 360 };
const ELEVATION_RANGE = { min: -10, max: 85 };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface LaunchParams {
  azimuth: number;
  elevation: number;
}

export function validateLaunchParams(params: LaunchParams): ValidationResult {
  if (params.azimuth < AZIMUTH_RANGE.min || params.azimuth > AZIMUTH_RANGE.max) {
    return { valid: false, error: `Azimuth must be between ${AZIMUTH_RANGE.min} and ${AZIMUTH_RANGE.max}` };
  }
  if (params.elevation < ELEVATION_RANGE.min || params.elevation > ELEVATION_RANGE.max) {
    return { valid: false, error: `Elevation must be between ${ELEVATION_RANGE.min} and ${ELEVATION_RANGE.max}` };
  }
  return { valid: true };
}
```

### Backend Validation (`src-tauri/src/backend/commands/validation.rs`)

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct LaunchCommand {
    pub azimuth: f32,
    pub elevation: f32,
}

impl LaunchCommand {
    pub fn validate(&self) -> Result<(), AppError> {
        if !(0.0..=360.0).contains(&self.azimuth) {
            return Err(AppError::ParseError("Azimuth out of range".to_string()));
        }
        if !(-10.0..=85.0).contains(&self.elevation) {
            return Err(AppError::ParseError("Elevation out of range".to_string()));
        }
        Ok(())
    }
}
```

### Command Queue

- Max queue size: 10 commands
- Deduplicate identical commands within 500ms window
- Log queue overflow warnings

---

## Phase 2: Firmware Watchdog

### Rocket ESP32 (`Firmware/Rocket/src/main.cpp`)

```cpp
#include <esp_task_wdt.h>

void setup() {
    // ... existing setup ...
    esp_task_wdt_init(5, true);  // 5 second timeout
    esp_task_wdt_add(NULL);
}

void loop() {
    // ... existing logic ...
    esp_task_wdt_reset();  // Feed watchdog
}
```

### Launcher ESP32 (`Firmware/Launcher/src/main.cpp`)

```cpp
#include <esp_task_wdt.h>

void setup() {
    // ... existing setup ...
    esp_task_wdt_init(5, true);
    esp_task_wdt_add(NULL);
}

void loop() {
    // ... existing logic ...
    esp_task_wdt_reset();
}
```

---

## Phase 3: Unit Tests

### Rust Tests (`src-tauri/src/`)

**`state/tests.rs`** - State machine transitions:

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_launcher_state_transitions() {
        let mut sm = LauncherStateMachine::new();
        assert_eq!(sm.state, LauncherState::Safe);

        sm.transition(LauncherEvent::EmergencyStop).unwrap();
        assert_eq!(sm.state, LauncherState::Safe);
    }

    #[test]
    fn test_invalid_transition_rejected() {
        let mut sm = LauncherStateMachine::new();
        let result = sm.transition(LauncherEvent::Fire);
        assert!(result.is_err());
    }
}
```

**`validation/tests.rs`** - Input validation:

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_valid_launch_params() {
        let params = LaunchCommand { azimuth: 90.0, elevation: 45.0 };
        assert!(params.validate().is_ok());
    }

    #[test]
    fn test_invalid_azimuth_rejected() {
        let params = LaunchCommand { azimuth: 400.0, elevation: 45.0 };
        assert!(params.validate().is_err());
    }
}
```

### TypeScript Tests (`src/lib/__tests__/validation.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { validateLaunchParams } from '../validation';

describe('Launch input validation', () => {
    it('should accept valid azimuth and elevation', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: 45 });
        expect(result.valid).toBe(true);
    });

    it('should reject azimuth out of range', () => {
        const result = validateLaunchParams({ azimuth: -5, elevation: 45 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azimuth');
    });
});
```

---

## File Summary

| Action | File |
|--------|------|
| CREATE | `src-tauri/src/backend/udp/connection.rs` |
| CREATE | `src-tauri/src/backend/commands/validation.rs` |
| CREATE | `src-tauri/src/backend/commands/state.rs` |
| CREATE | `src/lib/validation.ts` |
| CREATE | `src/lib/__tests__/validation.test.ts` |
| MODIFY | `src-tauri/src/backend/udp/socket.rs` |
| MODIFY | `src-tauri/src/backend/commands/connectivity.rs` |
| MODIFY | `Firmware/Rocket/src/main.cpp` |
| MODIFY | `Firmware/Launcher/src/main.cpp` |
| MODIFY | `manpads-control/package.json` (add vitest) |

---

## Dependencies

| Package | Purpose | Command |
|---------|---------|---------|
| vitest | TypeScript testing | `npm install -D vitest` |
| @vitest/coverage-v8 | Coverage reports | `npm install -D @vitest/coverage-v8` |

---

## Success Criteria

1. All heartbeats sent/received correctly on connected UDP socket
2. Reconnection triggers after 3 missed heartbeats with backoff
3. Invalid azimuth/elevation values rejected with clear error messages
4. Command queue prevents rapid-fire duplicates
5. Firmware resets within 5 seconds if watchdog not fed
6. All unit tests pass (Rust + TypeScript)