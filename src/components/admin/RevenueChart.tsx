import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Transaction {
  amount: number;
  created_at: string;
  status: string;
}

interface RevenueChartProps {
  transactions: Transaction[];
}

export const RevenueChart = ({ transactions }: RevenueChartProps) => {
  // Group transactions by day and calculate daily revenue
  const dailyRevenue = transactions
    .filter(tx => tx.status === 'success')
    .reduce((acc, tx) => {
      const date = new Date(tx.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      acc[date] = (acc[date] || 0) + (tx.amount / 100);
      return acc;
    }, {} as Record<string, number>);

  // Get last 14 days
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const chartData = last14Days.map(date => ({
    date,
    revenue: dailyRevenue[date] || 0,
  }));

  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const avgDaily = totalRevenue / 14;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            Revenue (Last 14 Days)
          </CardTitle>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-success">₦{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Avg: ₦{avgDaily.toFixed(0)}/day</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                tickFormatter={(value) => `₦${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
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
                formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
