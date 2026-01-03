import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RedeemCodeDialog } from '@/components/admin/RedeemCodeDialog';
import {
  ArrowLeft,
  Users,
  Crown,
  Server,
  Loader2,
  Check,
  X,
  Ban,
  Shield,
  Search,
  Gift,
  Activity,
  TrendingUp,
  Terminal,
  Copy,
  Trash2,
  Eye,
  MoreVertical,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface User {
  id: string;
  email: string;
  username: string | null;
  premium_status: 'none' | 'pending' | 'approved' | 'rejected';
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  panels_limit: number;
}

interface PremiumRequest {
  id: string;
  user_id: string;
  message: string | null;
  status: string;
  created_at: string;
  profiles?: {
    email: string;
    username: string | null;
  };
}

interface RedeemCode {
  id: string;
  code: string;
  max_uses: number | null;
  current_uses: number;
  panels_granted: number;
  created_at: string;
  is_active: boolean;
}

interface UserPanel {
  id: string;
  name: string;
  language: string;
  status: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  pendingRequests: number;
  totalPanels: number;
  runningPanels: number;
  bannedUsers: number;
  activeCodesCount: number;
  totalRedemptions: number;
}

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    premiumUsers: 0,
    pendingRequests: 0,
    totalPanels: 0,
    runningPanels: 0,
    bannedUsers: 0,
    activeCodesCount: 0,
    totalRedemptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'unban' | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userPanels, setUserPanels] = useState<UserPanel[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersData) {
      setUsers(usersData as User[]);
    }

    // Fetch pending requests
    const { data: requestsData } = await supabase
      .from('premium_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsData) {
      const requestsWithProfiles = await Promise.all(
        requestsData.map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, username')
            .eq('id', req.user_id)
            .single();
          return { ...req, profiles: profile };
        })
      );
      setRequests(requestsWithProfiles as PremiumRequest[]);
    }

    // Fetch redeem codes
    const { data: codesData } = await supabase
      .from('redeem_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (codesData) {
      setRedeemCodes(codesData as RedeemCode[]);
    }

    // Fetch stats
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: premiumUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('premium_status', 'approved');
    const { count: pendingRequests } = await supabase.from('premium_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalPanels } = await supabase.from('panels').select('*', { count: 'exact', head: true });
    const { count: runningPanels } = await supabase.from('panels').select('*', { count: 'exact', head: true }).eq('status', 'running');
    const { count: bannedUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true);
    const { count: activeCodesCount } = await supabase.from('redeem_codes').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: totalRedemptions } = await supabase.from('code_redemptions').select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      pendingRequests: pendingRequests || 0,
      totalPanels: totalPanels || 0,
      runningPanels: runningPanels || 0,
      bannedUsers: bannedUsers || 0,
      activeCodesCount: activeCodesCount || 0,
      totalRedemptions: totalRedemptions || 0,
    });

    setLoading(false);
  };

  const handleApproveRequest = async (request: PremiumRequest) => {
    await supabase
      .from('premium_requests')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    await supabase.from('profiles').update({ premium_status: 'approved', panels_limit: 5 }).eq('id', request.user_id);

    toast({ title: 'Approved', description: 'Premium access granted with 5 panel slots' });
    fetchData();
  };

  const handleRejectRequest = async (request: PremiumRequest) => {
    await supabase
      .from('premium_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    await supabase.from('profiles').update({ premium_status: 'rejected' }).eq('id', request.user_id);

    toast({ title: 'Rejected', description: 'Premium request rejected' });
    fetchData();
  };

  const handleTogglePremium = async (targetUser: User) => {
    const newStatus = targetUser.premium_status === 'approved' ? 'none' : 'approved';
    const newLimit = newStatus === 'approved' ? 5 : 0;
    await supabase.from('profiles').update({ premium_status: newStatus, panels_limit: newLimit }).eq('id', targetUser.id);

    toast({
      title: newStatus === 'approved' ? 'Premium Granted' : 'Premium Revoked',
      description: `Premium status updated for ${targetUser.email}`,
    });
    fetchData();
  };

  const handleBanUser = async () => {
    if (!actionUser) return;

    const isBanning = actionType === 'ban';
    
    // Update profile
    await supabase
      .from('profiles')
      .update({ is_banned: isBanning, ban_reason: isBanning ? 'Banned by admin' : null })
      .eq('id', actionUser.id);

    // If banning, stop all user panels
    if (isBanning) {
      await supabase
        .from('panels')
        .update({ status: 'stopped' })
        .eq('user_id', actionUser.id);
    }

    toast({
      title: isBanning ? 'User Banned' : 'User Unbanned',
      description: isBanning 
        ? `${actionUser.email} has been banned and all their panels stopped`
        : `${actionUser.email} has been unbanned`,
    });

    setActionUser(null);
    setActionType(null);
    fetchData();
  };

  const handleViewUser = async (targetUser: User) => {
    setViewingUser(targetUser);
    setLoadingPanels(true);
    
    const { data: panels } = await supabase
      .from('panels')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false });
    
    setUserPanels((panels || []) as UserPanel[]);
    setLoadingPanels(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied!', description: 'Code copied to clipboard' });
  };

  const handleDeleteCode = async (codeId: string) => {
    await supabase.from('redeem_codes').delete().eq('id', codeId);
    toast({ title: 'Deleted', description: 'Redeem code deleted' });
    fetchData();
  };

  const handleToggleCodeActive = async (code: RedeemCode) => {
    await supabase.from('redeem_codes').update({ is_active: !code.is_active }).eq('id', code.id);
    toast({ title: code.is_active ? 'Deactivated' : 'Activated' });
    fetchData();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-mono font-bold text-lg text-foreground">Admin Panel</h1>
                <p className="text-xs text-muted-foreground font-mono">
                  <span className="text-success">●</span> System Management
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowRedeemDialog(true)}
              className="font-mono bg-primary hover:bg-primary/90"
            >
              <Gift className="w-4 h-4 mr-1" />
              Generate Code
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-mono font-bold text-foreground">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground font-mono">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-mono font-bold text-foreground">{stats.premiumUsers}</p>
                  <p className="text-xs text-muted-foreground font-mono">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-mono font-bold text-foreground">
                    {stats.runningPanels}<span className="text-sm text-muted-foreground">/{stats.totalPanels}</span>
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">Panels Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-mono font-bold text-foreground">{stats.bannedUsers}</p>
                  <p className="text-xs text-muted-foreground font-mono">Banned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-warning">{stats.pendingRequests}</p>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-primary">{stats.activeCodesCount}</p>
              <p className="text-xs text-muted-foreground">Active Codes</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-mono font-bold text-accent">{stats.totalRedemptions}</p>
              <p className="text-xs text-muted-foreground">Redemptions</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="w-full grid grid-cols-3 h-auto">
            <TabsTrigger value="requests" className="font-mono text-xs py-2 relative">
              Requests
              {requests.length > 0 && (
                <Badge className="ml-1 bg-warning text-warning-foreground h-5 min-w-5 px-1">{requests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="font-mono text-xs py-2">Users</TabsTrigger>
            <TabsTrigger value="codes" className="font-mono text-xs py-2">Codes</TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-3">
            {requests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-mono">No pending requests</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="border-warning/30 bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Crown className="w-4 h-4 text-warning" />
                          <p className="font-mono font-medium text-foreground truncate">
                            {request.profiles?.username || request.profiles?.email?.split('@')[0]}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{request.profiles?.email}</p>
                        {request.message && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded-lg text-foreground">{request.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 font-mono">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-10 w-10 border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleRejectRequest(request)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-10 w-10 bg-success hover:bg-success/90"
                          onClick={() => handleApproveRequest(request)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-mono"
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <Card key={u.id} className={u.is_banned ? 'border-destructive/50 bg-destructive/5' : 'border-border'}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono font-medium text-foreground truncate">{u.username || u.email.split('@')[0]}</p>
                          {u.is_banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                          {u.premium_status === 'approved' && (
                            <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              PRO
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          Panels: {u.panels_limit || 0} slots
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewUser(u)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Panels
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePremium(u)}>
                            <Crown className="w-4 h-4 mr-2" />
                            {u.premium_status === 'approved' ? 'Revoke Premium' : 'Grant Premium'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setActionUser(u);
                              setActionType(u.is_banned ? 'unban' : 'ban');
                            }}
                            className={u.is_banned ? '' : 'text-destructive'}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            {u.is_banned ? 'Unban User' : 'Ban User'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Codes Tab */}
          <TabsContent value="codes" className="space-y-3">
            {redeemCodes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-mono">No redeem codes yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setShowRedeemDialog(true)}
                  >
                    Generate First Code
                  </Button>
                </CardContent>
              </Card>
            ) : (
              redeemCodes.map((code) => (
                <Card key={code.id} className={code.is_active ? 'border-primary/30' : 'border-muted opacity-60'}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-primary">{code.code}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Uses: {code.current_uses}/{code.max_uses || '∞'}</span>
                          <span>•</span>
                          <span>Panels: {code.panels_granted}</span>
                          <span>•</span>
                          <Badge variant={code.is_active ? 'default' : 'secondary'} className="text-xs">
                            {code.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleCodeActive(code)}>
                            {code.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Ban/Unban Dialog */}
      <AlertDialog open={!!actionUser} onOpenChange={() => setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {actionType === 'ban' ? 'Ban User?' : 'Unban User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'ban'
                ? `This will ban ${actionUser?.email} and stop all their running panels.`
                : `This will restore ${actionUser?.email}'s access to their account.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanUser}
              className={actionType === 'ban' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {actionType === 'ban' ? 'Ban User' : 'Unban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Panels Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Server className="w-5 h-5 text-primary" />
              {viewingUser?.username || viewingUser?.email}'s Panels
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {loadingPanels ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : userPanels.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No panels found</p>
            ) : (
              userPanels.map((panel) => (
                <Card key={panel.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-medium text-foreground">{panel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {panel.language} • {panel.status}
                        </p>
                      </div>
                      <Badge variant={panel.status === 'running' ? 'default' : 'secondary'}>
                        {panel.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Redeem Code Dialog */}
      <RedeemCodeDialog
        open={showRedeemDialog}
        onOpenChange={setShowRedeemDialog}
        onCreated={fetchData}
      />
    </div>
  );
};

export default Admin;
