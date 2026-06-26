import { Router } from 'express';
import crypto from 'crypto';
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  getGoogleOAuthCredentials,
  getPublicAuthConfig,
  signCustomerSession,
  verifyCustomerSession,
} from '../services/customerAuthService.js';

const router = Router();

/** Public auth mode + client ids safe for browser */
router.get('/config', (_req, res) => {
  res.json(getPublicAuthConfig());
});

/** Start Google OAuth (server-side code flow) */
router.get('/google/start', (req, res) => {
  const cfg = getPublicAuthConfig();
  if (cfg.mode !== 'google') {
    return res.status(400).json({
      error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, or use Auth0.',
    });
  }

  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required.' });
  }

  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '/';
  const state = Buffer.from(
    JSON.stringify({
      nonce: crypto.randomBytes(16).toString('hex'),
      returnTo: returnTo.startsWith('/') ? returnTo : '/',
    })
  ).toString('base64url');

  res.json({ url: buildGoogleAuthUrl(state) });
});

/** Google OAuth callback — exchange code and redirect to storefront */
router.get('/google/callback', async (req, res) => {
  const appUrl = (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const error = typeof req.query.error === 'string' ? req.query.error : '';

  if (error) {
    return res.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent('missing_code')}`);
  }

  try {
    const session = await exchangeGoogleCode(code);
    const token = signCustomerSession(session);
    res.redirect(`${appUrl}/auth/callback?token=${encodeURIComponent(token)}&provider=google`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'google_auth_failed';
    res.redirect(`${appUrl}/auth/callback?error=${encodeURIComponent(message)}`);
  }
});

/** Verify signed session token from Google redirect */
router.post('/session', (req, res) => {
  const token = req.body?.token;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing session token.' });
  }
  const session = verifyCustomerSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
  res.json(session);
});

/** Optional connection test for admin */
router.get('/status', (_req, res) => {
  const cfg = getPublicAuthConfig();
  const google = getGoogleOAuthCredentials();
  res.json({
    ...cfg,
    googleRedirectUri: google.redirectUri,
    googleHasSecret: !!google.clientSecret,
  });
});

export default router;
