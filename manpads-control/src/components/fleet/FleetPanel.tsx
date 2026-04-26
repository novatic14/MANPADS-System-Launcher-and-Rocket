'use client';

import { useState } from 'react';
import { useTelemetryStore, RocketDevice } from '@/store/telemetry';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function FleetPanel() {
  const { rockets, activeRocketId, setActiveRocket, addRocket, removeRocket } = useTelemetryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRocket, setNewRocket] = useState({ name: '', ip: '192.168.4.1', port: 4444 });
  
  const rocketList = Object.values(rockets);
  
  const handleAddRocket = () => {
    if (newRocket.name && newRocket.ip) {
      addRocket(newRocket);
      setNewRocket({ name: '', ip: '192.168.4.1', port: 4444 });
      setShowAddForm(false);
    }
  };
  
  return (
    <Card title="Fleet Management" actions={
      <button 
        onClick={() => setShowAddForm(!showAddForm)}
        className="btn-ghost text-sm"
        aria-label="Add rocket"
      >
        + Add
      </button>
    }>
      <div className="space-y-4">
        {showAddForm && (
          <div className="p-4 bg-background-deep rounded-card border border-border">
            <div className="space-y-3">
              <div>
                <label className="label-mono mb-1 block">Name</label>
                <input
                  type="text"
                  value={newRocket.name}
                  onChange={(e) => setNewRocket({ ...newRocket, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="Rocket Alpha"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-mono mb-1 block">IP</label>
                  <input
                    type="text"
                    value={newRocket.ip}
                    onChange={(e) => setNewRocket({ ...newRocket, ip: e.target.value })}
                    className="input-field w-full"
                    placeholder="192.168.4.1"
                  />
                </div>
                <div>
                  <label className="label-mono mb-1 block">Port</label>
                  <input
                    type="number"
                    value={newRocket.port}
                    onChange={(e) => setNewRocket({ ...newRocket, port: parseInt(e.target.value) })}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleAddRocket}>Add Rocket</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
        
        {rocketList.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>No rockets configured</p>
            <p className="text-sm mt-1">Click {"+ Add"} to register a rocket</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rocketList.map((rocket) => (
              <RocketCard
                key={rocket.id}
                rocket={rocket}
                isActive={activeRocketId === rocket.id}
                onSelect={() => setActiveRocket(rocket.id)}
                onRemove={() => removeRocket(rocket.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

interface RocketCardProps {
  rocket: RocketDevice;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function RocketCard({ rocket, isActive, onSelect, onRemove }: RocketCardProps) {
  const statusColors = {
    offline: 'bg-text-muted',
    connecting: 'bg-yellow-500 animate-pulse',
    online: 'bg-brand-green',
    error: 'bg-crimson',
  };
  
  return (
    <div
      className={cn(
        'p-3 rounded-card border transition-all cursor-pointer',
        isActive 
          ? 'border-brand-green bg-background-deep' 
          : 'border-border hover:border-border-prominent'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-selected={isActive}
      aria-label={`Select ${rocket.name}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn('status-indicator', statusColors[rocket.status])} />
          <div>
            <p className="font-medium text-text-primary">{rocket.name}</p>
            <p className="text-xs text-text-muted font-mono">{rocket.ip}:{rocket.port}</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-text-muted hover:text-crimson transition-colors"
          aria-label={`Remove ${rocket.name}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}