use crate::lib::{TelemetryMessage, ControlCommand};
use tracing::debug;

pub fn parse_telemetry(line: &str) -> Option<TelemetryMessage> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }

    let parts: Vec<&str> = line.split(',').collect();
    if parts.is_empty() {
        return None;
    }

    match parts[0] {
        "ROCKET" => {
            if parts.len() >= 5 {
                Some(TelemetryMessage::Rocket {
                    timestamp_ms: parts[1].parse().unwrap_or(0),
                    roll_deg: parts[2].parse().unwrap_or(0.0),
                    rotation_rate: parts[3].parse().unwrap_or(0.0),
                    servo_output: parts[4].parse().unwrap_or(0),
                })
            } else {
                None
            }
        }
        "STATUS" => {
            if parts.len() >= 5 {
                Some(TelemetryMessage::RocketStatus {
                    state: parts[1].to_string(),
                    kp: parts[2].parse().unwrap_or(0.0),
                    kd: parts[3].parse().unwrap_or(0.0),
                    skew: parts[4].parse().unwrap_or(0.0),
                })
            } else {
                None
            }
        }
        "LAUNCHER" => {
            if parts.len() >= 7 {
                Some(TelemetryMessage::Launcher {
                    latitude: parts[1].parse().unwrap_or(0.0),
                    longitude: parts[2].parse().unwrap_or(0.0),
                    altitude_m: parts[3].parse().unwrap_or(0.0),
                    pressure: parts[4].parse().unwrap_or(0.0),
                    temperature: parts[5].parse().unwrap_or(0.0),
                    heading: parts[6].parse().unwrap_or(0.0),
                })
            } else {
                None
            }
        }
        "HEADING" => {
            if parts.len() >= 2 {
                Some(TelemetryMessage::Launcher {
                    latitude: 0.0,
                    longitude: 0.0,
                    altitude_m: 0.0,
                    pressure: 0.0,
                    temperature: parts[1].parse().unwrap_or(0.0),
                    heading: parts[1].parse().unwrap_or(0.0),
                })
            } else {
                None
            }
        }
        "DEBUG" => {
            Some(TelemetryMessage::Debug {
                message: parts.get(1).unwrap_or(&"").to_string(),
            })
        }
        _ => {
            debug!("Unknown telemetry prefix: {}", parts[0]);
            None
        }
    }
}

pub fn serialize_command(cmd: &ControlCommand) -> String {
    match cmd {
        ControlCommand::UpdatePid { kp, kd } => {
            format!("PID,{},{}\n", kp, kd)
        }
        ControlCommand::Launch => "LAUNCH\n".to_string(),
        ControlCommand::Calibrate => "CALIBRATE\n".to_string(),
        ControlCommand::EmergencyStop => "ESTOP\n".to_string(),
        ControlCommand::Arm => "ARM\n".to_string(),
        ControlCommand::Disarm => "DISARM\n".to_string(),
        ControlCommand::Heartbeat => "PING\n".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_rocket_telemetry() {
        let input = "ROCKET,12345,45.5,12.3,100";
        let result = parse_telemetry(input);
        match result {
            Some(TelemetryMessage::Rocket { timestamp_ms, roll_deg, rotation_rate, servo_output }) => {
                assert_eq!(timestamp_ms, 12345);
                assert_eq!(roll_deg, 45.5);
                assert_eq!(rotation_rate, 12.3);
                assert_eq!(servo_output, 100);
            }
            _ => panic!("Expected Rocket telemetry"),
        }
    }

    #[test]
    fn test_parse_launcher_telemetry() {
        let input = "LAUNCHER,37.7749,-122.4194,100.5,1013.25,25.0,180.0";
        let result = parse_telemetry(input);
        match result {
            Some(TelemetryMessage::Launcher { latitude, longitude, altitude_m, pressure, temperature, heading }) => {
                assert_eq!(latitude, 37.7749);
                assert_eq!(longitude, -122.4194);
                assert_eq!(altitude_m, 100.5);
                assert_eq!(pressure, 1013.25);
                assert_eq!(temperature, 25.0);
                assert_eq!(heading, 180.0);
            }
            _ => panic!("Expected Launcher telemetry"),
        }
    }

    #[test]
    fn test_serialize_pid_command() {
        let cmd = ControlCommand::UpdatePid { kp: 1.5, kd: 0.8 };
        let result = serialize_command(&cmd);
        assert_eq!(result, "PID,1.5,0.8\n");
    }

    #[test]
    fn test_serialize_launch_command() {
        let cmd = ControlCommand::Launch;
        let result = serialize_command(&cmd);
        assert_eq!(result, "LAUNCH\n");
    }
}