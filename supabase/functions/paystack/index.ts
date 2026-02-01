import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, ...params } = await req.json();
    console.log(`Paystack action: ${action}`, params);

    if (action === 'initialize') {
      // Initialize a payment
      const { email, amount, plan_id, user_id, callback_url, renewal_panel_id, renewal_months } = params;

      if (!email || !amount || !plan_id || !user_id) {
        throw new Error('Missing required parameters: email, amount, plan_id, user_id');
      }

      const reference = `idev_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create transaction record with renewal info if applicable
      const { error: txError } = await supabase.from('transactions').insert({
        user_id,
        plan_id,
        amount,
        paystack_reference: reference,
        status: 'pending',
        metadata: { 
          email, 
          callback_url,
          renewal_panel_id: renewal_panel_id || null,
          renewal_months: renewal_months || null,
        },
      });

      if (txError) {
        console.error('Error creating transaction:', txError);
        throw new Error('Failed to create transaction record');
      }

      // Initialize Paystack payment with bank transfer only
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount, // Amount in kobo
          reference,
          callback_url,
          channels: ['bank_transfer'], // Only show bank transfer option
          metadata: {
            user_id,
            plan_id,
            renewal_panel_id: renewal_panel_id || null,
            renewal_months: renewal_months || null,
          },
        }),
      });

      const paystackData = await paystackResponse.json();
      console.log('Paystack initialize response:', paystackData);

      if (!paystackData.status) {
        throw new Error(paystackData.message || 'Paystack initialization failed');
      }

      // Update transaction with access code
      await supabase.from('transactions').update({
        paystack_access_code: paystackData.data.access_code,
      }).eq('paystack_reference', reference);

      return new Response(JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        reference,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      // Verify a payment
      const { reference } = params;

      if (!reference) {
        throw new Error('Missing reference parameter');
      }

      // Verify with Paystack
      const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      });

      const paystackData = await paystackResponse.json();
      console.log('Paystack verify response:', paystackData);

      if (!paystackData.status) {
        throw new Error(paystackData.message || 'Paystack verification failed');
      }

      const paymentStatus = paystackData.data.status;

      // Get transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*, plans(*)')
        .eq('paystack_reference', reference)
        .maybeSingle();

      if (txError || !transaction) {
        throw new Error('Transaction not found');
      }

      // If already processed, return early
      if (transaction.status === 'success') {
        return new Response(JSON.stringify({
          success: true,
          status: 'success',
          message: 'Payment already processed',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (paymentStatus === 'success') {
        // Update transaction status
        await supabase.from('transactions').update({
          status: 'success',
          updated_at: new Date().toISOString(),
        }).eq('id', transaction.id);

        // Check if this is a renewal
        const metadata = transaction.metadata as any;
        const renewalPanelId = metadata?.renewal_panel_id;
        const renewalMonths = metadata?.renewal_months;

        if (renewalPanelId && renewalMonths) {
          // This is a panel renewal - extend the panel's expiry
          const { data: panelData, error: panelError } = await supabase
            .from('panels')
            .select('expires_at')
            .eq('id', renewalPanelId)
            .single();

          if (panelError || !panelData) {
            throw new Error('Panel not found for renewal');
          }

          // Calculate new expiry date
          const currentExpiry = panelData.expires_at ? new Date(panelData.expires_at) : new Date();
          const now = new Date();
          
          // If panel is expired, start from now; otherwise add to current expiry
          const baseDate = currentExpiry < now ? now : currentExpiry;
          const newExpiry = new Date(baseDate);
          newExpiry.setMonth(newExpiry.getMonth() + renewalMonths);

          await supabase.from('panels').update({
            expires_at: newExpiry.toISOString(),
          }).eq('id', renewalPanelId);

          console.log(`Extended panel ${renewalPanelId} by ${renewalMonths} months to ${newExpiry.toISOString()}`);

          return new Response(JSON.stringify({
            success: true,
            status: 'success',
            message: `Panel renewed! +${renewalMonths} month(s) added.`,
            new_expiry: newExpiry.toISOString(),
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Regular purchase flow - create new panels
        const plan = transaction.plans;
        if (!plan) {
          throw new Error('Plan not found for transaction');
        }

        // Update user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('panels_limit')
          .eq('id', transaction.user_id)
          .single();

        const currentLimit = profile?.panels_limit || 0;
        await supabase.from('profiles').update({
          premium_status: 'approved',
          panels_limit: currentLimit + plan.panels_count,
        }).eq('id', transaction.user_id);

        // Create panels with expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

        const panelsToCreate = [];
        for (let i = 0; i < plan.panels_count; i++) {
          panelsToCreate.push({
            user_id: transaction.user_id,
            name: `ClaimedPanel_${Date.now()}_${i}`,
            language: 'nodejs',
            expires_at: expiresAt.toISOString(),
          });
        }

        await supabase.from('panels').insert(panelsToCreate);

        console.log(`Created ${plan.panels_count} panels for user ${transaction.user_id}`);

        return new Response(JSON.stringify({
          success: true,
          status: 'success',
          message: `Payment successful! ${plan.panels_count} panel(s) created.`,
          panels_created: plan.panels_count,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Update transaction status to failed
        await supabase.from('transactions').update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', transaction.id);

        return new Response(JSON.stringify({
          success: false,
          status: paymentStatus,
          message: 'Payment was not successful',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('Paystack function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
