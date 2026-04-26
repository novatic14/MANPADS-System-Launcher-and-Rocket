'use client';

import { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PID_LIMITS } from '@/lib/constants';

export function PidEditor() {
  const { rocketStatus, updatePid, connectionStatus } = useTelemetryStore();
  
  const [kp, setKp] = useState(rocketStatus?.kp ?? 1.0);
  const [kd, setKd] = useState(rocketStatus?.kd ?? 0.5);
  const [isSaving, setIsSaving] = useState(false);
  
  const isConnected = connectionStatus === 'connected';
  
  const handleSave = async () => {
    setIsSaving(true);
    await updatePid(kp, kd);
    setIsSaving(false);
  };
  
  return (
    <Card title="PID Controller">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="label-mono">Proportional (Kp)</label>
            <span className="font-mono text-text-primary">{kp.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={PID_LIMITS.kp.min}
            max={PID_LIMITS.kp.max}
            step={PID_LIMITS.kp.step}
            value={kp}
            onChange={(e) => setKp(parseFloat(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
            disabled={!isConnected}
          />
          <div className="flex justify-between mt-1 text-xs text-text-muted">
            <span>{PID_LIMITS.kp.min}</span>
            <span>{PID_LIMITS.kp.max}</span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="label-mono">Derivative (Kd)</label>
            <span className="font-mono text-text-primary">{kd.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={PID_LIMITS.kd.min}
            max={PID_LIMITS.kd.max}
            step={PID_LIMITS.kd.step}
            value={kd}
            onChange={(e) => setKd(parseFloat(e.target.value))}
            className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer"
            disabled={!isConnected}
          />
          <div className="flex justify-between mt-1 text-xs text-text-muted">
            <span>{PID_LIMITS.kd.min}</span>
            <span>{PID_LIMITS.kd.max}</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border">
          <Button 
            variant="primary" 
            className="w-full"
            onClick={handleSave}
            disabled={!isConnected || isSaving}
          >
            {isSaving ? 'Saving...' : 'Apply PID'}
          </Button>
        </div>
      </div>
    </Card>
  );
}