import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Calendar,
  Server,
  Minus,
  Plus,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface Panel {
  id: string;
  name: string;
  language: string;
  expires_at: string | null;
}

interface BasicPlan {
  id: string;
  price: number;
  name: string;
}

const Renew = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [basicPlan, setBasicPlan] = useState<BasicPlan | null>(null);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchData();
    }
  }, [id, user]);

  // Check for payment callback
  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    if (reference || trxref) {
      verifyPayment(reference || trxref!);
    }
  }, [searchParams]);

  const fetchData = async () => {
    // Fetch panel
    const { data: panelData, error: panelError } = await supabase
      .from('panels')
      .select('id, name, language, expires_at')
      .eq('id', id)
      .eq('user_id', user?.id)
      .single();

    if (panelError || !panelData) {
      toast({
        title: 'Error',
        description: 'Panel not found',
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }

    setPanel(panelData);

    // Fetch Basic plan (first active plan by sort order)
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('id, price, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (planError || !planData) {
      toast({
        title: 'Error',
        description: 'Could not load pricing information',
        variant: 'destructive',
      });
    } else {
      setBasicPlan(planData);
    }

    setLoading(false);
  };

  const verifyPayment = async (reference: string) => {
    setPurchasing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('paystack', {
        body: { action: 'verify', reference },
      });

      if (error) throw error;

      if (data.success && data.status === 'success') {
        toast({
          title: 'Renewal Successful! 🎉',
          description: data.message || 'Your panel has been renewed',
        });
        // Redirect to panel page
        navigate(`/panel/${id}`, { replace: true });
      } else {
        toast({
          title: 'Payment Failed',
          description: data.message || 'Payment was not successful',
          variant: 'destructive',
        });
        // Clear URL params
        navigate(`/renew/${id}`, { replace: true });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: 'Verification Error',
        description: error.message || 'Could not verify payment',
        variant: 'destructive',
      });
      navigate(`/renew/${id}`, { replace: true });
    }
    
    setPurchasing(false);
  };

  const handleRenew = async () => {
    if (!user || !panel || !basicPlan) return;

    setPurchasing(true);

    try {
      const totalAmount = basicPlan.price * months;
      const callback_url = `${window.location.origin}/renew/${id}`;

      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize',
          email: user.email,
          amount: totalAmount,
          plan_id: basicPlan.id,
          user_id: user.id,
          callback_url,
          renewal_panel_id: id,
          renewal_months: months,
        },
      });

      if (error) throw error;

      if (data.success && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Renewal error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      });
      setPurchasing(false);
    }
  };

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(priceInKobo / 100);
  };

  const calculateDaysRemaining = () => {
    if (!panel?.expires_at) return null;
    const now = new Date();
    const expiry = new Date(panel.expires_at);
    const diffMs = expiry.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = calculateDaysRemaining();
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (purchasing && !searchParams.get('reference')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Processing...</p>
        </div>
      </div>
    );
  }

  if (!panel || !basicPlan) return null;

  const totalAmount = basicPlan.price * months;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to={`/panel/${id}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg text-foreground">Renew Panel</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Extend your panel's expiration
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-lg mx-auto">
        {/* Expiry Warning */}
        {isExpired && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <p className="font-medium">Your panel has expired!</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Renew now to avoid deletion and continue using your panel.
            </p>
          </div>
        )}

        {/* Panel Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Server className="w-4 h-4" />
              Panel Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="font-mono font-medium">{panel.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Language</span>
              <Badge variant="outline" className="font-mono">
                {panel.language === 'nodejs' ? 'Node.js' : 'Python'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Expiry</span>
              <span className={`font-mono text-sm ${isExpired ? 'text-destructive' : daysRemaining !== null && daysRemaining <= 3 ? 'text-warning' : ''}`}>
                {panel.expires_at
                  ? new Date(panel.expires_at).toLocaleDateString()
                  : 'No expiry set'}
              </span>
            </div>
            {daysRemaining !== null && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={isExpired ? 'destructive' : daysRemaining <= 3 ? 'secondary' : 'default'}>
                  {isExpired ? 'Expired' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renewal Options */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Renewal Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select how many months you want to add
            </p>

            {/* Month Selector */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonths(Math.max(1, months - 1))}
                disabled={months <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              
              <div className="text-center min-w-[100px]">
                <span className="text-4xl font-mono font-bold text-foreground">
                  {months}
                </span>
                <p className="text-sm text-muted-foreground">
                  month{months > 1 ? 's' : ''}
                </p>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setMonths(Math.min(12, months + 1))}
                disabled={months >= 12}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Select */}
            <div className="flex gap-2 justify-center flex-wrap mb-6">
              {[1, 3, 6, 12].map((m) => (
                <Button
                  key={m}
                  variant={months === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMonths(m)}
                  className="font-mono"
                >
                  {m} mo
                </Button>
              ))}
            </div>

            {/* Pricing Breakdown */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per month</span>
                <span className="font-mono">{formatPrice(basicPlan.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-mono">× {months} month{months > 1 ? 's' : ''}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-mono font-bold text-primary">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What You Get */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">What you get</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-success" />
              <span>+{months} month{months > 1 ? 's' : ''} added to your panel</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-success" />
              <span>Instant activation after payment</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-success" />
              <span>Keep all your files and settings</span>
            </div>
          </CardContent>
        </Card>

        {/* Renew Button */}
        <Button
          className="w-full h-12 font-mono text-lg bg-gradient-primary hover:opacity-90"
          onClick={handleRenew}
          disabled={purchasing}
        >
          {purchasing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Pay {formatPrice(totalAmount)} & Renew
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Secure payment via Paystack (Bank Transfer)
        </p>
      </main>
    </div>
  );
};

export default Renew;
