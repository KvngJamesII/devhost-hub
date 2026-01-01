import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Log {
  id: string;
  message: string;
  log_type: string;
  created_at: string;
}

interface LogsViewerProps {
  panelId: string;
}

export function LogsViewer({ panelId }: LogsViewerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime logs
    const channel = supabase
      .channel('panel-logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'panel_logs',
          filter: `panel_id=eq.${panelId}`,
        },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as Log]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [panelId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('panel_logs')
      .select('*')
      .eq('panel_id', panelId)
      .order('created_at', { ascending: true })
      .limit(500);

    if (!error && data) {
      setLogs(data as Log[]);
    }
    setLoading(false);
  };

  const clearLogs = async () => {
    const { error } = await supabase.from('panel_logs').delete().eq('panel_id', panelId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear logs',
        variant: 'destructive',
      });
    } else {
      setLogs([]);
      toast({
        title: 'Cleared',
        description: 'Logs have been cleared',
      });
    }
  };

  const downloadLogs = () => {
    const content = logs
      .map((log) => `[${new Date(log.created_at).toISOString()}] [${log.log_type.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `panel-logs-${panelId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
        return 'text-destructive';
      case 'warn':
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      default:
        return 'text-muted-foreground';
    }
  };

  const getLogBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive" className="text-xs px-1">{type}</Badge>;
      case 'warn':
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground text-xs px-1">{type}</Badge>;
      case 'success':
        return <Badge className="bg-success text-success-foreground text-xs px-1">{type}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1">{type}</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{logs.length} log entries</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadLogs} disabled={logs.length === 0}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs} disabled={logs.length === 0}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-auto p-3 bg-muted/30 font-mono text-xs">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No logs yet</p>
            <p className="text-xs mt-1">Logs will appear here when your panel is running</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 py-1 border-b border-border/50">
                <span className="text-muted-foreground shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
                {getLogBadge(log.log_type)}
                <span className={getLogColor(log.log_type)}>{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
