import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Terminal as TerminalIcon, Wifi, WifiOff, Maximize2 } from 'lucide-react';

// AWS Premium Backend WebSocket URL
const PREMIUM_WS_URL = 'ws://56.228.75.32:3002';
const PREMIUM_API_KEY = 'idev-premium-secret-key-2026';

interface PremiumTerminalProps {
  panelId: string;
  isPremiumUser: boolean;
}

export function PremiumTerminal({ panelId, isPremiumUser }: PremiumTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !isPremiumUser) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#22c55e',
        cursor: '#22c55e',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#22c55e33',
        black: '#0a0a0a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f5f5f5',
        brightBlack: '#525252',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    // Fit terminal to container
    setTimeout(() => fitAddon.fit(), 0);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        // Send resize to server
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Welcome message
    term.writeln('\x1b[1;32m╔══════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;32m║\x1b[0m  \x1b[1;37miDev Host Premium Terminal\x1b[0m                  \x1b[1;32m║\x1b[0m');
    term.writeln('\x1b[1;32m║\x1b[0m  \x1b[90mFull interactive shell access\x1b[0m               \x1b[1;32m║\x1b[0m');
    term.writeln('\x1b[1;32m╚══════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[33mConnecting automatically...\x1b[0m');
    term.writeln('');

    // Auto-connect after terminal is ready
    setTimeout(() => {
      connectTerminal();
    }, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      wsRef.current?.close();
      term.dispose();
    };
  }, [panelId, isPremiumUser]);

  const connectTerminal = async () => {
    if (!xtermRef.current) return;
    
    setConnecting(true);
    setError(null);

    try {
      const term = xtermRef.current;
      term.clear();
      term.writeln('\x1b[33mConnecting to terminal...\x1b[0m');

      // Connect directly to AWS WebSocket
      const wsUrl = `${PREMIUM_WS_URL}/terminal/${panelId}?apiKey=${PREMIUM_API_KEY}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        term.clear();
        
        // Send initial resize
        ws.send(JSON.stringify({
          type: 'resize',
          cols: term.cols,
          rows: term.rows
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'output') {
            term.write(msg.data);
          } else if (msg.type === 'connected') {
            term.writeln(`\x1b[32m${msg.message}\x1b[0m`);
          } else if (msg.type === 'error') {
            term.writeln(`\x1b[31mError: ${msg.message}\x1b[0m`);
          }
        } catch {
          // Raw data
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        setError('Connection error');
        setConnected(false);
        setConnecting(false);
        term.writeln('\x1b[31mConnection error. Please try again.\x1b[0m');
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        term.writeln('');
        term.writeln('\x1b[33mDisconnected from terminal.\x1b[0m');
      };

      // Handle user input
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setConnecting(false);
      xtermRef.current?.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
    }
  };

  const disconnectTerminal = () => {
    wsRef.current?.close();
    setConnected(false);
  };

  const fitTerminal = () => {
    fitAddonRef.current?.fit();
  };

  if (!isPremiumUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/50 rounded-lg border border-border p-8">
        <TerminalIcon className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Premium Terminal</h3>
        <p className="text-muted-foreground text-center mb-4">
          Full interactive terminal access is available for Pro and Enterprise users.
        </p>
        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
          Upgrade to Pro to unlock
        </Badge>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Premium Terminal</span>
          {connected ? (
            <Badge variant="outline" className="text-green-500 border-green-500 text-xs">
              <Wifi className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs">
              <WifiOff className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={fitTerminal}
            className="h-7 px-2"
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
          {connected ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={disconnectTerminal}
              className="h-7"
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={connectTerminal}
              disabled={connecting}
              className="h-7"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Terminal */}
      <div 
        ref={terminalRef} 
        className="flex-1 p-2"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}
