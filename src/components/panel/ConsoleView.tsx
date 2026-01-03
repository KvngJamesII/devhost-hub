import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { vmApi } from '@/lib/vmApi';

interface ConsoleViewProps {
  panelId: string;
  panelStatus: string;
}

export function ConsoleView({ panelId, panelStatus }: ConsoleViewProps) {
  const [logs, setLogs] = useState<{ out: string[]; err: string[] }>({ out: [], err: [] });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    if (panelStatus !== 'running') return;
    
    setLoading(true);
    try {
      const result = await vmApi.getLogs(panelId, 200);
      // Logs come as strings from PM2, split into lines
      const outLines = result.logs?.out ? result.logs.out.split('\n').filter(Boolean) : [];
      const errLines = result.logs?.err ? result.logs.err.split('\n').filter(Boolean) : [];
      setLogs({ out: outLines, err: errLines });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (panelStatus === 'running') {
      fetchLogs();
    }
  }, [panelId, panelStatus]);

  useEffect(() => {
    if (!autoRefresh || panelStatus !== 'running') return;
    
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, panelStatus, panelId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = async () => {
    try {
      await vmApi.clearLogs(panelId);
      setLogs({ out: [], err: [] });
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const allLogs = [
    ...logs.out.map(line => ({ type: 'out' as const, content: line })),
    ...logs.err.map(line => ({ type: 'err' as const, content: line })),
  ];

  return (
    <div className="h-full flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Console Output</span>
          {panelStatus === 'running' && (
            <Badge variant="outline" className="text-xs">
              {autoRefresh ? 'Live' : 'Paused'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-success' : 'text-muted-foreground'}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading || panelStatus !== 'running'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            disabled={panelStatus !== 'running'}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Console Output */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {panelStatus !== 'running' ? (
          <div className="text-center py-12 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Panel is not running</p>
            <p className="text-xs mt-1">Start the panel to see console output</p>
          </div>
        ) : loading && allLogs.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : allLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No console output yet</p>
            <p className="text-xs mt-1">Logs will appear here when your app outputs to stdout/stderr</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {allLogs.map((log, index) => (
              <div
                key={index}
                className={`py-0.5 whitespace-pre-wrap break-all ${
                  log.type === 'err' ? 'text-destructive' : 'text-green-400'
                }`}
              >
                {log.content}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
