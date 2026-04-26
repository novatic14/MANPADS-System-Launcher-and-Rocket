'use client';

import { useState } from 'react';
import { useTelemetryStore } from '@/store/telemetry';
import { cn } from '@/lib/utils';

export function EventLog() {
  const { eventLog, clearEventLog } = useTelemetryStore();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredLogs = eventLog.filter((entry) => {
    if (filter !== 'all' && entry.level !== filter) return false;
    if (searchTerm && !entry.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="input-field w-48 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-24 text-sm"
          >
            <option value="all">All</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <button 
          onClick={clearEventLog}
          className="btn-ghost text-xs text-text-muted hover:text-text-primary"
        >
          Clear
        </button>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <p className="text-text-muted">No matching events</p>
        ) : (
          filteredLogs.map((entry) => (
            <div 
              key={entry.id}
              className="flex items-start gap-2 py-1 hover:bg-background-deep rounded px-2"
            >
              <span className="text-text-muted shrink-0">
                {entry.timestamp.toLocaleTimeString()}
              </span>
              <span className={cn(
                'shrink-0 uppercase w-12',
                entry.level === 'error' && 'text-crimson',
                entry.level === 'warning' && 'text-yellow-500',
                entry.level === 'info' && 'text-brand-green',
                entry.level === 'debug' && 'text-text-muted',
              )}>
                [{entry.level}]
              </span>
              <span className="text-text-secondary flex-1">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}