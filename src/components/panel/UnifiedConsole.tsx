import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Terminal, Trash2, RefreshCw, Loader2, Send } from 'lucide-react';
import { vmApi } from '@/lib/vmApi';

interface UnifiedConsoleProps {
  panelId: string;
  panelStatus: string;
}

interface ConsoleLine {
  id: string;
  type: 'stdout' | 'stderr' | 'input' | 'output' | 'error';
  content: string;
  timestamp: number;
}

export function UnifiedConsole({ panelId, panelStatus }: UnifiedConsoleProps) {
  const [logLines, setLogLines] = useState<ConsoleLine[]>([]);
  const [commandLines, setCommandLines] = useState<ConsoleLine[]>([]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Strip ANSI escape codes and clean PM2 output
  const cleanLogLine = (line: string): string => {
    // Remove ANSI escape codes (both escaped and raw)
    let cleaned = line
      .replace(/\x1b\[[0-9;]*m/g, '')
      .replace(/\\x1b\[[0-9;]*m/g, '')
      .replace(/\[\d+m/g, '');
    // Remove PM2 prefix like "1|panel-39 | " or "2|panel-392b497c... | "
    cleaned = cleaned.replace(/^\d+\|panel-[a-z0-9-]+\s*\|\s*/i, '');
    return cleaned.trim();
  };

  const isMetadataLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    return (
      lower.includes('[tailing]') ||
      lower.includes('.pm2/logs/') ||
      lower.includes('last 200 lines') ||
      lower.includes('last 100 lines') ||
      line.trim() === ''
    );
  };

  const fetchLogs = async () => {
    if (panelStatus !== 'running') return;
    
    setLoading(true);
    try {
      const result = await vmApi.getLogs(panelId, 100);
      const now = Date.now();
      
      const outLines: ConsoleLine[] = result.logs?.out 
        ? result.logs.out.split('\n')
            .map(cleanLogLine)
            .filter(line => line && !isMetadataLine(line))
            .map((content, i) => ({
              id: `out-${now}-${i}`,
              type: 'stdout' as const,
              content,
              timestamp: now,
            }))
        : [];
      
      const errLines: ConsoleLine[] = result.logs?.err 
        ? result.logs.err.split('\n')
            .map(cleanLogLine)
            .filter(line => line && !isMetadataLine(line))
            .map((content, i) => ({
              id: `err-${now}-${i}`,
              type: 'stderr' as const,
              content,
              timestamp: now,
            }))
        : [];
      
      // Replace log lines entirely (PM2 gives us latest logs each time)
      setLogLines([...outLines, ...errLines]);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (panelStatus === 'running') {
      fetchLogs();
    } else {
      setLogLines([{
        id: 'welcome',
        type: 'stdout',
        content: 'iDev Host Console v1.0.0 - Panel is not running',
        timestamp: Date.now(),
      }]);
      setCommandLines([]);
    }
  }, [panelId, panelStatus]);

  useEffect(() => {
    if (!autoRefresh || panelStatus !== 'running') return;
    
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, panelStatus, panelId]);

  useEffect(() => {
    consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight);
  }, [logLines, commandLines]);

  const handleCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    const inputLine: ConsoleLine = {
      id: `cmd-${Date.now()}`,
      type: 'input',
      content: `$ ${trimmed}`,
      timestamp: Date.now(),
    };
    setCommandLines(prev => [...prev, inputLine]);
    setInput('');

    // Handle local commands
    if (trimmed === 'clear') {
      setLogLines([]);
      setCommandLines([]);
      return;
    }

    if (trimmed === 'help') {
      setCommandLines(prev => [...prev, {
        id: `help-${Date.now()}`,
        type: 'output',
        content: `Commands:
  help    - Show this help
  clear   - Clear console
  Any command will execute on the server`,
        timestamp: Date.now(),
      }]);
      return;
    }

    setExecuting(true);
    try {
      const result = await vmApi.exec(panelId, trimmed);
      
      if (result.stdout) {
        setCommandLines(prev => [...prev, {
          id: `stdout-${Date.now()}`,
          type: 'output',
          content: result.stdout,
          timestamp: Date.now(),
        }]);
      }
      
      if (result.stderr) {
        setCommandLines(prev => [...prev, {
          id: `stderr-${Date.now()}`,
          type: 'error',
          content: result.stderr,
          timestamp: Date.now(),
        }]);
      }
      
      if (!result.stdout && !result.stderr) {
        setCommandLines(prev => [...prev, {
          id: `empty-${Date.now()}`,
          type: 'output',
          content: '(no output)',
          timestamp: Date.now(),
        }]);
      }
    } catch (error: any) {
      setCommandLines(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      }]);
    }
    setExecuting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !executing) {
      handleCommand(input);
    }
  };

  const clearConsole = async () => {
    try {
      await vmApi.clearLogs(panelId);
      setLogLines([]);
      setCommandLines([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
      setLogLines([]);
      setCommandLines([]);
    }
  };

  const getLineColor = (type: ConsoleLine['type']) => {
    switch (type) {
      case 'input':
        return 'text-primary font-bold';
      case 'stderr':
      case 'error':
        return 'text-destructive';
      case 'output':
        return 'text-blue-400';
      case 'stdout':
      default:
        return 'text-green-400';
    }
  };

  // Combine logs and commands - logs first, then commands
  const allLines = [...logLines, ...commandLines];

  return (
    <div className="h-[calc(100vh-280px)] flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex-shrink-0 p-2 sm:p-3 border-b border-border/50 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-2 sm:gap-3">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium">Console</span>
          {panelStatus === 'running' && (
            <Badge variant="outline" className="text-xs">
              {autoRefresh ? 'Live' : 'Paused'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-2 ${autoRefresh ? 'text-success' : 'text-muted-foreground'}`}
          >
            <span className="hidden sm:inline">{autoRefresh ? 'Pause' : 'Resume'}</span>
            <span className="sm:hidden">{autoRefresh ? '⏸' : '▶'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading || panelStatus !== 'running'}
            className="px-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearConsole}
            className="px-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Console Output */}
      <div
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 font-mono text-xs sm:text-sm min-h-0"
        onClick={() => inputRef.current?.focus()}
      >
        {allLines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Terminal className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Console ready</p>
            <p className="text-xs mt-1">App output and command results appear here</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {allLines.map((line) => (
              <div
                key={line.id}
                className={`py-0.5 whitespace-pre-wrap break-all ${getLineColor(line.type)}`}
              >
                {line.content}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="flex-shrink-0 p-2 sm:p-3 border-t border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono text-sm">$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="flex-1 font-mono text-xs sm:text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8"
          />
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => handleCommand(input)} 
            disabled={executing}
            className="h-8 w-8"
          >
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
