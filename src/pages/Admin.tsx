import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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

interface User {
  id: string;
  email: string;
  username: string | null;
  premium_status: 'none' | 'pending' | 'approved' | 'rejected';
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
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

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  pendingRequests: number;
  totalPanels: number;
}

const Admin = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, premiumUsers: 0, pendingRequests: 0, totalPanels: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionUser, setActionUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'unban' | null>(null);
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
      // Fetch user profiles for each request
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

    // Fetch stats
    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: premiumUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('premium_status', 'approved');
    const { count: pendingRequests } = await supabase.from('premium_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalPanels } = await supabase.from('panels').select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: totalUsers || 0,
      premiumUsers: premiumUsers || 0,
      pendingRequests: pendingRequests || 0,
      totalPanels: totalPanels || 0,
    });

    setLoading(false);
  };

  const handleApproveRequest = async (request: PremiumRequest) => {
    // Update request
    await supabase
      .from('premium_requests')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    // Update user profile
    await supabase.from('profiles').update({ premium_status: 'approved' }).eq('id', request.user_id);

    toast({
      title: 'Approved',
      description: 'Premium access granted',
    });
    fetchData();
  };

  const handleRejectRequest = async (request: PremiumRequest) => {
    await supabase
      .from('premium_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', request.id);

    await supabase.from('profiles').update({ premium_status: 'rejected' }).eq('id', request.user_id);

    toast({
      title: 'Rejected',
      description: 'Premium request rejected',
    });
    fetchData();
  };

  const handleTogglePremium = async (targetUser: User) => {
    const newStatus = targetUser.premium_status === 'approved' ? 'none' : 'approved';
    await supabase.from('profiles').update({ premium_status: newStatus }).eq('id', targetUser.id);

    toast({
      title: newStatus === 'approved' ? 'Premium Granted' : 'Premium Revoked',
      description: `Premium status updated for ${targetUser.email}`,
    });
    fetchData();
  };

  const handleBanUser = async () => {
    if (!actionUser) return;

    const isBanning = actionType === 'ban';
    await supabase
      .from('profiles')
      .update({ is_banned: isBanning, ban_reason: isBanning ? 'Banned by admin' : null })
      .eq('id', actionUser.id);

    toast({
      title: isBanning ? 'User Banned' : 'User Unbanned',
      description: `${actionUser.email} has been ${isBanning ? 'banned' : 'unbanned'}`,
    });

    setActionUser(null);
    setActionType(null);
    fetchData();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-bold text-lg">Admin Panel</h1>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{stats.premiumUsers}</p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-8 h-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{stats.pendingRequests}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalPanels}</p>
                  <p className="text-xs text-muted-foreground">Panels</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="requests" className="relative">
              Requests
              {requests.length > 0 && (
                <Badge className="ml-2 bg-warning text-warning-foreground">{requests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No pending requests
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          {request.profiles?.username || request.profiles?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">{request.profiles?.email}</p>
                        {request.message && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded-lg">{request.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleRejectRequest(request)}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                        <Button
                          size="icon"
                          className="bg-success hover:bg-success/90"
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

          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <Card key={u.id} className={u.is_banned ? 'border-destructive/50 bg-destructive/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{u.username || u.email}</p>
                          {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                          {u.premium_status === 'approved' && (
                            <Badge className="bg-gradient-accent text-accent-foreground">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={u.premium_status === 'approved' ? 'outline' : 'default'}
                          onClick={() => handleTogglePremium(u)}
                        >
                          <Crown className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActionUser(u);
                            setActionType(u.is_banned ? 'unban' : 'ban');
                          }}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Ban/Unban Dialog */}
      <AlertDialog open={!!actionUser} onOpenChange={() => setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'ban' ? 'Ban User?' : 'Unban User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'ban'
                ? `This will prevent ${actionUser?.email} from accessing their account.`
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
    </div>
  );
};

export default Admin;
