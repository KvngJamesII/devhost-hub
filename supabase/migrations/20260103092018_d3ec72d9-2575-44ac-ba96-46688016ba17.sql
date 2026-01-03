-- Create redeem_codes table
CREATE TABLE public.redeem_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER, -- NULL means unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  panels_granted INTEGER NOT NULL DEFAULT 1 CHECK (panels_granted >= 1 AND panels_granted <= 10),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create code_redemptions table to track who redeemed what
CREATE TABLE public.code_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id UUID NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

-- Enable RLS
ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for redeem_codes
CREATE POLICY "Admins can manage redeem codes"
ON public.redeem_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active codes for redemption"
ON public.redeem_codes
FOR SELECT
USING (is_active = true);

-- RLS Policies for code_redemptions
CREATE POLICY "Admins can view all redemptions"
ON public.code_redemptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can redeem codes"
ON public.code_redemptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own redemptions"
ON public.code_redemptions
FOR SELECT
USING (auth.uid() = user_id);

-- Add panels_limit column to profiles for tracking how many panels a user can create
ALTER TABLE public.profiles ADD COLUMN panels_limit INTEGER NOT NULL DEFAULT 0;