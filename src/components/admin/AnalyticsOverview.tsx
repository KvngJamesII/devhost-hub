import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  Crown,
  Server,
  Ban,
  Gift,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  pendingRequests: number;
  totalPanels: number;
  runningPanels: number;
  bannedUsers: number;
  activeCodesCount: number;
  totalRedemptions: number;
  totalRevenue: number;
  transactionsCount: number;
}

interface AnalyticsOverviewProps {
  stats: Stats;
  previousStats?: Stats;
}

export const AnalyticsOverview = ({ stats, previousStats }: AnalyticsOverviewProps) => {
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    iconColor,
    bgColor,
    suffix,
    prefix,
    previousValue,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    suffix?: string;
    prefix?: string;
    previousValue?: number;
  }) => {
    const change = calculateChange(value, previousValue);
    const isPositive = change && change > 0;

    return (
      <Card className="bg-card border-border overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-mono font-bold text-foreground mt-1">
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
              </p>
              {change !== null && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{Math.abs(change).toFixed(1)}% vs last period</span>
                </div>
              )}
            </div>
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          iconColor="text-primary"
          bgColor="bg-primary/10"
          previousValue={previousStats?.totalUsers}
        />
        <StatCard
          title="Premium Users"
          value={stats.premiumUsers}
          icon={Crown}
          iconColor="text-warning"
          bgColor="bg-warning/10"
          previousValue={previousStats?.premiumUsers}
        />
        <StatCard
          title="Active Panels"
          value={stats.runningPanels}
          icon={Server}
          iconColor="text-success"
          bgColor="bg-success/10"
          suffix={`/${stats.totalPanels}`}
          previousValue={previousStats?.runningPanels}
        />
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue / 100}
          icon={DollarSign}
          iconColor="text-success"
          bgColor="bg-success/10"
          prefix="₦"
          previousValue={previousStats ? previousStats.totalRevenue / 100 : undefined}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-warning" />
              <div>
                <p className="text-lg font-mono font-bold text-warning">{stats.pendingRequests}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-mono font-bold text-primary">{stats.activeCodesCount}</p>
                <p className="text-xs text-muted-foreground">Active Codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <div>
                <p className="text-lg font-mono font-bold text-accent">{stats.totalRedemptions}</p>
                <p className="text-xs text-muted-foreground">Redemptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-destructive" />
              <div>
                <p className="text-lg font-mono font-bold text-destructive">{stats.bannedUsers}</p>
                <p className="text-xs text-muted-foreground">Banned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              <div>
                <p className="text-lg font-mono font-bold text-success">{stats.transactionsCount}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
