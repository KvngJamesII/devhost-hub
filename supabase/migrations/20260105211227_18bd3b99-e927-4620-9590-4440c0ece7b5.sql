-- Add expires_at to panels table
ALTER TABLE public.panels 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add duration_hours to redeem_codes table (how long the panels granted by this code should last)
ALTER TABLE public.redeem_codes 
ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 720; -- 720 hours = 30 days (1 month default)