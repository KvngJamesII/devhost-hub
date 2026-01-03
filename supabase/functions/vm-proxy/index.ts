import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VM_API_URL = Deno.env.get('VM_API_URL');
const VM_API_KEY = Deno.env.get('VM_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request
    const { action, panelId, ...params } = await req.json();
    console.log(`VM Proxy: ${action} for panel ${panelId} by user ${user.id}`);

    // Verify user owns this panel
    const { data: panel, error: panelError } = await supabase
      .from('panels')
      .select('id, user_id')
      .eq('id', panelId)
      .single();

    if (panelError || !panel) {
      console.error('Panel not found:', panelError);
      return new Response(JSON.stringify({ error: 'Panel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (panel.user_id !== user.id) {
      // Check if user is admin
      const { data: isAdmin } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });
      
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build VM API request based on action
    let vmPath: string;
    let vmMethod: string = 'GET';
    let vmBody: any = null;

    switch (action) {
      // App management
      case 'app:status':
        vmPath = `/api/apps/${panelId}/status`;
        break;
      case 'app:deploy':
        vmPath = `/api/apps/${panelId}/deploy`;
        vmMethod = 'POST';
        vmBody = { language: params.language };
        break;
      case 'app:start':
        vmPath = `/api/apps/${panelId}/start`;
        vmMethod = 'POST';
        vmBody = { language: params.language, entryPoint: params.entryPoint };
        break;
      case 'app:stop':
        vmPath = `/api/apps/${panelId}/stop`;
        vmMethod = 'POST';
        break;
      case 'app:restart':
        vmPath = `/api/apps/${panelId}/restart`;
        vmMethod = 'POST';
        break;
      case 'app:delete':
        vmPath = `/api/apps/${panelId}`;
        vmMethod = 'DELETE';
        break;

      // File management
      case 'files:list':
        vmPath = `/api/files/${panelId}?dir=${encodeURIComponent(params.dir || '')}`;
        break;
      case 'files:content':
        vmPath = `/api/files/${panelId}/content?path=${encodeURIComponent(params.path)}`;
        break;
      case 'files:sync':
        vmPath = `/api/files/${panelId}/sync`;
        vmMethod = 'POST';
        vmBody = { files: params.files };
        break;
      case 'files:delete':
        vmPath = `/api/files/${panelId}?path=${encodeURIComponent(params.path)}`;
        vmMethod = 'DELETE';
        break;
      case 'files:mkdir':
        vmPath = `/api/files/${panelId}/mkdir`;
        vmMethod = 'POST';
        vmBody = { path: params.path };
        break;

      // Terminal
      case 'terminal:exec':
        vmPath = `/api/terminal/${panelId}/exec`;
        vmMethod = 'POST';
        vmBody = { command: params.command };
        break;

      // Logs
      case 'logs:get':
        vmPath = `/api/logs/${panelId}?lines=${params.lines || 100}`;
        break;
      case 'logs:clear':
        vmPath = `/api/logs/${panelId}`;
        vmMethod = 'DELETE';
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Make request to VM API
    const vmUrl = `${VM_API_URL}${vmPath}`;
    console.log(`Calling VM API: ${vmMethod} ${vmUrl}`);

    const vmResponse = await fetch(vmUrl, {
      method: vmMethod,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VM_API_KEY!,
      },
      body: vmBody ? JSON.stringify(vmBody) : undefined,
    });

    const vmData = await vmResponse.json();
    console.log('VM API response:', vmData);

    // Update panel status in database if relevant
    if (action === 'app:start' && vmData.success) {
      await supabase.from('panels').update({ status: 'running' }).eq('id', panelId);
    } else if (action === 'app:stop' && vmData.success) {
      await supabase.from('panels').update({ status: 'stopped' }).eq('id', panelId);
    } else if (action === 'app:deploy' && vmData.success) {
      await supabase.from('panels').update({ status: 'deploying' }).eq('id', panelId);
    }

    return new Response(JSON.stringify(vmData), {
      status: vmResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('VM Proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
