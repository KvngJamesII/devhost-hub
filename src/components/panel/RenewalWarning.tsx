import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

interface RenewalWarningProps {
  panelId: string;
  expiresAt: string | null;
}

export function RenewalWarning({ panelId, expiresAt }: RenewalWarningProps) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateDays = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      setDaysRemaining(diffDays);
      setIsExpired(diffDays <= 0);
    };

    calculateDays();
    // Update every hour
    const interval = setInterval(calculateDays, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Only show warning if 10 days or less remaining (or expired)
  if (daysRemaining === null || daysRemaining > 10) {
    return null;
  }

  const getWarningMessage = () => {
    if (isExpired || daysRemaining === 0) {
      return "Your panel expired today! Please renew to avoid deletion.";
    }
    if (daysRemaining === 1) {
      return "Your panel expires tomorrow! Please renew to avoid deletion.";
    }
    return `Your panel expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Please renew to avoid deletion.`;
  };

  const getWarningStyle = () => {
    if (isExpired || daysRemaining <= 0) {
      return 'bg-destructive/10 border-destructive/50 text-destructive';
    }
    if (daysRemaining <= 3) {
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    }
    return 'bg-warning/10 border-warning/30 text-warning';
  };

  const getIconColor = () => {
    if (isExpired || daysRemaining <= 3) {
      return 'text-destructive';
    }
    return 'text-warning';
  };

  return (
    <div className={`px-4 py-3 border-b ${getWarningStyle()}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpired || daysRemaining <= 3 ? (
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${getIconColor()}`} />
          ) : (
            <Clock className={`w-5 h-5 flex-shrink-0 ${getIconColor()}`} />
          )}
          <p className="text-sm font-medium truncate">
            {getWarningMessage()}
          </p>
        </div>
        <Link to={`/renew/${panelId}`}>
          <Button 
            size="sm" 
            variant={isExpired || daysRemaining <= 3 ? "destructive" : "default"}
            className="flex-shrink-0 font-mono"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Renew
          </Button>
        </Link>
      </div>
    </div>
  );
}
