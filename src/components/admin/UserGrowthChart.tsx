import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users } from 'lucide-react';

interface User {
  created_at: string;
  premium_status: string;
}

interface UserGrowthChartProps {
  users: User[];
}

export const UserGrowthChart = ({ users }: UserGrowthChartProps) => {
  // Group users by signup date
  const usersByDate = users.reduce((acc, user) => {
    const date = new Date(user.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    if (!acc[date]) {
      acc[date] = { total: 0, premium: 0 };
    }
    acc[date].total++;
    if (user.premium_status === 'approved') {
      acc[date].premium++;
    }
    return acc;
  }, {} as Record<string, { total: number; premium: number }>);

  // Get last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  // Calculate cumulative growth
  let cumulativeTotal = 0;
  let cumulativePremium = 0;
  
  // Count users before the 14-day window
  users.forEach(user => {
    const userDate = new Date(user.created_at);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    if (userDate < cutoffDate) {
      cumulativeTotal++;
      if (user.premium_status === 'approved') {
        cumulativePremium++;
      }
    }
  });

  const chartData = last14Days.map(date => {
    const dayData = usersByDate[date] || { total: 0, premium: 0 };
    cumulativeTotal += dayData.total;
    cumulativePremium += dayData.premium;
    return {
      date,
      newUsers: dayData.total,
      totalUsers: cumulativeTotal,
      premiumUsers: cumulativePremium,
    };
  });

  const totalNewUsers = chartData.reduce((sum, d) => sum + d.newUsers, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            User Growth (Last 14 Days)
          </CardTitle>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-primary">+{totalNewUsers}</p>
            <p className="text-xs text-muted-foreground">New signups</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
              />
              <Line
                type="monotone"
                dataKey="totalUsers"
                name="Total Users"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="premiumUsers"
                name="Premium"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
