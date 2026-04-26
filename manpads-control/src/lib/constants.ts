export const APP_NAME = 'MANPADS Control';
export const APP_VERSION = '1.0.0';

export const DEFAULT_IP = '192.168.4.1';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const DEFAULT_PORT = 4444;

export const CONNECTION_STATES = {
  disconnected: { color: 'bg-text-muted', label: 'Disconnected' },
  connecting: { color: 'bg-yellow-500', label: 'Connecting...' },
  connected: { color: 'bg-brand-green', label: 'Connected' },
  error: { color: 'bg-crimson', label: 'Error' },
} as const;

export const FLIGHT_PHASES = {
  idle: { color: 'bg-text-muted', label: 'IDLE' },
  armed: { color: 'bg-yellow-500', label: 'ARMED' },
  launching: { color: 'bg-orange-500', label: 'LAUNCHING' },
  'in-flight': { color: 'bg-brand-green', label: 'IN FLIGHT' },
  landed: { color: 'bg-blue-500', label: 'LANDED' },
} as const;

export const PID_LIMITS = {
  kp: { min: 0, max: 10, step: 0.01 },
  kd: { min: 0, max: 5, step: 0.01 },
} as const;

export const TELEMETRY_UPDATE_INTERVAL = 100;

export const EVENT_LOG_MAX_ENTRIES = 100;