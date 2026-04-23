'use client';

import { useEffect, useCallback } from 'react';
import { useTelemetryStore } from '@/store/telemetry';

export function useKeyboardShortcuts() {
  const { sendCommand, connectionStatus, activeRocketId, disconnect } = useTelemetryStore();
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const isMod = event.metaKey || event.ctrlKey;
    
    if (isMod && event.key === 'l') {
      event.preventDefault();
      if (connectionStatus === 'connected' && activeRocketId) {
        sendCommand(activeRocketId, 'launch');
      }
    }
    
    if (event.key === 'Escape') {
      event.preventDefault();
      if (connectionStatus === 'connected' && activeRocketId) {
        sendCommand(activeRocketId, 'emergency_stop');
      }
    }
    
    if (isMod && event.key === 'd') {
      event.preventDefault();
      if (connectionStatus === 'connected' && activeRocketId) {
        disconnect(activeRocketId);
      }
    }
  }, [sendCommand, disconnect, connectionStatus, activeRocketId]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function KeyboardShortcutsHelp() {
  return (
    <div className="fixed bottom-20 right-6 z-40 p-4 card text-sm opacity-80 hover:opacity-100 transition-opacity">
      <h4 className="label-mono mb-2">Keyboard Shortcuts</h4>
      <div className="space-y-1 text-text-secondary">
        <div className="flex justify-between gap-4">
          <span>Launch</span>
          <kbd className="font-mono text-xs bg-background-deep px-2 py-0.5 rounded">⌘L</kbd>
        </div>
        <div className="flex justify-between gap-4">
          <span>Emergency Stop</span>
          <kbd className="font-mono text-xs bg-background-deep px-2 py-0.5 rounded">Esc</kbd>
        </div>
        <div className="flex justify-between gap-4">
          <span>Disconnect</span>
          <kbd className="font-mono text-xs bg-background-deep px-2 py-0.5 rounded">⌘D</kbd>
        </div>
      </div>
    </div>
  );
}