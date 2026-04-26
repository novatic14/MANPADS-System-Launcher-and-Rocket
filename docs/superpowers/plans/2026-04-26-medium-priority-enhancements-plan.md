# MANPADS Medium-Priority Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement multi-threading, debounced UI, telemetry optimization, logging, and binary optimization.

**Architecture:** Phase 1: Backend enhancements (threading, logging, binary). Phase 2: Frontend enhancements (debounce, telemetry). Phase 3: Tests and verification.

**Tech Stack:** Rust (rayon, tracing), TypeScript (Next.js), Vitest

---

## File Map

| File | Responsibility |
|------|----------------|
| `src-tauri/Cargo.toml` | Add rayon dependency |
| `src-tauri/src/backend/telemetry/processor.rs` | Multi-threaded telemetry processing |
| `src-tauri/src/backend/logging.rs` | Thread-safe logging setup |
| `src/lib/hooks/useDebouncedCallback.ts` | Debounce hook |
| `src/lib/hooks/useThrottleCallback.ts` | Throttle hook |
| `src-tauri/src/backend/commands/telemetry.rs` | Optimize telemetry commands |
| `manpads-control/package.json` | Add testing deps |

---

## Task 1: Add Rayon for Multi-threading

**Files:**
- Modify: `manpads-control/src-tauri/Cargo.toml`

- [ ] **Step 1: Add rayon dependency**

Add to `[dependencies]` in Cargo.toml:
```toml
rayon = "1.8"
```

- [ ] **Step 2: Verify compilation**

```bash
cd /Users/pallabpc/Desktop/MANPADS-System-Launcher-and-Rocket/manpads-control/src-tauri
cargo check 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add manpads-control/src-tauri/Cargo.toml
git commit -m "deps: add rayon for parallel processing"
```

---

## Task 2: Create Telemetry Processor

**Files:**
- Create: `manpads-control/src-tauri/src/backend/telemetry/processor.rs`
- Create: `manpads-control/src-tauri/src/backend/telemetry/mod.rs`

- [ ] **Step 1: Create telemetry module**

Create directory and files:

```bash
mkdir -p manpads-control/src-tauri/src/backend/telemetry
```

```rust
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use crate::lib::TelemetryMessage;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedTelemetry {
    pub roll_deg: f32,
    pub rotation_rate: f32,
    pub servo_output: i32,
    pub altitude_m: f32,
    pub is_valid: bool,
}

pub fn process_telemetry_batch(messages: &[TelemetryMessage]) -> Vec<ProcessedTelemetry> {
    messages
        .par_iter()
        .map(|msg| process_single_telemetry(msg))
        .collect()
}

fn process_single_telemetry(msg: &TelemetryMessage) -> ProcessedTelemetry {
    match msg {
        TelemetryMessage::Rocket { roll_deg, rotation_rate, servo_output, .. } => {
            ProcessedTelemetry {
                roll_deg: *roll_deg,
                rotation_rate: *rotation_rate,
                servo_output: *servo_output,
                altitude_m: 0.0,
                is_valid: roll_deg.is_finite() && rotation_rate.is_finite(),
            }
        }
        TelemetryMessage::Launcher { altitude_m, .. } => {
            ProcessedTelemetry {
                roll_deg: 0.0,
                rotation_rate: 0.0,
                servo_output: 0,
                altitude_m: *altitude_m,
                is_valid: altitude_m.is_finite(),
            }
        }
        _ => ProcessedTelemetry {
            roll_deg: 0.0,
            rotation_rate: 0.0,
            servo_output: 0,
            altitude_m: 0.0,
            is_valid: false,
        },
    }
}

pub fn filter_valid_telemetry(telemetry: &[ProcessedTelemetry]) -> Vec<&ProcessedTelemetry> {
    telemetry.par_iter().filter(|t| t.is_valid).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_rocket_telemetry() {
        let msg = TelemetryMessage::Rocket {
            timestamp_ms: 1000,
            roll_deg: 45.0,
            rotation_rate: 10.0,
            servo_output: 5,
        };
        let result = process_single_telemetry(&msg);
        assert!(result.is_valid);
        assert_eq!(result.roll_deg, 45.0);
    }

    #[test]
    fn test_process_launcher_telemetry() {
        let msg = TelemetryMessage::Launcher {
            latitude: 40.0,
            longitude: -74.0,
            altitude_m: 100.0,
            pressure: 1013.0,
            temperature: 20.0,
            heading: 180.0,
        };
        let result = process_single_telemetry(&msg);
        assert!(result.is_valid);
        assert_eq!(result.altitude_m, 100.0);
    }

    #[test]
    fn test_filter_valid_telemetry() {
        let telemetry = vec![
            ProcessedTelemetry { roll_deg: 0.0, rotation_rate: 0.0, servo_output: 0, altitude_m: 0.0, is_valid: true },
            ProcessedTelemetry { roll_deg: 0.0, rotation_rate: 0.0, servo_output: 0, altitude_m: 0.0, is_valid: false },
            ProcessedTelemetry { roll_deg: 0.0, rotation_rate: 0.0, servo_output: 0, altitude_m: 0.0, is_valid: true },
        ];
        let valid = filter_valid_telemetry(&telemetry);
        assert_eq!(valid.len(), 2);
    }
}
```

- [ ] **Step 2: Create telemetry/mod.rs**

```rust
pub mod processor;

pub use processor::{ProcessedTelemetry, process_telemetry_batch, filter_valid_telemetry};
```

- [ ] **Step 3: Add to backend mod.rs**

Modify `src-tauri/src/backend/mod.rs`:
```rust
pub mod commands;
pub mod state;
pub mod storage;
pub mod telemetry;
pub mod udp;
```

- [ ] **Step 4: Run tests**

```bash
cargo test --lib telemetry 2>&1 | tail -15
```

- [ ] **Step 5: Commit**

```bash
git add manpads-control/src-tauri/src/backend/telemetry manpads-control/src-tauri/src/backend/mod.rs
git commit -m "feat: add multi-threaded telemetry processing with rayon"
```

---

## Task 3: Thread-Safe Logging Setup

**Files:**
- Create: `manpads-control/src-tauri/src/backend/logging.rs`
- Modify: `manpads-control/src-tauri/src/lib.rs` (add logging command)

- [ ] **Step 1: Create logging.rs**

```rust
use std::path::PathBuf;
use std::sync::Mutex;
use tracing::{info, error, warn, Level};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

lazy_static::lazy_static! {
    static ref LOG_FILE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
}

pub fn init_logging(log_dir: Option<PathBuf>) -> Result<(), String> {
    if let Some(dir) = &log_dir {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        let log_path = dir.join("manpads.log");
        *LOG_FILE_PATH.lock().unwrap() = Some(log_path.clone());
    }

    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    let subscriber = tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_target(true));

    if let Some(path) = LOG_FILE_PATH.lock().unwrap().as_ref() {
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|e| e.to_string())?;
        let file_layer = fmt::layer()
            .with_writer(Mutex::new(file))
            .with_ansi(false)
            .with_target(true);
        subscriber.with(file_layer).init();
    } else {
        subscriber.init();
    }

    info!("Logging initialized");
    Ok(())
}

pub fn log_state_transition(from: &str, to: &str) {
    info!("STATE_TRANSITION: {} -> {}", from, to);
}

pub fn log_command(cmd: &str, params: Option<&str>) {
    if let Some(p) = params {
        info!("COMMAND: {} with params {}", cmd, p);
    } else {
        info!("COMMAND: {}", cmd);
    }
}

pub fn log_error(context: &str, error: &str) {
    error!("ERROR [{}]: {}", context, error);
}

pub fn log_telemetry(packet_count: usize, valid_count: usize) {
    info!("TELEMETRY: {} packets, {} valid", packet_count, valid_count);
}
```

- [ ] **Step 2: Update lib.rs to export logging**

Add to `lib.rs`:
```rust
pub mod logging;

pub use logging::{init_logging, log_state_transition, log_command, log_error, log_telemetry};
```

- [ ] **Step 3: Verify compilation**

```bash
cargo check 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/src-tauri/src/backend/logging.rs manpads-control/src-tauri/src/lib.rs
git commit -m "feat: add thread-safe logging infrastructure"
```

---

## Task 4: Debounced Callback Hook

**Files:**
- Create: `manpads-control/src/lib/hooks/useDebouncedCallback.ts`
- Create: `manpads-control/src/lib/hooks/useThrottleCallback.ts`

- [ ] **Step 1: Create hooks directory and useDebouncedCallback.ts**

```bash
mkdir -p manpads-control/src/lib/hooks
```

```typescript
import { useCallback, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]) as T;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);

    return debouncedValue;
}
```

- [ ] **Step 2: Create useThrottleCallback.ts**

```typescript
import { useCallback, useRef } from 'react';

export function useThrottleCallback<T extends (...args: unknown[]) => unknown>(
    callback: T,
    delay: number
): T {
    const lastCallRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        const now = Date.now();
        const remaining = delay - (now - lastCallRef.current);

        if (remaining <= 0) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            lastCallRef.current = now;
            callback(...args);
        } else if (!timeoutRef.current) {
            timeoutRef.current = setTimeout(() => {
                lastCallRef.current = Date.now();
                timeoutRef.current = null;
                callback(...args);
            }, remaining);
        }
    }, [callback, delay]) as T;
}
```

- [ ] **Step 3: Create index.ts for hooks**

```typescript
export { useDebouncedCallback, useDebouncedValue } from './useDebouncedCallback';
export { useThrottleCallback } from './useThrottleCallback';
```

- [ ] **Step 4: Add tests**

Create `manpads-control/src/lib/hooks/__tests__/hooks.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from '../useDebouncedCallback';

describe('useDebouncedCallback', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should debounce callback execution', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 500));

        act(() => {
            result.current();
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on repeated calls', () => {
        const callback = vi.fn();
        const { result } = renderHook(() => useDebouncedCallback(callback, 500));

        act(() => {
            result.current();
        });
        act(() => {
            vi.advanceTimersByTime(200);
            result.current();
        });
        act(() => {
            vi.advanceTimersByTime(200);
            result.current();
        });

        expect(callback).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(callback).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 5: Run tests**

```bash
cd manpads-control && npx vitest run src/lib/hooks/__tests__/hooks.test.ts 2>&1
```

- [ ] **Step 6: Commit**

```bash
git add manpads-control/src/lib/hooks
git commit -m "feat: add debounce and throttle hooks for UI actions"
```

---

## Task 5: Apply Binary Size Optimizations

**Files:**
- Modify: `manpads-control/src-tauri/Cargo.toml`

- [ ] **Step 1: Update release profile**

Modify the `[profile.release]` section in Cargo.toml:

```toml
[profile.release]
opt-level = "z"        # Optimize for size
lto = true             # Enable Link-Time Optimization
codegen-units = 1      # Reduce parallel codegen for better optimization
panic = "abort"        # Remove panic unwinding code
strip = true           # Strip debug symbols
```

- [ ] **Step 2: Verify the changes**

```bash
grep -A5 "\[profile.release\]" manpads-control/src-tauri/Cargo.toml
```

- [ ] **Step 3: Commit**

```bash
git add manpads-control/src-tauri/Cargo.toml
git commit -m "perf: optimize binary size with LTO and opt-level=z"
```

---

## Task 6: Add Code Quality Tools

**Files:**
- Modify: `manpads-control/package.json`

- [ ] **Step 1: Add lint-staged and husky**

```bash
cd manpads-control && npm install -D lint-staged
```

- [ ] **Step 2: Update package.json scripts**

Add to scripts:
```json
"prepare": "husky install"
```

Add to package.json:
```json
"lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.rs": ["rustfmt --edition 2021"]
}
```

- [ ] **Step 3: Create .husky/pre-commit hook**

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

- [ ] **Step 4: Commit**

```bash
git add manpads-control/package.json manpads-control/package-lock.json
git add manpads-control/.husky
git commit -m "chore: add lint-staged and husky for code quality"
```

---

## Verification

- [ ] Run Rust tests: `cargo test --lib`
- [ ] Run TypeScript tests: `npx vitest run`
- [ ] Verify binary size: `cargo build --release` (check size with `ls -lh`)
- [ ] Run linter: `npm run lint`