import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';

interface Transaction {
  plan_id: string | null;
  amount: number;
  status: string;
  plan_name?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
}

interface PlanPerformanceProps {
  transactions: Transaction[];
  plans: Plan[];
}

export const PlanPerformance = ({ transactions, plans }: PlanPerformanceProps) => {
  // Calculate sales and revenue per plan
  const planStats = plans.map(plan => {
    const planTx = transactions.filter(tx => tx.plan_id === plan.id && tx.status === 'success');
    return {
      name: plan.name,
      sales: planTx.length,
      revenue: planTx.reduce((sum, tx) => sum + tx.amount, 0) / 100,
    };
  });

  const colors = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--accent))'];

  const bestPlan = planStats.reduce((best, plan) => 
    plan.sales > best.sales ? plan : best, planStats[0] || { name: 'N/A', sales: 0, revenue: 0 });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            Plan Performance
          </CardTitle>
          <div className="text-right">
            <p className="text-sm font-mono text-foreground">{bestPlan.name}</p>
            <p className="text-xs text-muted-foreground">Best seller</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px] mt-4">
          {planStats.length > 0 && planStats.some(p => p.sales > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planStats} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
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
                  formatter={(value: number, name: string) => [
                    name === 'sales' ? `${value} sales` : `₦${value.toLocaleString()}`,
                    name === 'sales' ? 'Sales' : 'Revenue'
                  ]}
                />
                <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                  {planStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="font-mono text-sm">No sales data yet</p>
            </div>
          )}
        </div>

        {/* Plan breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {planStats.map((plan, index) => (
            <div 
              key={plan.name} 
              className="p-2 rounded-lg bg-muted/30 text-center"
              style={{ borderLeft: `3px solid ${colors[index % colors.length]}` }}
            >
              <p className="text-xs text-muted-foreground">{plan.name}</p>
              <p className="font-mono font-bold text-foreground">{plan.sales}</p>
              <p className="text-xs text-success font-mono">₦{plan.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
