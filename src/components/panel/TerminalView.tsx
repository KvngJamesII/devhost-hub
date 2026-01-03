import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Terminal, Send, Trash2, Loader2 } from 'lucide-react';
import { vmApi } from '@/lib/vmApi';

interface TerminalViewProps {
  panelId: string;
  panelStatus: string;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export function TerminalView({ panelId, panelStatus }: TerminalViewProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: '1',
      type: 'output',
      content: 'iDev Host Terminal v1.0.0',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'output',
      content: 'Type commands to interact with your panel.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [executing, setExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
  }, [lines]);

  const handleCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Add input line
    const inputLine: TerminalLine = {
      id: Date.now().toString(),
      type: 'input',
      content: `$ ${trimmed}`,
      timestamp: new Date(),
    };
    setLines((prev) => [...prev, inputLine]);
    setInput('');

    // Handle local commands
    if (trimmed === 'clear') {
      setLines([]);
      return;
    }

    if (trimmed === 'help') {
      setLines((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'output',
        content: `Available commands:
  help      - Show this help message
  clear     - Clear terminal
  Any other command will be executed on the server`,
        timestamp: new Date(),
      }]);
      return;
    }

    // Execute on VM
    setExecuting(true);
    try {
      const result = await vmApi.exec(panelId, trimmed);
      
      if (result.stdout) {
        setLines((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'output',
          content: result.stdout,
          timestamp: new Date(),
        }]);
      }
      
      if (result.stderr) {
        setLines((prev) => [...prev, {
          id: (Date.now() + 2).toString(),
          type: 'error',
          content: result.stderr,
          timestamp: new Date(),
        }]);
      }
      
      if (!result.stdout && !result.stderr) {
        setLines((prev) => [...prev, {
          id: (Date.now() + 1).toString(),
          type: 'output',
          content: '(command completed with no output)',
          timestamp: new Date(),
        }]);
      }
    } catch (error: any) {
      setLines((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      }]);
    }
    setExecuting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !executing) {
      handleCommand(input);
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  return (
    <div className="h-full flex flex-col bg-muted/30">
      {/* Terminal Header */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Terminal</span>
        </div>
        <Button variant="ghost" size="sm" onClick={clearTerminal}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-auto p-3 font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={`py-0.5 whitespace-pre-wrap ${
              line.type === 'input'
                ? 'text-primary'
                : line.type === 'error'
                ? 'text-destructive'
                : 'text-foreground'
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="text-primary font-mono">$</span>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 font-mono text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
          <Button size="icon" variant="ghost" onClick={() => handleCommand(input)} disabled={executing}>
            {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
