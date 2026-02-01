import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { vmApi, AppStatus } from '@/lib/vmApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Play,
  Square,
  Trash2,
  Loader2,
  FolderOpen,
  Terminal,
  Settings,
  AlertCircle,
  RefreshCw,
  Cpu,
  MemoryStick,
  Clock,
  RotateCcw,
  CalendarClock,
} from 'lucide-react';
import { FileManager } from '@/components/panel/FileManager';
import { UnifiedConsole } from '@/components/panel/UnifiedConsole';
import { StartupSettings } from '@/components/panel/StartupSettings';
import { PanelSettings } from '@/components/panel/PanelSettings';
import { RenewalWarning } from '@/components/panel/RenewalWarning';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Panel {
  id: string;
  name: string;
  language: 'nodejs' | 'python';
  status: 'stopped' | 'running' | 'deploying' | 'error';
  created_at: string;
  entry_point?: string | null;
  expires_at?: string | null;
}

const PanelPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [vmStatus, setVmStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [liveUptime, setLiveUptime] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchPanel();
    }
  }, [id, user]);

  const fetchPanel = async () => {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('id', id)
      .eq('user_id', user?.id)
      .single();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'Panel not found',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } else {
      setPanel(data as Panel);
    }
    setLoading(false);
  };

  const fetchVmStatus = async () => {
    if (!id || !panel) return;
    try {
      const status = await vmApi.getStatus(id);
      setVmStatus(status);
      // Only sync to DB if status meaningfully changed and is stable
      if (status.status && status.status !== panel.status) {
        await supabase.from('panels').update({ status: status.status }).eq('id', id);
        setPanel(prev => prev ? { ...prev, status: status.status } : prev);
      }
    } catch (error) {
      console.error('Failed to fetch VM status:', error);
      // Don't update status on error - keep existing state
    }
  };

  useEffect(() => {
    if (panel) {
      fetchVmStatus();
      const interval = setInterval(fetchVmStatus, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [panel?.id]);

  // Live uptime counter - updates every minute
  useEffect(() => {
    if (vmStatus?.uptime && vmStatus?.status === 'running') {
      setLiveUptime(vmStatus.uptime);
      const interval = setInterval(() => {
        setLiveUptime(prev => prev + 60000);
      }, 60000);
      return () => clearInterval(interval);
    } else {
      setLiveUptime(0);
    }
  }, [vmStatus?.uptime, vmStatus?.status]);

  const handleStart = async () => {
    if (!id || !panel) return;
    setActionLoading(true);
    
    try {
      await supabase.from('panels').update({ status: 'deploying' }).eq('id', id);
      setPanel({ ...panel, status: 'deploying' });
      
      // Log deployment start
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: 'Starting deployment...',
        log_type: 'info',
      });
      
      // First deploy (setup directory, install deps)
      await vmApi.deploy(id, panel.language);
      
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: 'Dependencies installed, starting application...',
        log_type: 'info',
      });
      
      // Get the entry point (use custom or default)
      const entryPoint = panel.entry_point || (panel.language === 'python' ? 'main.py' : 'index.js');
      
      // Then start the PM2 process with entry point
      const result = await vmApi.start(id, panel.language, entryPoint);
      
      await supabase.from('panels').update({ status: 'running' }).eq('id', id);
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: `Panel started successfully on port ${result.port} (entry: ${entryPoint})`,
        log_type: 'success',
      });
      
      setPanel({ ...panel, status: 'running' });
      toast({
        title: 'Success',
        description: result.message || 'Panel is now running',
      });
      fetchVmStatus();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start panel';
      
      await supabase.from('panels').update({ status: 'error' }).eq('id', id);
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: `Startup failed: ${errorMessage}`,
        log_type: 'error',
      });
      
      setPanel({ ...panel, status: 'error' });
      toast({
        title: 'Startup Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    setActionLoading(false);
  };

  const handleRestart = async () => {
    if (!id || !panel) return;
    setActionLoading(true);
    
    try {
      await vmApi.restart(id);
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: 'Panel restarted',
        log_type: 'info',
      });
      
      toast({
        title: 'Success',
        description: 'Panel restarted',
      });
      fetchVmStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restart panel',
        variant: 'destructive',
      });
    }
    setActionLoading(false);
  };

  const handleStop = async () => {
    if (!id || !panel) return;
    setActionLoading(true);
    
    try {
      await vmApi.stop(id);
      await supabase.from('panels').update({ status: 'stopped' }).eq('id', id);
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: 'Panel stopped',
        log_type: 'info',
      });
      
      setPanel({ ...panel, status: 'stopped' });
      toast({
        title: 'Success',
        description: 'Panel stopped',
      });
      fetchVmStatus();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop panel',
        variant: 'destructive',
      });
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      // Delete from VM first
      await vmApi.delete(id);
    } catch (error) {
      console.error('VM delete error (may not exist):', error);
    }
    
    const { error } = await supabase.from('panels').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete panel',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Panel has been deleted',
      });
      navigate('/dashboard');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-success text-success-foreground">Running</Badge>;
      case 'deploying':
        return <Badge className="bg-warning text-warning-foreground">Deploying</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Stopped</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!panel) return null;

  const formatUptime = (ms: number): string => {
    // Sanity check - if uptime is negative or unreasonably large (> 1 year), show 0
    if (ms <= 0 || ms > 365 * 24 * 60 * 60 * 1000) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const effectiveStatus = (vmStatus?.status ?? panel.status) as Panel['status'];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                panel.language === 'nodejs' ? 'bg-nodejs/10 text-nodejs' : 'bg-python/10 text-python'
              }`}
            >
              <span className="font-mono font-bold text-xs">
                {panel.language === 'nodejs' ? 'JS' : 'PY'}
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-sm">{panel.name}</h1>
              <p className="text-xs text-muted-foreground">
                {panel.language === 'nodejs' ? 'Node.js' : 'Python'}
                {panel.expires_at && (
                  <span className={`ml-2 ${new Date(panel.expires_at) < new Date() ? 'text-destructive' : new Date(panel.expires_at) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'text-warning' : ''}`}>
                    • Expires {new Date(panel.expires_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          {getStatusBadge(effectiveStatus)}
        </div>
      </header>

      {/* Renewal Warning */}
      <RenewalWarning panelId={panel.id} expiresAt={panel.expires_at ?? null} />

      {/* Action Bar */}
      <div className="px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleStart}
            disabled={actionLoading || effectiveStatus === 'running' || effectiveStatus === 'deploying'}
            className="flex-1 bg-gradient-primary hover:opacity-90 disabled:opacity-50"
          >
            {actionLoading && effectiveStatus !== 'running' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Start
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={actionLoading || effectiveStatus !== 'running'}
            className="flex-1"
          >
            {actionLoading && effectiveStatus === 'running' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Restart
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStopDialog(true)}
            disabled={actionLoading || effectiveStatus !== 'running'}
            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
          >
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Resource Metrics */}
      {vmStatus && effectiveStatus === 'running' && (
        <div className="px-4 py-3 border-b border-border bg-card/30">
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <Cpu className="w-4 h-4 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">CPU</span>
              <span className="text-sm font-semibold">{vmStatus.cpu?.toFixed(1) ?? 0}%</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <MemoryStick className="w-4 h-4 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Memory</span>
              <span className="text-sm font-semibold">
                {vmStatus.memory ? `${(vmStatus.memory / 1024 / 1024).toFixed(1)}MB` : '0MB'}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <Clock className="w-4 h-4 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Uptime</span>
              <span className="text-sm font-semibold">
                {formatUptime(liveUptime)}
              </span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
              <RotateCcw className="w-4 h-4 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Restarts</span>
              <span className="text-sm font-semibold">{vmStatus.restarts ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="console" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 overflow-x-auto">
          <TabsTrigger
            value="console"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3"
          >
            <Terminal className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Console</span>
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3"
          >
            <FolderOpen className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Files</span>
          </TabsTrigger>
          <TabsTrigger
            value="startup"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3"
          >
            <Play className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Startup</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 sm:px-4 py-3"
          >
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="console" className="flex-1 m-0">
          <UnifiedConsole panelId={panel.id} panelStatus={effectiveStatus} />
        </TabsContent>

        <TabsContent value="files" className="flex-1 m-0">
          <FileManager panelId={panel.id} />
        </TabsContent>

        <TabsContent value="startup" className="flex-1 m-0 overflow-y-auto">
          <StartupSettings panel={panel} onUpdate={fetchPanel} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0 overflow-y-auto">
          <PanelSettings panel={panel} onUpdate={fetchPanel} />
        </TabsContent>
      </Tabs>

      {/* Stop Confirmation */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Panel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop "{panel.name}". You can restart it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowStopDialog(false);
                handleStop();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Panel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{panel.name}" and all associated files and logs. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PanelPage;
