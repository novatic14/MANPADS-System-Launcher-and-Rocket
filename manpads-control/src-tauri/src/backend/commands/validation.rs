use serde::Deserialize;
use crate::lib::AppError;

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