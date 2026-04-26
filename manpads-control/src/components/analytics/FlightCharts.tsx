'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TelemetryRecord } from '@/lib/types';
import { Card } from '@/components/ui/Card';

interface FlightChartProps {
  data: TelemetryRecord[];
  title: string;
}

export function FlightChart({ data, title }: FlightChartProps) {
  const chartData = useMemo(() => {
    return data.map((record) => ({
      time: record.timestamp_ms / 1000,
      roll: record.roll_deg,
      rotation: record.rotation_rate,
      altitude: record.altitude_m,
    }));
  }, [data]);
  
  return (
    <Card title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
            <XAxis 
              dataKey="time" 
              stroke="#898989"
              tickFormatter={(value) => `${value.toFixed(1)}s`}
            />
            <YAxis stroke="#898989" yAxisId="left" />
            <YAxis stroke="#898989" yAxisId="right" orientation="right" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f0f0f', 
                border: '1px solid #2e2e2e',
                borderRadius: '6px'
              }}
              labelFormatter={(value) => `Time: ${value.toFixed(2)}s`}
            />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="roll" 
              stroke="#3ecf8e" 
              dot={false}
              name="Roll (°)"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="rotation" 
              stroke="#00c573" 
              dot={false}
              name="Rotation (°/s)"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="altitude" 
              stroke="#fafafa" 
              dot={false}
              name="Altitude (m)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface TrajectoryChartProps {
  data: TelemetryRecord[];
}

export function TrajectoryChart({ data }: TrajectoryChartProps) {
  const chartData = useMemo(() => {
    return data.map((record) => ({
      lat: record.latitude,
      lon: record.longitude,
      alt: record.altitude_m,
    }));
  }, [data]);
  
  return (
    <Card title="Flight Trajectory">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
            <XAxis 
              dataKey="lon" 
              stroke="#898989"
              tickFormatter={(value) => value.toFixed(4)}
            />
            <YAxis 
              dataKey="lat" 
              stroke="#898989"
              tickFormatter={(value) => value.toFixed(4)}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f0f0f', 
                border: '1px solid #2e2e2e',
                borderRadius: '6px'
              }}
              labelFormatter={(value, payload) => {
                if (payload && payload[0]) {
                  return `Alt: ${payload[0].payload.alt.toFixed(1)}m`;
                }
                return '';
              }}
            />
            <Line 
              type="monotone" 
              dataKey="lat" 
              stroke="#3ecf8e" 
              dot={{ fill: '#3ecf8e', r: 2 }}
              name="Position"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}