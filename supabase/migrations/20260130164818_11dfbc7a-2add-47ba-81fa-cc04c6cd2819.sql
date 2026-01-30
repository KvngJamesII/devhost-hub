-- Create plans table for dynamic pricing
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- Price in kobo (smallest currency unit)
  panels_count INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  features TEXT[], -- Array of feature strings
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for tracking payments
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.plans(id),
  amount INTEGER NOT NULL, -- Amount in kobo
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  paystack_reference TEXT UNIQUE,
  paystack_access_code TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Plans policies - everyone can view active plans
CREATE POLICY "Anyone can view active plans" 
ON public.plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage plans" 
ON public.plans 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Transactions policies
CREATE POLICY "Users can view own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Insert default plans (prices in kobo - 100 kobo = 1 Naira)
INSERT INTO public.plans (name, price, panels_count, duration_days, description, features, is_popular, sort_order) VALUES
('Basic', 140000, 1, 30, 'Perfect for getting started', ARRAY['1 Panel', '1 Month Expiry', 'Full Terminal Access', 'File Manager'], false, 1),
('Pro', 700000, 5, 60, 'Best value for growing projects', ARRAY['5 Panels', '2 Months Expiry per Panel', 'Priority Support', 'All Basic Features'], true, 2),
('Enterprise', 2500000, 20, 180, 'For serious developers', ARRAY['20 Panels', '6 Months Expiry per Panel', 'Premium Support', 'All Pro Features'], false, 3);

-- Add updated_at trigger
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();