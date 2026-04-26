# MANPADS High-Priority Safety Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement critical safety upgrades for communication resilience, input validation, firmware watchdog, and unit tests.

**Architecture:** Phased approach - (1A) UDP resilience with heartbeat/reconnection, (1B) input validation frontend+backend, (2) ESP32 watchdog, (3) unit tests.

**Tech Stack:** Rust (Tauri backend), TypeScript (Next.js frontend), ESP32 C++ (firmware), Vitest (TS tests)

---

## File Map

| File | Responsibility |
|------|----------------|
| `src-tauri/src/backend/udp/connection.rs` | Connection state, heartbeat tracking, reconnection logic |
| `src-tauri/src/backend/udp/socket.rs` | Existing UDP socket - add heartbeat send/receive |
| `src-tauri/src/backend/commands/validation.rs` | Backend command validation (new) |
| `src-tauri/src/backend/commands/mod.rs` | Export new modules |
| `src/lib/validation.ts` | Frontend validation functions (new) |
| `src/lib/__tests__/validation.test.ts` | Vitest tests for validation |
| `Firmware/Rocket/src/main.cpp` | Add esp_task_wdt |
| `Firmware/Launcher/src/main.cpp` | Add esp_task_wdt |
| `manpads-control/package.json` | Add vitest dependency |

---

## Phase 1A: UDP Communication Resilience

### Task 1: Create Connection Manager

**Files:**
- Create: `manpads-control/src-tauri/src/backend/udp/connection.rs`
- Modify: `manpads-control/src-tauri/src/backend/udp/mod.rs`

- [ ] **Step 1: Create connection manager module**

```rust
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
```

- [ ] **Step 2: Export from udp module**

Modify `manpads-control/src-tauri/src/backend/udp/mod.rs`:

```rust
pub mod socket;
pub mod parser;
pub mod connection;

pub use connection::{ConnectionManager, ConnectionState, CONNECTION_MANAGER};
```

- [ ] **Step 3: Commit**

```bash
cd /Users/pallabpc/Desktop/MANPADS-System-Launcher-and-Rocket
git add manpads-control/src-tauri/src/backend/udp/connection.rs manpads-control/src-tauri/src/backend/udp/mod.rs
git commit -m "feat: add connection manager for UDP heartbeat tracking"
```

---

### Task 2: Add Heartbeat to Socket

**Files:**
- Modify: `manpads-control/src-tauri/src/backend/udp/socket.rs`

- [ ] **Step 1: Add heartbeat constants and functions**

Add to `socket.rs` after the imports:

```rust
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(3);

pub async fn send_heartbeat() -> Result<(), String> {
    send(&ControlCommand::Heartbeat).await
}
```

- [ ] **Step 2: Add heartbeat tracking in receive function**

Modify `receive` function to track heartbeat responses:

```rust
pub async fn receive(buffer: &mut [u8]) -> Result<(usize, SocketAddr), String> {
    let socket = SOCKET.read().await;
    let socket = socket.as_ref().ok_or("Not connected")?;
    
    socket
        .recv_from(buffer)
        .await
        .map_err(|e| format!("Receive failed: {}", e))
}
```

- [ ] **Step 3: Update parse to handle heartbeat responses**

Add to `parse_incoming_data` function, handle "PONG" message:

```rust
"ALIVE" | "PONG" | "READY" => {
    Some(TelemetryMessage::Debug {
        message: "heartbeat".to_string(),
    })
}
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/src-tauri/src/backend/udp/socket.rs
git commit -m "feat: add heartbeat support to UDP socket"
```

---

## Phase 1B: Input Validation

### Task 3: Create Frontend Validation

**Files:**
- Create: `manpads-control/src/lib/validation.ts`

- [ ] **Step 1: Write failing test**

Create test directory and file:

```bash
mkdir -p manpads-control/src/lib/__tests__
```

```typescript
import { describe, it, expect } from 'vitest';
import { validateLaunchParams, validatePidParams, ValidationError } from '../validation';

describe('Launch input validation', () => {
    it('should accept valid azimuth and elevation', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: 45 });
        expect(result.valid).toBe(true);
    });

    it('should reject azimuth below 0', () => {
        const result = validateLaunchParams({ azimuth: -5, elevation: 45 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azimuth');
    });

    it('should reject azimuth above 360', () => {
        const result = validateLaunchParams({ azimuth: 400, elevation: 45 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Azimuth');
    });

    it('should reject elevation below -10', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: -15 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Elevation');
    });

    it('should reject elevation above 85', () => {
        const result = validateLaunchParams({ azimuth: 90, elevation: 90 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Elevation');
    });
});

describe('PID validation', () => {
    it('should accept valid PID values', () => {
        const result = validatePidParams({ kp: 0.5, kd: 0.2 });
        expect(result.valid).toBe(true);
    });

    it('should reject kp below 0', () => {
        const result = validatePidParams({ kp: -0.1, kd: 0.2 });
        expect(result.valid).toBe(false);
    });

    it('should reject kd above 5.0', () => {
        const result = validatePidParams({ kp: 0.5, kd: 10.0 });
        expect(result.valid).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd manpads-control && npx vitest run src/lib/__tests__/validation.test.ts 2>&1 | head -30
```

Expected: FAIL - "validateLaunchParams is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
export const AZIMUTH_RANGE = { min: 0, max: 360 };
export const ELEVATION_RANGE = { min: -10, max: 85 };
export const KP_RANGE = { min: 0.0, max: 10.0 };
export const KD_RANGE = { min: 0.0, max: 5.0 };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface LaunchParams {
  azimuth: number;
  elevation: number;
}

export interface PidParams {
  kp: number;
  kd: number;
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

export function validatePidParams(params: PidParams): ValidationResult {
  if (params.kp < KP_RANGE.min || params.kp > KP_RANGE.max) {
    return { valid: false, error: `Kp must be between ${KP_RANGE.min} and ${KP_RANGE.max}` };
  }
  if (params.kd < KD_RANGE.min || params.kd > KD_RANGE.max) {
    return { valid: false, error: `Kd must be between ${KD_RANGE.min} and ${KD_RANGE.max}` };
  }
  return { valid: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd manpads-control && npx vitest run src/lib/__tests__/validation.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add manpads-control/src/lib/validation.ts manpads-control/src/lib/__tests__/validation.test.ts
git commit -m "feat: add frontend input validation for launch and PID params"
```

---

### Task 4: Create Backend Validation

**Files:**
- Create: `manpads-control/src-tauri/src/backend/commands/validation.rs`
- Modify: `manpads-control/src-tauri/src/backend/commands/mod.rs`

- [ ] **Step 1: Write failing test**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_launch_command() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: 45.0 };
        assert!(cmd.validate().is_ok());
    }

    #[test]
    fn test_invalid_azimuth_below_zero() {
        let cmd = LaunchCommand { azimuth: -5.0, elevation: 45.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_azimuth_above_360() {
        let cmd = LaunchCommand { azimuth: 400.0, elevation: 45.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_elevation_below_minus_10() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: -15.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_elevation_above_85() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: 90.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_valid_pid_command() {
        let cmd = PidCommand { kp: 0.5, kd: 0.2 };
        assert!(cmd.validate().is_ok());
    }

    #[test]
    fn test_invalid_kp_below_zero() {
        let cmd = PidCommand { kp: -0.1, kd: 0.2 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_kd_above_5() {
        let cmd = PidCommand { kp: 0.5, kd: 10.0 };
        assert!(cmd.validate().is_err());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd manpads-control/src-tauri && cargo test --lib commands::validation 2>&1 | tail -20
```

Expected: error: cannot find module `commands::validation`

- [ ] **Step 3: Create validation module**

```rust
use serde::Deserialize;
use crate::AppError;

#[derive(Debug, Deserialize)]
pub struct LaunchCommand {
    pub azimuth: f32,
    pub elevation: f32,
}

impl LaunchCommand {
    pub fn validate(&self) -> Result<(), AppError> {
        if !(0.0..=360.0).contains(&self.azimuth) {
            return Err(AppError::ParseError("Azimuth must be between 0 and 360".to_string()));
        }
        if !(-10.0..=85.0).contains(&self.elevation) {
            return Err(AppError::ParseError("Elevation must be between -10 and 85".to_string()));
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct PidCommand {
    pub kp: f32,
    pub kd: f32,
}

impl PidCommand {
    pub fn validate(&self) -> Result<(), AppError> {
        if !(0.0..=10.0).contains(&self.kp) {
            return Err(AppError::ParseError("Kp must be between 0.0 and 10.0".to_string()));
        }
        if !(0.0..=5.0).contains(&self.kd) {
            return Err(AppError::ParseError("Kd must be between 0.0 and 5.0".to_string()));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_launch_command() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: 45.0 };
        assert!(cmd.validate().is_ok());
    }

    #[test]
    fn test_invalid_azimuth_below_zero() {
        let cmd = LaunchCommand { azimuth: -5.0, elevation: 45.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_azimuth_above_360() {
        let cmd = LaunchCommand { azimuth: 400.0, elevation: 45.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_elevation_below_minus_10() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: -15.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_elevation_above_85() {
        let cmd = LaunchCommand { azimuth: 90.0, elevation: 90.0 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_valid_pid_command() {
        let cmd = PidCommand { kp: 0.5, kd: 0.2 };
        assert!(cmd.validate().is_ok());
    }

    #[test]
    fn test_invalid_kp_below_zero() {
        let cmd = PidCommand { kp: -0.1, kd: 0.2 };
        assert!(cmd.validate().is_err());
    }

    #[test]
    fn test_invalid_kd_above_5() {
        let cmd = PidCommand { kp: 0.5, kd: 10.0 };
        assert!(cmd.validate().is_err());
    }
}
```

- [ ] **Step 4: Export from commands module**

Modify `manpads-control/src-tauri/src/backend/commands/mod.rs`:

```rust
pub mod connectivity;
pub mod control;
pub mod telemetry;
pub mod validation;

pub use validation::{LaunchCommand, PidCommand};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd manpads-control/src-tauri && cargo test --lib validation 2>&1 | tail -15
```

Expected: test result: ok

- [ ] **Step 6: Commit**

```bash
git add manpads-control/src-tauri/src/backend/commands/validation.rs manpads-control/src-tauri/src/backend/commands/mod.rs
git commit -m "feat: add backend input validation for commands"
```

---

## Phase 2: Firmware Watchdog

### Task 5: Add Watchdog to Rocket ESP32

**Files:**
- Modify: `Firmware/Rocket/src/main.cpp`

- [ ] **Step 1: Add watchdog include**

Add after other includes:
```cpp
#include <esp_task_wdt.h>
```

- [ ] **Step 2: Add watchdog initialization in setup()**

After `calibrateGyro();`:
```cpp
esp_task_wdt_init(5, true);  // 5 second timeout, panic on trigger
esp_task_wdt_add(NULL);
```

- [ ] **Step 3: Add watchdog feed in loop()**

Add at end of loop():
```cpp
esp_task_wdt_reset();  // Feed watchdog
```

- [ ] **Step 4: Commit**

```bash
git add Firmware/Rocket/src/main.cpp
git commit -m "feat: add ESP32 watchdog timer to Rocket firmware"
```

---

### Task 6: Add Watchdog to Launcher ESP32

**Files:**
- Modify: `Firmware/Launcher/src/main.cpp`

- [ ] **Step 1: Add watchdog include**

Add after other includes:
```cpp
#include <esp_task_wdt.h>
```

- [ ] **Step 2: Add watchdog initialization in setup()**

After `successTone();`:
```cpp
esp_task_wdt_init(5, true);
esp_task_wdt_add(NULL);
```

- [ ] **Step 3: Add watchdog feed in loop()**

Add at end of loop():
```cpp
esp_task_wdt_reset();
```

- [ ] **Step 4: Commit**

```bash
git add Firmware/Launcher/src/main.cpp
git commit -m "feat: add ESP32 watchdog timer to Launcher firmware"
```

---

## Phase 3: Test Setup

### Task 7: Configure Vitest

**Files:**
- Modify: `manpads-control/package.json`
- Create: `manpads-control/vitest.config.ts`

- [ ] **Step 1: Add vitest to package.json**

```bash
cd manpads-control && npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/lib/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
        },
    },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to scripts:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/package.json manpads-control/vitest.config.ts
git commit -m "feat: add vitest for TypeScript testing"
```

---

## Verification

### Final Verification

- [ ] Run Rust tests: `cargo test --lib`
- [ ] Run TypeScript tests: `npx vitest run`
- [ ] Verify both Rocket and Launcher firmware compile
- [ ] Run linter: `npm run lint`
- [ ] Run typecheck: `npm run typecheck`

---

## Notes

- Command queue implementation deferred to Phase 1B follow-up
- Serial port support (tauri-plugin-serial) deferred to Phase 2
- State machine for launcher control deferred to medium-priority items