'use client';

import { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function ConnectionPanel() {
  const { 
    connectionStatus, 
    connectionIp, 
    connectionPort,
    connect, 
    disconnect 
  } = useTelemetryStore();
  
  const [ip, setIp] = useState(connectionIp);
  const [port, setPort] = useState(connectionPort);
  
  const isConnected = connectionStatus === 'connected';
  
  return (
    <Card title="Connection">
      <div className="space-y-4">
        <div>
          <label className="label-mono mb-1 block">IP Address</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="input-field w-full"
            placeholder="192.168.4.1"
            disabled={isConnected}
          />
        </div>
        
        <div>
          <label className="label-mono mb-1 block">Port</label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value))}
            className="input-field w-full"
            placeholder="4444"
            disabled={isConnected}
          />
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <span className={cn(
            'status-indicator',
            connectionStatus === 'connected' && 'status-connected',
            connectionStatus === 'connecting' && 'status-warning',
            connectionStatus === 'disconnected' && 'status-disconnected',
            connectionStatus === 'error' && 'status-critical',
          )} />
          <span className="text-sm text-text-secondary">
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Error' : 'Disconnected'}
          </span>
        </div>
        
        <div className="pt-2">
          {isConnected ? (
            <Button 
              variant="danger" 
              className="w-full"
              onClick={disconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              variant="primary" 
              className="w-full"
              onClick={connect}
              disabled={connectionStatus === 'connecting'}
            >
              Connect
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}