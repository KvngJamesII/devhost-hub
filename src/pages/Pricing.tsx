import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Terminal,
  ArrowLeft,
  Check,
  Loader2,
  Zap,
  Crown,
  Star,
  Sparkles,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  panels_count: number;
  duration_days: number;
  description: string | null;
  features: string[] | null;
  is_popular: boolean;
}

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/pricing');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchPlans();
  }, []);

  // Check for payment callback
  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    if (reference || trxref) {
      verifyPayment(reference || trxref!);
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pricing plans',
        variant: 'destructive',
      });
    } else {
      setPlans(data as Plan[]);
    }
    setLoading(false);
  };

  const verifyPayment = async (reference: string) => {
    setPurchasing('verifying');
    
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
    
    setPurchasing(null);
  };

  const handlePurchase = async (plan: Plan) => {
    if (!user) {
      navigate('/auth?redirect=/pricing');
      return;
    }

    setPurchasing(plan.id);

    try {
      const callback_url = `${window.location.origin}/pricing`;

      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'initialize',
          email: user.email,
          amount: plan.price,
          plan_id: plan.id,
          user_id: user.id,
          callback_url,
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
      setPurchasing(null);
    }
  };

  const formatPrice = (priceInKobo: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(priceInKobo / 100);
  };

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Crown, Star];
    const Icon = icons[index] || Sparkles;
    return <Icon className="w-6 h-6" />;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Terminal className="w-12 h-12 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground font-mono text-sm">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (purchasing === 'verifying') {
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
              <h1 className="font-mono font-bold text-lg text-foreground">Purchase Panels</h1>
              <p className="text-xs text-muted-foreground font-mono">
                Choose a plan that suits your needs
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5 font-mono text-sm text-primary mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Secure Payments via Paystack
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get instant access to premium panel hosting. No hidden fees, no surprises.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
                plan.is_popular
                  ? 'border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground font-mono">
                    <Star className="w-3 h-3 mr-1" />
                    MOST POPULAR
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 ${
                  plan.is_popular
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {getPlanIcon(index)}
                </div>
                <h3 className="font-mono font-bold text-xl text-foreground mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="text-4xl font-mono font-bold text-foreground">
                  {formatPrice(plan.price)}
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  one-time payment
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">
                    {plan.panels_count} Panel{plan.panels_count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">
                    {Math.floor(plan.duration_days / 30)} Month{Math.floor(plan.duration_days / 30) > 1 ? 's' : ''} Expiry
                  </span>
                </div>
                {plan.features?.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={`w-full font-mono ${
                  plan.is_popular
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
                onClick={() => handlePurchase(plan)}
                disabled={!!purchasing}
              >
                {purchasing === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Purchase Now'
                )}
              </Button>

              {/* Value indicator for popular plan */}
              {plan.is_popular && (
                <p className="text-center text-xs text-primary font-mono mt-3">
                  ✨ Best value per panel
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Trust indicators */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-6 px-6 py-3 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>Instant Activation</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>Secure Payment</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-success" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>

        {/* FAQ or Help */}
        <div className="mt-8 text-center">
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
    </div>
  );
};

export default Pricing;
