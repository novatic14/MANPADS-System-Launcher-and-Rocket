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