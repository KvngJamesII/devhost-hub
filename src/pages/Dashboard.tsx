import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Server,
  Plus,
  LogOut,
  Crown,
  Shield,
  Loader2,
  Play,
  Square,
  AlertCircle,
  Terminal,
  Activity,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { CreatePanelDialog } from '@/components/CreatePanelDialog';
import { RequestPremiumDialog } from '@/components/RequestPremiumDialog';

interface Panel {
  id: string;
  name: string;
  language: 'nodejs' | 'python';
  status: 'stopped' | 'running' | 'deploying' | 'error';
  created_at: string;
}

const MAX_PANELS = 5;

const Dashboard = () => {
  const { user, profile, isAdmin, isPremium, signOut, loading: authLoading } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPanels();
    }
  }, [user]);

  const fetchPanels = async () => {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load panels',
        variant: 'destructive',
      });
    } else {
      setPanels(data as Panel[]);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'running':
        return { 
          icon: <Play className="w-3 h-3" />, 
          text: 'ONLINE',
          class: 'text-success bg-success/10 border-success/30'
        };
      case 'deploying':
        return { 
          icon: <Loader2 className="w-3 h-3 animate-spin" />, 
          text: 'DEPLOYING',
          class: 'text-warning bg-warning/10 border-warning/30'
        };
      case 'error':
        return { 
          icon: <AlertCircle className="w-3 h-3" />, 
          text: 'ERROR',
          class: 'text-destructive bg-destructive/10 border-destructive/30'
        };
      default:
        return { 
          icon: <Square className="w-3 h-3" />, 
          text: 'OFFLINE',
          class: 'text-muted-foreground bg-muted/30 border-muted'
        };
    }
  };

  const runningCount = panels.filter(p => p.status === 'running').length;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  const canCreatePanel = isPremium && panels.length < MAX_PANELS;

  return (
    <div className="min-h-screen bg-background">
      {/* Terminal-style Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Terminal className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-mono font-bold text-lg text-foreground">iDev Host</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  <span className="text-success">●</span> {profile?.username || profile?.email?.split('@')[0]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Shield className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Panels</span>
            </div>
            <p className="text-2xl font-mono font-bold text-foreground">{panels.length}<span className="text-sm text-muted-foreground">/{MAX_PANELS}</span></p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Active</span>
            </div>
            <p className="text-2xl font-mono font-bold text-success">{runningCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs text-muted-foreground font-mono uppercase">Plan</span>
            </div>
            <p className="text-sm font-mono font-bold">
              {isPremium ? (
                <span className="text-warning">PRO</span>
              ) : (
                <span className="text-muted-foreground">FREE</span>
              )}
            </p>
          </div>
        </div>

        {/* Premium Banner */}
        {!isPremium && (
          <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(34,197,94,0.03)_50%,transparent_100%)] animate-pulse" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono font-semibold text-foreground">Upgrade to Premium</p>
                  <p className="text-xs text-muted-foreground">Unlock panel hosting capabilities</p>
                </div>
              </div>
              {profile?.premium_status === 'pending' ? (
                <Badge variant="secondary" className="font-mono">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  PENDING
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  onClick={() => setShowPremiumDialog(true)}
                  className="font-mono bg-primary hover:bg-primary/90"
                >
                  Request
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Panels Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-mono font-semibold text-lg text-foreground">Panels</h2>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {panels.length} total
              </span>
            </div>
            {canCreatePanel && (
              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="font-mono bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            )}
          </div>

          {panels.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center">
                <Terminal className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-mono font-medium mb-1 text-foreground">No Panels Yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                {isPremium 
                  ? 'Create your first panel to start hosting'
                  : 'Get premium to create panels'}
              </p>
              {isPremium ? (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="font-mono bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Panel
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowPremiumDialog(true)}
                  className="font-mono"
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Request Premium
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {panels.map((panel) => {
                const status = getStatusInfo(panel.status);
                return (
                  <Link key={panel.id} to={`/panel/${panel.id}`}>
                    <div className="group relative bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:bg-card/80 transition-all active:scale-[0.98]">
                      {/* Status indicator line */}
                      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r ${
                        panel.status === 'running' ? 'bg-success' :
                        panel.status === 'deploying' ? 'bg-warning' :
                        panel.status === 'error' ? 'bg-destructive' :
                        'bg-muted'
                      }`} />
                      
                      <div className="flex items-center gap-4 pl-3">
                        {/* Language Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                          panel.language === 'nodejs'
                            ? 'bg-nodejs/10 text-nodejs border border-nodejs/30'
                            : 'bg-python/10 text-python border border-python/30'
                        }`}>
                          {panel.language === 'nodejs' ? 'JS' : 'PY'}
                        </div>
                        
                        {/* Panel Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-medium truncate text-foreground">{panel.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {panel.language === 'nodejs' ? 'Node.js' : 'Python'} • {new Date(panel.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono ${status.class}`}>
                            {status.icon}
                            <span className="hidden sm:inline">{status.text}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {panels.length >= MAX_PANELS && (
            <p className="text-xs text-muted-foreground text-center font-mono">
              Maximum panel limit reached ({MAX_PANELS}/{MAX_PANELS})
            </p>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-card border border-border rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-success">➜</span>
            <span className="text-primary">~</span>
            <span className="animate-pulse">|</span>
          </div>
          <p className="text-muted-foreground mt-2">
            Ready to deploy. Create a panel to get started.
          </p>
        </div>
      </main>

      <CreatePanelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchPanels}
      />

      <RequestPremiumDialog
        open={showPremiumDialog}
        onOpenChange={setShowPremiumDialog}
      />
    </div>
  );
};

export default Dashboard;
