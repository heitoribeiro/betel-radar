// Betel Radar v0.8.2 — OAuth oficial OLX
// Credenciais OLX ficam no Supabase Vault; nenhum segredo deve ser versionado aqui.

const APP_URL = 'https://heitoribeiro.github.io/betel-radar/';
const APP_ORIGIN = 'https://heitoribeiro.github.io';
const OLX_AUTH_URL = 'https://auth.olx.com.br/oauth';
const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token';
const OLX_BASIC_INFO_URL = 'https://apps.olx.com.br/oauth_api/basic_user_info';

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function redirectResult(result: 'connected' | 'error', reason?: string) {
  const url = new URL(APP_URL);
  url.searchParams.set('olx', result);
  if (reason) url.searchParams.set('olx_reason', reason);
  return Response.redirect(url.toString(), 302);
}

function readKey(jsonEnv: string, legacyEnv: string): string {
  const packed = Deno.env.get(jsonEnv);
  if (packed) {
    try {
      const parsed = JSON.parse(packed);
      if (typeof parsed?.default === 'string' && parsed.default) return parsed.default;
    } catch {
      // fallback abaixo
    }
  }
  return Deno.env.get(legacyEnv) || '';
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const PUBLISHABLE_KEY = readKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
const SECRET_KEY = readKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

async function rpcUser(name: string, body: Record<string, unknown>, bearer: string) {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) throw new Error('Supabase público não configurado');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: PUBLISHABLE_KEY,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`RPC ${name}: ${response.status} ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

async function rpcAdmin(name: string, body: Record<string, unknown>) {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error('Supabase administrativo não configurado');
  const headers: Record<string, string> = {
    apikey: SECRET_KEY,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  // Compatibilidade com a chave service_role legada, quando aplicável.
  if (!SECRET_KEY.startsWith('sb_secret_')) headers.Authorization = `Bearer ${SECRET_KEY}`;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`RPC ${name}: ${response.status} ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

function bearerToken(req: Request) {
  const raw = req.headers.get('authorization') || '';
  const match = raw.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  // Etapa iniciada pelo Betel Radar. Exige sessão Supabase e permissão de administrador.
  if (action === 'start') {
    const token = bearerToken(req);
    if (!token) return json({ error: 'authentication_required' }, 401);

    try {
      const flow = await rpcUser('radar_olx_begin_oauth', {}, token);
      const config = await rpcAdmin('radar_olx_client_config', {});
      const auth = new URL(OLX_AUTH_URL);
      auth.searchParams.set('client_id', String(config.client_id));
      auth.searchParams.set('redirect_uri', String(config.redirect_uri));
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('scope', String(flow.scope || 'basic_user_info autoupload'));
      auth.searchParams.set('state', String(flow.state));
      return json({ authorization_url: auth.toString() });
    } catch (error) {
      console.error('OLX OAuth start failed:', error instanceof Error ? error.message : 'unknown');
      return json({ error: 'oauth_start_failed' }, 403);
    }
  }

  // Callback público registrado na OLX. A proteção é feita por state aleatório, expiração e uso único.
  const oauthError = url.searchParams.get('error');
  if (oauthError) return redirectResult('error', oauthError.slice(0, 64));

  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  if (!code || !state) return redirectResult('error', 'missing_code_or_state');

  try {
    const flow = await rpcAdmin('radar_olx_consume_state', { p_state: state });
    const config = await rpcAdmin('radar_olx_client_config', {});

    const form = new URLSearchParams({
      code,
      client_id: String(config.client_id),
      client_secret: String(config.client_secret),
      redirect_uri: String(config.redirect_uri),
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch(OLX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form,
    });
    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      console.error('OLX token exchange failed:', tokenResponse.status, tokenText.slice(0, 160));
      return redirectResult('error', 'token_exchange_failed');
    }

    let tokenData: Record<string, unknown> = {};
    try { tokenData = JSON.parse(tokenText); } catch { return redirectResult('error', 'invalid_token_response'); }
    const accessToken = String(tokenData.access_token || '');
    if (!accessToken) return redirectResult('error', 'missing_access_token');

    let userInfo: Record<string, unknown> = {};
    let basicInfoOk = false;
    try {
      const infoResponse = await fetch(OLX_BASIC_INFO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          Accept: 'application/json',
          'User-Agent': 'BetelRadar/0.8.2',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (infoResponse.ok) {
        const infoText = await infoResponse.text();
        userInfo = infoText ? JSON.parse(infoText) : {};
        basicInfoOk = true;
      }
    } catch {
      // O token continua válido mesmo que a leitura de dados básicos falhe momentaneamente.
    }

    await rpcAdmin('radar_olx_store_connection', {
      p_authorized_by: flow.requested_by,
      p_access_token: accessToken,
      p_token_type: String(tokenData.token_type || 'Bearer'),
      p_scope: String(flow.scope || 'basic_user_info autoupload'),
      p_olx_user_name: userInfo.user_name ? String(userInfo.user_name) : null,
      p_olx_user_email: userInfo.user_email ? String(userInfo.user_email) : null,
      p_metadata: {
        oauth_provider: 'olx',
        basic_user_info_ok: basicInfoOk,
        connected_via: 'betel-radar',
      },
    });

    return redirectResult('connected');
  } catch (error) {
    console.error('OLX OAuth callback failed:', error instanceof Error ? error.message : 'unknown');
    return redirectResult('error', 'callback_failed');
  }
});
