'use client';

import { useState, useEffect } from 'react';
import type { LauncherState } from '@/lib/types';
import { useTelemetryStore } from '@/store/telemetry';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type WizardStep = 'idle' | 'test' | 'arm' | 'launch' | 'complete';

export function LaunchWizard() {
  const { sendCommand, connectionStatus, flightPhase } = useTelemetryStore();

const launcherState = useTelemetryStore((s) => {
    const activeId = s.activeRocketId;
    return activeId ? (s.rocketStates[activeId]?.launcherState || 'safe') : 'safe';
});

const stateColors: Record<LauncherState, string> = {
    safe: 'bg-gray-500',
    calibrating: 'bg-yellow-500',
    armed: 'bg-green-500',
    launching: 'bg-orange-500',
    firing: 'bg-red-500 animate-pulse',
    recovering: 'bg-blue-500',
    error: 'bg-red-700',
};
  
  const [step, setStep] = useState<WizardStep>('idle');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null);
  
  const isConnected = connectionStatus === 'connected';
  
  useEffect(() => {
    if (flightPhase !== 'idle' && flightPhase !== 'landed') {
      setStep('complete');
    }
  }, [flightPhase]);
  
  const runSystemTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTestResult('pass');
    setIsTesting(false);
    setStep('test');
  };
  
  const handleArm = async () => {
    await sendCommand('arm');
    setStep('arm');
  };
  
  const handleConfirmArm = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setStep('launch');
  };
  
  const handleLaunch = async () => {
    setCountdown(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(null);
    await sendCommand('launch');
    setStep('complete');
  };
  
  const handleReset = () => {
    setStep('idle');
    setTestResult(null);
    setCountdown(null);
  };
  
  return (
    <Card title="Launch Sequence">
      <div className="space-y-6">
        <div className="mb-4 p-2 rounded bg-surface border border-border">
            <span className="text-xs text-text-muted">Launcher State: </span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${stateColors[launcherState]}`}>
                {launcherState.toUpperCase()}
            </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'idle' && 'bg-border text-text-muted',
              step !== 'idle' && 'bg-brand-green text-background-deep'
            )}>
              1
            </div>
            <span className="text-sm text-text-primary">System Test</span>
          </div>
          {testResult === 'pass' && (
            <span className="text-brand-green text-sm">Pass</span>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'test' && 'bg-border text-text-muted',
              step === 'arm' && 'bg-yellow-500 text-background-deep',
              (step === 'idle' || step === 'launch' || step === 'complete') && 'bg-border text-text-muted',
            )}>
              2
            </div>
            <span className="text-sm text-text-primary">Arm System</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step !== 'launch' && 'bg-border text-text-muted',
              step === 'launch' && 'bg-crimson text-white',
              step === 'complete' && 'bg-brand-green text-background-deep'
            )}>
              3
            </div>
            <span className="text-sm text-text-primary">Launch</span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-border space-y-3">
          {step === 'idle' && (
            <Button 
              variant="primary" 
              className="w-full"
              onClick={runSystemTest}
              disabled={!isConnected || isTesting}
            >
              {isTesting ? 'Running Test...' : 'Start System Test'}
            </Button>
          )}
          
          {step === 'test' && (
            <>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={handleArm}
              >
                ARM
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-xs"
                onClick={() => setStep('idle')}
              >
                Back
              </Button>
            </>
          )}
          
          {step === 'arm' && (
            <>
              <Button 
                variant="danger" 
                className="w-full"
                onClick={handleConfirmArm}
              >
                CONFIRM ARM
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-xs"
                onClick={() => setStep('test')}
              >
                Cancel
              </Button>
            </>
          )}
          
          {step === 'launch' && (
            <div className="text-center">
              {countdown !== null ? (
                <div className="py-4">
                  <span className="text-6xl font-normal text-crimson">{countdown}</span>
                </div>
              ) : (
                <Button 
                  variant="danger" 
                  className="w-full"
                  onClick={handleLaunch}
                >
                  LAUNCH
                </Button>
              )}
            </div>
          )}
          
          {step === 'complete' && (
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}