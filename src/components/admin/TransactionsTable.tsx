import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  plan_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paystack_reference: string | null;
  created_at: string;
  user_email?: string;
  plan_name?: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

export const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-success/10 text-success border-success/30">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
    }
  };

  const recentTransactions = transactions.slice(0, 20);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-success" />
            Recent Transactions
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {transactions.length} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <p className="font-mono text-sm">No transactions yet</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(tx.status)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm text-foreground truncate">
                          {tx.user_email || 'Unknown user'}
                        </p>
                        {tx.plan_name && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {tx.plan_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="font-mono truncate">{tx.paystack_reference?.slice(0, 12)}...</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className={`font-mono font-bold ${tx.status === 'success' ? 'text-success' : 'text-foreground'}`}>
                      ₦{(tx.amount / 100).toLocaleString()}
                    </p>
                    {getStatusBadge(tx.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
