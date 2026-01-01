import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Server,
  Plus,
  Settings,
  LogOut,
  Crown,
  Shield,
  Loader2,
  Play,
  Square,
  AlertCircle,
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-success" />;
      case 'deploying':
        return <Loader2 className="w-4 h-4 text-warning animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Square className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const canCreatePanel = isPremium && panels.length < MAX_PANELS;

  return (
    <div className="min-h-screen bg-background dark">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Server className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold">iDev Host</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <Shield className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 pb-24">
        {/* User Info Card */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{profile?.username || profile?.email}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Badge className="bg-gradient-accent text-accent-foreground">
                    <Crown className="w-3 h-3 mr-1" />
                    Premium
                  </Badge>
                ) : profile?.premium_status === 'pending' ? (
                  <Badge variant="secondary">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Pending
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPremiumDialog(true)}
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Get Premium
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panels Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              My Panels ({panels.length}/{MAX_PANELS})
            </h2>
            {canCreatePanel && (
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Panel
              </Button>
            )}
          </div>

          {!isPremium ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-6 text-center">
                <Crown className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <CardTitle className="text-lg mb-2">Premium Required</CardTitle>
                <CardDescription>
                  You need a premium account to create and host panels. Request premium access to get started.
                </CardDescription>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setShowPremiumDialog(true)}
                >
                  Request Premium
                </Button>
              </CardContent>
            </Card>
          ) : panels.length === 0 ? (
            <Card className="bg-card border-border border-dashed">
              <CardContent className="p-6 text-center">
                <Server className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <CardTitle className="text-lg mb-2">No Panels Yet</CardTitle>
                <CardDescription>
                  Create your first panel to start hosting your Node.js or Python applications.
                </CardDescription>
                <Button
                  className="mt-4 bg-gradient-primary hover:opacity-90"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Panel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {panels.map((panel) => (
                <Link key={panel.id} to={`/panel/${panel.id}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              panel.language === 'nodejs'
                                ? 'bg-nodejs/10 text-nodejs'
                                : 'bg-python/10 text-python'
                            }`}
                          >
                            {panel.language === 'nodejs' ? (
                              <span className="font-mono font-bold text-sm">JS</span>
                            ) : (
                              <span className="font-mono font-bold text-sm">PY</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{panel.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {panel.language === 'nodejs' ? 'Node.js' : 'Python'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(panel.status)}
                          {getStatusBadge(panel.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {panels.length >= MAX_PANELS && (
            <p className="text-sm text-muted-foreground text-center">
              You've reached the maximum of {MAX_PANELS} panels.
            </p>
          )}
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
