import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Terminal,
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Server,
  Calendar,
} from 'lucide-react';

interface PriceConfig {
  id: string;
  price: number; // price per panel per month in kobo
}

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const [priceConfig, setPriceConfig] = useState<PriceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [panelCount, setPanelCount] = useState(1);
  const [months, setMonths] = useState(1);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/pricing');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchPriceConfig();
  }, []);

  // Check for payment callback
  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    if (reference || trxref) {
      verifyPayment(reference || trxref!);
    }
  }, [searchParams]);

  const fetchPriceConfig = async () => {
    // Get the first active plan which holds our price per panel per month
    const { data, error } = await supabase
      .from('plans')
      .select('id, price')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching price config:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pricing',
        variant: 'destructive',
      });
    } else {
      setPriceConfig(data as PriceConfig);
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
          title: 'Payment Successful! 🎉',
          description: data.message || 'Your panels have been created',
        });
        // Clear URL params and redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: 'Payment Failed',
          description: data.message || 'Payment was not successful',
          variant: 'destructive',
        });
        // Clear URL params
        navigate('/pricing', { replace: true });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast({
        title: 'Verification Error',
        description: error.message || 'Could not verify payment',
        variant: 'destructive',
      });
      navigate('/pricing', { replace: true });
    }
    
    setPurchasing(false);
  };

  const handlePurchase = async () => {
    if (!user || !priceConfig) {
      navigate('/auth?redirect=/pricing');
      return;
    }

    setPurchasing(true);

    try {
      const totalAmount = priceConfig.price * panelCount * months;
      const callback_url = `${window.location.origin}/pricing`;

      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize',
          email: user.email,
          amount: totalAmount,
          plan_id: priceConfig.id,
          user_id: user.id,
          callback_url,
          panels_count: panelCount,
          duration_months: months,
        },
      });

      if (error) throw error;

      if (data.success && data.authorization_url) {
        // Redirect to Paystack checkout
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
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

  const totalAmount = priceConfig ? priceConfig.price * panelCount * months : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (purchasing && searchParams.get('reference')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg text-foreground">Buy Panels</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Get hosting panels for your apps
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-lg mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-6 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5 font-mono text-sm text-primary mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Secure Payments via Paystack
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground">
            Pay only for what you need. No hidden fees.
          </p>
        </div>

        {priceConfig && (
          <>
            {/* Panel Count Selector */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Number of Panels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  How many hosting panels do you need?
                </p>

                <div className="flex items-center justify-center gap-4 mb-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPanelCount(Math.max(1, panelCount - 1))}
                    disabled={panelCount <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-center min-w-[100px]">
                    <span className="text-4xl font-mono font-bold text-foreground">
                      {panelCount}
                    </span>
                    <p className="text-sm text-muted-foreground">
                      panel{panelCount > 1 ? 's' : ''}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPanelCount(Math.min(10, panelCount + 1))}
                    disabled={panelCount >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quick Select for Panels */}
                <div className="flex gap-2 justify-center flex-wrap">
                  {[1, 2, 3, 5, 10].map((p) => (
                    <Button
                      key={p}
                      variant={panelCount === p ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPanelCount(p)}
                      className="font-mono"
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Duration Selector */}
            <Card className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  How long do you want to host?
                </p>

                <div className="flex items-center justify-center gap-4 mb-4">
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

                {/* Quick Select for Months */}
                <div className="flex gap-2 justify-center flex-wrap">
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
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-mono">Price Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price per panel/month</span>
                    <span className="font-mono">{formatPrice(priceConfig.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Panels</span>
                    <span className="font-mono">× {panelCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-mono">× {months} month{months > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-mono font-bold text-primary">
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
                  <span>{panelCount} hosting panel{panelCount > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>{months} month{months > 1 ? 's' : ''} validity</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Node.js & Python support</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>24/7 uptime hosting</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Instant activation</span>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Button */}
            <Button
              className="w-full h-12 font-mono text-lg bg-gradient-primary hover:opacity-90"
              onClick={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay {formatPrice(totalAmount)}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure payment via Paystack (Bank Transfer)
            </p>
          </>
        )}

        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 px-4 py-2 rounded-xl bg-card border border-border text-xs flex-wrap justify-center">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Check className="w-3 h-3 text-success" />
              <span>Instant Activation</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Check className="w-3 h-3 text-success" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Check className="w-3 h-3 text-success" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact us on{' '}
            <a
              href="https://t.me/theidledeveloper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Telegram
            </a>
          </p>
        </div>
      </main>

      {/* Floating Support Button */}
      <a
        href="https://t.me/theidledeveloper"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        title="Contact Support"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
};

export default Pricing;
