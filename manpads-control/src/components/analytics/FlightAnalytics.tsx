'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FlightLog, TelemetryRecord } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FlightChart, TrajectoryChart } from '@/components/analytics/FlightCharts';
import { formatTimestamp } from '@/lib/utils';

export function FlightAnalytics() {
  const [flights, setFlights] = useState<FlightLog[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<number | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadFlights();
  }, []);
  
  const loadFlights = async () => {
    try {
      const result = await invoke<FlightLog[]>('get_flights');
      setFlights(result);
    } catch (error) {
      console.error('Failed to load flights:', error);
    }
  };
  
  const loadFlightData = async (flightId: number) => {
    setLoading(true);
    try {
      const result = await invoke<TelemetryRecord[]>('get_telemetry_data', { flightId });
      setTelemetryData(result);
      setSelectedFlight(flightId);
    } catch (error) {
      console.error('Failed to load telemetry:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const exportCsv = async (flightId: number) => {
    try {
      const csv = await invoke<string>('export_flight_csv', { flightId });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flight_${flightId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };
  
  const stats = telemetryData.length > 0 ? {
    maxAltitude: Math.max(...telemetryData.map(t => t.altitude_m)),
    maxRoll: Math.max(...telemetryData.map(t => Math.abs(t.roll_deg))),
    avgServo: telemetryData.reduce((sum, t) => sum + t.servo_output, 0) / telemetryData.length,
    duration: (telemetryData[telemetryData.length - 1]?.timestamp_ms - telemetryData[0]?.timestamp_ms) / 1000,
  } : null;
  
  return (
    <div className="space-y-6">
      <Card title="Flight History">
        <div className="space-y-2">
          {flights.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <p>No flight data recorded</p>
            </div>
          ) : (
            flights.map((flight) => (
              <div
                key={flight.id}
                className={`p-3 rounded-card border cursor-pointer transition-all ${
                  selectedFlight === flight.id 
                    ? 'border-brand-green bg-background-deep' 
                    : 'border-border hover:border-border-prominent'
                }`}
                onClick={() => loadFlightData(flight.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">Flight #{flight.id}</p>
                    <p className="text-xs text-text-muted">{flight.timestamp}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); exportCsv(flight.id); }}>
                    Export CSV
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      
      {selectedFlight && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Max Altitude" value={stats?.maxAltitude.toFixed(1)} unit="m" />
            <StatCard label="Max Roll" value={stats?.maxRoll.toFixed(1)} unit="°" />
            <StatCard label="Avg Servo" value={stats?.avgServo.toFixed(0)} unit="" />
            <StatCard label="Duration" value={stats?.duration.toFixed(1)} unit="s" />
          </div>
          
          <FlightChart data={telemetryData} title="Flight Telemetry" />
          <TrajectoryChart data={telemetryData} />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value?: string; unit: string }) {
  return (
    <Card>
      <div className="text-center">
        <span className="label-mono">{label}</span>
        <p className="text-2xl font-mono text-brand-green mt-1">
          {value ?? '—'}
          <span className="text-sm text-text-muted ml-1">{unit}</span>
        </p>
      </div>
    </Card>
  );
}