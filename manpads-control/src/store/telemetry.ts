import { create } from 'zustand';
import { 
  RocketTelemetry, 
  LauncherTelemetry, 
  RocketStatus,
  ConnectionStatus,
  FlightPhase,
  EventLogEntry,
  TelemetryMessage,
  LauncherState,
  StateHistoryEntry
} from '@/lib/types';
import { DEFAULT_IP, DEFAULT_PORT } from '@/lib/constants';
import { generateId } from '@/lib/utils';
import { invoke } from '@tauri-apps/api/core';

export interface RocketDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: 'offline' | 'connecting' | 'online' | 'error';
  lastSeen: Date | null;
}

export interface RocketState {
  rocket: RocketTelemetry | null;
  launcher: LauncherTelemetry | null;
  rocketStatus: RocketStatus | null;
  connectionStatus: ConnectionStatus;
  flightPhase: FlightPhase;
  launcherState: LauncherState;
  stateHistory: StateHistoryEntry[];
}

interface TelemetryState {
  activeRocketId: string | null;
  rockets: Record<string, RocketDevice>;
  rocketStates: Record<string, RocketState>;
  eventLog: EventLogEntry[];
  
  addRocket: (rocket: Omit<RocketDevice, 'id' | 'status' | 'lastSeen'>) => void;
  removeRocket: (id: string) => void;
  updateRocketStatus: (id: string, status: RocketDevice['status']) => void;
  setActiveRocket: (id: string | null) => void;
  
  updateRocketState: (rocketId: string, data: Partial<RocketState>) => void;
  connect: (rocketId: string) => Promise<void>;
  disconnect: (rocketId: string) => Promise<void>;
  sendCommand: (rocketId: string, cmd: string, params?: Record<string, unknown>) => Promise<void>;
  updatePid: (rocketId: string, kp: number, kd: number) => Promise<void>;
  
  addEvent: (level: EventLogEntry['level'], message: string) => void;
  clearEventLog: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  activeRocketId: null,
  rockets: {},
  rocketStates: {},
  eventLog: [],
  
  addRocket: (rocketData) => {
    const id = generateId();
    const rocket: RocketDevice = {
      ...rocketData,
      id,
      status: 'offline',
      lastSeen: null,
    };
    set((state) => ({
      rockets: { ...state.rockets, [id]: rocket },
      rocketStates: {
        ...state.rocketStates,
        [id]: {
          rocket: null,
          launcher: null,
          rocketStatus: null,
          connectionStatus: 'disconnected',
          flightPhase: 'idle',
          launcherState: 'safe',
          stateHistory: [],
        }
      }
    }));
  },
  
  removeRocket: (id) => {
    set((state) => {
      const { [id]: _, ...remainingRockets } = state.rockets;
      const { [id]: __, ...remainingStates } = state.rocketStates;
      return {
        rockets: remainingRockets,
        rocketStates: remainingStates,
        activeRocketId: state.activeRocketId === id ? null : state.activeRocketId,
      };
    });
  },
  
  updateRocketStatus: (id, status) => {
    set((state) => ({
      rockets: {
        ...state.rockets,
        [id]: { ...state.rockets[id], status, lastSeen: status === 'online' ? new Date() : state.rockets[id].lastSeen }
      }
    }));
  },
  
  setActiveRocket: (id) => {
    set({ activeRocketId: id });
  },
  
  updateRocketState: (rocketId, data) => {
    set((state) => ({
      rocketStates: {
        ...state.rocketStates,
        [rocketId]: { ...state.rocketStates[rocketId], ...data }
      }
    }));
  },
  
  connect: async (rocketId) => {
    const { rockets, addEvent, updateRocketStatus, updateRocketState } = get();
    const rocket = rockets[rocketId];
    
    if (!rocket) return;
    
    updateRocketStatus(rocketId, 'connecting');
    addEvent('info', `Connecting to ${rocket.name} (${rocket.ip}:${rocket.port})...`);
    
    try {
      await invoke('connect', { ip: rocket.ip, port: rocket.port });
      await invoke('start_telemetry_stream');
      
      updateRocketStatus(rocketId, 'online');
      updateRocketState(rocketId, { connectionStatus: 'connected' });
      addEvent('info', `Connected to ${rocket.name}`);
    } catch (error) {
      updateRocketStatus(rocketId, 'error');
      updateRocketState(rocketId, { connectionStatus: 'error' });
      addEvent('error', `Connection failed: ${error}`);
    }
  },
  
  disconnect: async (rocketId) => {
    const { rockets, addEvent, updateRocketStatus, updateRocketState } = get();
    
    try {
      await invoke('stop_telemetry_stream');
      await invoke('disconnect');
      
      updateRocketStatus(rocketId, 'offline');
      updateRocketState(rocketId, {
        connectionStatus: 'disconnected',
        rocket: null,
        launcher: null,
        rocketStatus: null,
        flightPhase: 'idle'
      });
      addEvent('info', `Disconnected from ${rockets[rocketId]?.name}`);
    } catch (error) {
      addEvent('error', `Disconnect failed: ${error}`);
    }
  },
  
  sendCommand: async (rocketId, cmd, params) => {
    const { rocketStates, addEvent } = get();
    const state = rocketStates[rocketId];
    
    if (state?.connectionStatus !== 'connected') {
      addEvent('warning', 'Cannot send command: not connected');
      return;
    }
    
    try {
      await invoke('send_command', { cmdType: cmd, params });
      addEvent('info', `Command sent: ${cmd}`);
    } catch (error) {
      addEvent('error', `Command failed: ${error}`);
    }
  },
  
  updatePid: async (rocketId, kp, kd) => {
    const { rocketStates, addEvent } = get();
    const state = rocketStates[rocketId];
    
    if (state?.connectionStatus !== 'connected') {
      addEvent('warning', 'Cannot update PID: not connected');
      return;
    }
    
    try {
      await invoke('update_pid', { kp, kd });
      addEvent('info', `PID updated: kp=${kp.toFixed(2)}, kd=${kd.toFixed(2)}`);
    } catch (error) {
      addEvent('error', `PID update failed: ${error}`);
    }
  },
  
  addEvent: (level, message) => {
    set((state) => ({
      eventLog: [
        { id: generateId(), timestamp: new Date(), level, message },
        ...state.eventLog.slice(0, 99)
      ]
    }));
  },
  
  clearEventLog: () => {
    set({ eventLog: [] });
  },
}));

export function initializeTelemetryListener() {
  const { payloadHandler } = require('@tauri-apps/api/event');
  
  payloadHandler<TelemetryMessage>('telemetry:update', (event) => {
    const store = useTelemetryStore.getState();
    const { activeRocketId } = store;
    const payload = event.payload;
    
    if (!activeRocketId) return;
    
    const state = store.rocketStates[activeRocketId];
    if (!state) return;
    
    switch (payload.type) {
      case 'Rocket':
        store.addEvent('debug', `Roll: ${payload.roll_deg?.toFixed(1)}°`);
        store.updateRocketState(activeRocketId, {
          rocket: {
            timestamp_ms: payload.timestamp_ms || 0,
            roll_deg: payload.roll_deg || 0,
            rotation_rate: payload.rotation_rate || 0,
            servo_output: payload.servo_output || 0,
          }
        });
        break;
        
      case 'RocketStatus':
        const flightPhase = (payload.state as FlightPhase) || 'idle';
        store.updateRocketState(activeRocketId, {
          rocketStatus: {
            state: flightPhase,
            kp: payload.kp || 0,
            kd: payload.kd || 0,
            skew: payload.skew || 0,
          },
          flightPhase,
        });
        break;
        
      case 'Launcher':
        store.updateRocketState(activeRocketId, {
          launcher: {
            latitude: payload.latitude || 0,
            longitude: payload.longitude || 0,
            altitude_m: payload.altitude_m || 0,
            pressure: payload.pressure || 0,
            temperature: payload.temperature || 0,
            heading: payload.heading || 0,
          }
        });
        break;
        
      case 'Debug':
        store.addEvent('debug', payload.message || '');
        break;

      case 'launcher_state':
      case 'StateChanged': {
        const fromState = (payload as any).from || 'safe';
        const toState = (payload as any).to || 'safe';
        const timestamp_ms = (payload as any).timestamp_ms || Date.now();
        const stateHistory = [...(store.rocketStates[activeRocketId]?.stateHistory || []), {
          from: fromState,
          to: toState,
          timestamp: new Date(timestamp_ms)
        }];
        store.updateRocketState(activeRocketId, {
          launcherState: toState,
          stateHistory
        });
        store.addEvent('info', `State: ${fromState} → ${toState}`);
        break;
      }
    }
  });
}