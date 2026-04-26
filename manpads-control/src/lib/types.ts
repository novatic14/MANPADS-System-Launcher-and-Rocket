export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type FlightPhase = 'idle' | 'armed' | 'launching' | 'in-flight' | 'landed';

export interface RocketTelemetry {
  timestamp_ms: number;
  roll_deg: number;
  rotation_rate: number;
  servo_output: number;
}

export interface LauncherTelemetry {
  latitude: number;
  longitude: number;
  altitude_m: number;
  pressure: number;
  temperature: number;
  heading: number;
}

export interface RocketStatus {
  state: FlightPhase;
  kp: number;
  kd: number;
  skew: number;
}

export interface TelemetryMessage {
  type: 'Rocket' | 'RocketStatus' | 'Launcher' | 'Debug';
  timestamp_ms?: number;
  roll_deg?: number;
  rotation_rate?: number;
  servo_output?: number;
  state?: string;
  kp?: number;
  kd?: number;
  skew?: number;
  latitude?: number;
  longitude?: number;
  altitude_m?: number;
  pressure?: number;
  temperature?: number;
  heading?: number;
  message?: string;
}

export interface ControlCommand {
  type: 'launch' | 'calibrate' | 'emergency_stop' | 'arm' | 'disarm' | 'update_pid';
  params?: {
    kp?: number;
    kd?: number;
  };
}

export interface EventLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
}

export interface FlightLog {
  id: number;
  timestamp: string;
  metadata: string | null;
}

export interface TelemetryRecord {
  id: number;
  flight_id: number;
  timestamp_ms: number;
  roll_deg: number;
  rotation_rate: number;
  servo_output: number;
  latitude: number;
  longitude: number;
  altitude_m: number;
}

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