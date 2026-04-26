'use client';

import { useState, useEffect } from 'react';
import { TelemetryDashboard } from '@/components/telemetry/TelemetryDashboard'
import { EventLog } from '@/components/telemetry/EventLog'
import { ConnectionPanel } from '@/components/control/ConnectionPanel'
import { PidEditor } from '@/components/control/PidEditor'
import { LaunchWizard } from '@/components/control/LaunchWizard'
import { EmergencyStopButton } from '@/components/control/EmergencyStopButton'
import { FleetPanel } from '@/components/fleet/FleetPanel'
import { FlightAnalytics } from '@/components/analytics/FlightAnalytics'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from '@/hooks/useKeyboardShortcuts'
import { Card } from '@/components/ui/Card'

export default function Home() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  useKeyboardShortcuts();
  
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-brand-green" />
              <h1 className="text-lg font-medium text-text-primary">MANPADS Control</h1>
            </div>
            <span className="text-xs font-mono uppercase tracking-code text-text-muted">
              Ground Station v1.0
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="btn-ghost text-xs text-text-muted hover:text-text-primary"
            >
              ⌨️ Shortcuts
            </button>
            <div className="flex items-center gap-2">
              <span className="status-indicator status-disconnected" id="connection-dot" />
              <span className="text-sm text-text-secondary" id="connection-text">Disconnected</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <TelemetryDashboard />
            <Card title="Event Log">
              <EventLog />
            </Card>
          </div>
          <div className="space-y-6">
            <FleetPanel />
            <ConnectionPanel />
            <PidEditor />
          </div>
          <div className="space-y-6">
            <LaunchWizard />
            <FlightAnalytics />
          </div>
        </div>
      </div>

      <EmergencyStopButton />
      {showShortcuts && <KeyboardShortcutsHelp />}
    </main>
  )
}