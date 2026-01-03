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
  FileText,
  Settings,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { FileManager } from '@/components/panel/FileManager';
import { LogsViewer } from '@/components/panel/LogsViewer';
import { TerminalView } from '@/components/panel/TerminalView';
import { PanelSettings } from '@/components/panel/PanelSettings';
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
}

const PanelPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [vmStatus, setVmStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
    if (!id) return;
    try {
      const status = await vmApi.getStatus(id);
      setVmStatus(status);
      // Sync VM status to database
      if (status.status !== panel?.status) {
        await supabase.from('panels').update({ status: status.status }).eq('id', id);
        if (panel) setPanel({ ...panel, status: status.status });
      }
    } catch (error) {
      console.error('Failed to fetch VM status:', error);
    }
  };

  useEffect(() => {
    if (panel) {
      fetchVmStatus();
      const interval = setInterval(fetchVmStatus, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [panel?.id]);

  const handleStart = async () => {
    if (!id || !panel) return;
    setActionLoading(true);
    
    try {
      await supabase.from('panels').update({ status: 'deploying' }).eq('id', id);
      setPanel({ ...panel, status: 'deploying' });
      
      const result = await vmApi.deploy(id, panel.language);
      
      await supabase.from('panels').update({ status: 'running' }).eq('id', id);
      await supabase.from('panel_logs').insert({
        panel_id: id,
        message: `Panel deployed on port ${result.port}`,
        log_type: 'success',
      });
      
      setPanel({ ...panel, status: 'running' });
      toast({
        title: 'Success',
        description: result.message || 'Panel is now running',
      });
      fetchVmStatus();
    } catch (error: any) {
      await supabase.from('panels').update({ status: 'error' }).eq('id', id);
      setPanel({ ...panel, status: 'error' });
      toast({
        title: 'Error',
        description: error.message || 'Failed to start panel',
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
              </p>
            </div>
          </div>
          {getStatusBadge(panel.status)}
        </div>
      </header>

      {/* Action Bar */}
      <div className="px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          {panel.status === 'running' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              disabled={actionLoading}
              className="flex-1"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={actionLoading || panel.status === 'deploying'}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {actionLoading || panel.status === 'deploying' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>
          )}
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

      {/* Main Content */}
      <Tabs defaultValue="files" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Files
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <FileText className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger
            value="terminal"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Terminal
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 m-0">
          <FileManager panelId={panel.id} />
        </TabsContent>

        <TabsContent value="logs" className="flex-1 m-0">
          <LogsViewer panelId={panel.id} />
        </TabsContent>

        <TabsContent value="terminal" className="flex-1 m-0">
          <TerminalView panelId={panel.id} panelStatus={panel.status} />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0">
          <PanelSettings panel={panel} onUpdate={fetchPanel} />
        </TabsContent>
      </Tabs>

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
