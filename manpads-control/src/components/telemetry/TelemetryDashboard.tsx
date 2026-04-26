'use client';

import { useTelemetryStore } from '@/store/telemetry';
import { Card } from '@/components/ui/Card';
import { Gauge } from '@/components/ui/Gauge';
import { formatDegrees, formatAltitude, formatCoordinates } from '@/lib/utils';

export function TelemetryDashboard() {
  const { rocket, launcher, rocketStatus } = useTelemetryStore();
  
  return (
    <div className="space-y-6">
      <Card title="Rocket Telemetry">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Gauge
            value={rocket?.roll_deg ?? 0}
            min={-180}
            max={180}
            label="Roll Angle"
            unit="deg"
            criticalThreshold={90}
          />
          <Gauge
            value={rocket?.rotation_rate ?? 0}
            min={-500}
            max={500}
            label="Rotation Rate"
            unit="°/s"
            criticalThreshold={400}
          />
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center">
              <span className="text-3xl font-normal text-text-primary">
                {rocket?.servo_output ?? 0}
              </span>
            </div>
            <div className="mt-3 text-center">
              <span className="label-mono text-brand-green">Servo Output</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full border-4 border-border flex items-center justify-center">
              <span className="text-2xl font-normal text-text-primary">
                {rocketStatus?.state?.toUpperCase() ?? 'IDLE'}
              </span>
            </div>
            <div className="mt-3 text-center">
              <span className="label-mono text-brand-green">Flight State</span>
            </div>
          </div>
        </div>
        
        {rocketStatus && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="label-mono">Kp</span>
                <p className="text-lg font-mono text-text-primary">{rocketStatus.kp.toFixed(2)}</p>
              </div>
              <div>
                <span className="label-mono">Kd</span>
                <p className="text-lg font-mono text-text-primary">{rocketStatus.kd.toFixed(2)}</p>
              </div>
              <div>
                <span className="label-mono">Skew</span>
                <p className="text-lg font-mono text-text-primary">{rocketStatus.skew.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
      </Card>
      
      <Card title="Launcher Telemetry">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="label-mono">GPS Coordinates</span>
            <p className="text-lg font-mono text-text-primary">
              {launcher 
                ? formatCoordinates(launcher.latitude, launcher.longitude)
                : '—'}
            </p>
          </div>
          <div className="space-y-2">
            <span className="label-mono">Altitude</span>
            <p className="text-lg font-mono text-text-primary">
              {launcher ? formatAltitude(launcher.altitude_m) : '—'}
            </p>
          </div>
          <div className="space-y-2">
            <span className="label-mono">Heading</span>
            <p className="text-lg font-mono text-text-primary">
              {launcher ? formatDegrees(launcher.heading) : '—'}
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="label-mono">Pressure</span>
              <p className="text-lg font-mono text-text-primary">
                {launcher ? `${launcher.pressure.toFixed(2)} hPa` : '—'}
              </p>
            </div>
            <div>
              <span className="label-mono">Temperature</span>
              <p className="text-lg font-mono text-text-primary">
                {launcher ? `${launcher.temperature.toFixed(1)} °C` : '—'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}