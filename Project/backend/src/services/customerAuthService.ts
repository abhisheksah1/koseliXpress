import crypto from 'crypto';

export type CustomerSessionPayload = {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
  provider: 'google' | 'auth0';
};

export type AuthPublicConfig =
  | { mode: 'auth0'; domain: string; clientId: string; audience?: string }
  | { mode: 'google'; googleClientId: string }
  | { mode: 'unconfigured' };

function sessionSecret(): string {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.ADMIN_PASSWORD ||
    'koseli-dev-auth-secret-change-me'
  );
}

export function getPublicAuthConfig(): AuthPublicConfig {
  const auth0Domain = (process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN || '').trim();
  const auth0ClientId = (process.env.AUTH0_CLIENT_ID || process.env.VITE_AUTH0_CLIENT_ID || '').trim();
  if (auth0Domain && auth0ClientId) {
    return {
      mode: 'auth0',
      domain: auth0Domain,
      clientId: auth0ClientId,
      audience: process.env.AUTH0_AUDIENCE || undefined,
    };
  }

  const googleClientId = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  if (googleClientId) {
    return { mode: 'google', googleClientId };
  }

  return { mode: 'unconfigured' };
}

export function getGoogleOAuthCredentials() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${backendUrl.replace(/\/$/, '')}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri, appUrl };
}

export function signCustomerSession(payload: CustomerSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', sessionSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyCustomerSession(token: string): CustomerSessionPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', sessionSecret()).update(data).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
    const json = Buffer.from(data, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as CustomerSessionPayload;
    if (!parsed.email || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleOAuthCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<CustomerSessionPayload> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth client credentials are not configured on the server.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('Google did not return an access token.');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error('Failed to load Google profile.');
  }

  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    throw new Error('Google account did not provide an email address.');
  }

  return {
    email: profile.email,
    name: profile.name || profile.email.split('@')[0],
    picture: profile.picture,
    sub: profile.sub,
    provider: 'google',
  };
}
