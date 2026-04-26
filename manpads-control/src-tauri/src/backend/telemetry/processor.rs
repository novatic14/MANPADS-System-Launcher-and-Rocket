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