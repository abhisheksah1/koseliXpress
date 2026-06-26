import { createAuth0Client, type Auth0Client, type User } from '@auth0/auth0-spa-js';

export type CustomerSession = {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
  provider?: 'google' | 'auth0';
};

export type AuthPublicConfig =
  | { mode: 'auth0'; domain: string; clientId: string; audience?: string }
  | { mode: 'google'; googleClientId: string }
  | { mode: 'unconfigured' };

const STORAGE_KEY = 'google_customer_auth';

let auth0Client: Auth0Client | null = null;

export function loadCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CustomerSession) : null;
  } catch {
    return null;
  }
}

export function saveCustomerSession(user: CustomerSession | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export async function fetchAuthConfig(): Promise<AuthPublicConfig> {
  const res = await fetch('/api/auth/config');
  if (!res.ok) return { mode: 'unconfigured' };
  return res.json();
}

async function getAuth0Client(domain: string, clientId: string, audience?: string): Promise<Auth0Client> {
  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain,
      clientId,
      authorizationParams: {
        redirect_uri: `${window.location.origin}/auth/callback`,
        ...(audience ? { audience } : {}),
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true,
    });
  }
  return auth0Client;
}

function auth0UserToSession(user: User): CustomerSession {
  return {
    email: user.email || '',
    name: user.name || user.nickname || user.email?.split('@')[0] || 'Gifter',
    picture: user.picture,
    sub: user.sub,
    provider: 'auth0',
  };
}

/** Redirect to Auth0 Universal Login (Google connection) */
export async function loginWithAuth0(config: Extract<AuthPublicConfig, { mode: 'auth0' }>): Promise<void> {
  const client = await getAuth0Client(config.domain, config.clientId, config.audience);
  await client.loginWithRedirect({
    authorizationParams: {
      connection: 'google-oauth2',
    },
    appState: {
      returnTo: window.location.pathname + window.location.search,
      openPortal: true,
    },
  });
}

/** Redirect to Google via backend OAuth */
export async function loginWithGoogleOAuth(): Promise<void> {
  const returnTo = window.location.pathname + window.location.search;
  const res = await fetch(`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`);
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Could not start Google sign-in.');
  }
  window.location.href = data.url;
}

/** Primary entry — picks Auth0 or Google based on server config */
export async function startGoogleLogin(): Promise<void> {
  const config = await fetchAuthConfig();
  if (config.mode === 'auth0') {
    await loginWithAuth0(config);
    return;
  }
  if (config.mode === 'google') {
    await loginWithGoogleOAuth();
    return;
  }
  throw new Error(
    'Customer Google login is not configured. Add AUTH0_DOMAIN + AUTH0_CLIENT_ID or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET to your .env file.'
  );
}

/** Handle /auth/callback after Google server redirect */
export async function handleGoogleCallbackToken(token: string): Promise<CustomerSession> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Session verification failed.');
  }
  return data as CustomerSession;
}

/** Handle /auth/callback after Auth0 redirect */
export async function handleAuth0Callback(): Promise<CustomerSession | null> {
  const config = await fetchAuthConfig();
  if (config.mode !== 'auth0') return null;

  const client = await getAuth0Client(config.domain, config.clientId, config.audience);
  await client.handleRedirectCallback();
  const user = await client.getUser();
  if (!user?.email) return null;
  return auth0UserToSession(user);
}

export async function logoutAuth0IfNeeded(): Promise<void> {
  const config = await fetchAuthConfig();
  if (config.mode !== 'auth0') return;
  try {
    const client = await getAuth0Client(config.domain, config.clientId, config.audience);
    const authed = await client.isAuthenticated();
    if (authed) {
      await client.logout({
        logoutParams: { returnTo: window.location.origin },
      });
    }
  } catch {
    /* ignore */
  }
}
