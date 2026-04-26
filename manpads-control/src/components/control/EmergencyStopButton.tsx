'use client';

import { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry';
import { cn } from '@/lib/utils';

export function EmergencyStopButton() {
  const { sendCommand, connectionStatus } = useTelemetryStore();
  const [confirmVisible, setConfirmVisible] = useState(false);
  
  const isConnected = connectionStatus === 'connected';
  
  const handleClick = () => {
    if (confirmVisible) {
      sendCommand('emergency_stop');
      setConfirmVisible(false);
    } else {
      setConfirmVisible(true);
      setTimeout(() => setConfirmVisible(false), 3000);
    }
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {confirmVisible && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-background-deep border border-crimson rounded-card">
          <p className="text-sm text-text-primary mb-2">Confirm Emergency Stop?</p>
          <p className="text-xs text-text-muted">Click again to confirm</p>
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={!isConnected}
        className={cn(
          'px-6 py-3 rounded-pill font-medium text-sm transition-all duration-200',
          'border-2 border-crimson',
          isConnected 
            ? 'bg-crimson text-white hover:bg-crimson-dark' 
            : 'bg-crimson/50 text-white/50 cursor-not-allowed'
        )}
      >
        {confirmVisible ? 'CONFIRM ESTOP' : 'EMERGENCY STOP'}
      </button>
    </div>
  );
}