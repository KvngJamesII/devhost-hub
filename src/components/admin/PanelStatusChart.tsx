import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Server } from 'lucide-react';

interface Panel {
  status: string;
  language: string;
}

interface PanelStatusChartProps {
  panels: Panel[];
}

export const PanelStatusChart = ({ panels }: PanelStatusChartProps) => {
  // Count panels by status
  const statusCounts = panels.reduce((acc, panel) => {
    acc[panel.status] = (acc[panel.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = [
    { name: 'Running', value: statusCounts['running'] || 0, color: 'hsl(var(--success))' },
    { name: 'Stopped', value: statusCounts['stopped'] || 0, color: 'hsl(var(--muted-foreground))' },
    { name: 'Deploying', value: statusCounts['deploying'] || 0, color: 'hsl(var(--warning))' },
    { name: 'Error', value: statusCounts['error'] || 0, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  // Count panels by language
  const languageCounts = panels.reduce((acc, panel) => {
    acc[panel.language] = (acc[panel.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const languageData = [
    { name: 'Node.js', value: languageCounts['nodejs'] || 0, color: 'hsl(var(--nodejs))' },
    { name: 'Python', value: languageCounts['python'] || 0, color: 'hsl(var(--python))' },
  ].filter(d => d.value > 0);

  const runningPercent = panels.length > 0 
    ? ((statusCounts['running'] || 0) / panels.length * 100).toFixed(0)
    : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-success" />
            Panel Analytics
          </CardTitle>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-foreground">{panels.length}</p>
            <p className="text-xs text-muted-foreground">{runningPercent}% running</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          {/* Status Chart */}
          <div>
            <p className="text-xs text-muted-foreground font-mono mb-2 text-center">By Status</p>
            <div className="h-[150px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No panels
                </div>
              )}
            </div>
          </div>

          {/* Language Chart */}
          <div>
            <p className="text-xs text-muted-foreground font-mono mb-2 text-center">By Language</p>
            <div className="h-[150px]">
              {languageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No panels
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
