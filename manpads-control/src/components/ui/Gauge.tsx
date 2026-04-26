'use client';

import { cn } from '@/lib/utils';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Gauge({
  value,
  min,
  max,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
  size = 'md',
  className
}: GaugeProps) {
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;
  
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  };
  
  const valueSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  };
  
  const getStatusColor = () => {
    if (criticalThreshold !== undefined) {
      if (clampedValue >= criticalThreshold) return 'text-crimson';
      if (clampedValue >= warningThreshold!) return 'text-yellow-500';
    }
    return 'text-brand-green';
  };
  
  const strokeDashoffset = 251.2 - (percentage / 100) * 251.2;
  const isWarning = warningThreshold !== undefined && clampedValue >= warningThreshold;
  const isCritical = criticalThreshold !== undefined && clampedValue >= criticalThreshold;
  
  return (
    <div 
      className={cn('flex flex-col items-center', className)}
      role="meter"
      aria-label={label}
      aria-valuenow={clampedValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${clampedValue.toFixed(1)} ${unit}`}
    >
      <div className={cn('relative', sizeClasses[size])}>
        <svg 
          className="w-full h-full -rotate-90" 
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#363636"
            strokeWidth="6"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={isCritical ? '#ef4444' : '#3ecf8e'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="251.2"
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-live="polite"
        >
          <span className={cn('font-normal text-text-primary', valueSizeClasses[size])}>
            {clampedValue.toFixed(1)}
          </span>
          <span className="font-mono text-xs uppercase tracking-code text-text-muted">
            {unit}
          </span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <span 
          className={cn('label-mono', getStatusColor())}
          aria-label={`Status: ${isCritical ? 'Critical' : isWarning ? 'Warning' : 'Normal'}`}
        >
          {label}
        </span>
      </div>
    </div>
  );
}