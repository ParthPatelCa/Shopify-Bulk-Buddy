import express from 'express';
import { encryptToken } from '../utils/encryption.js';
import { shopify } from '../shopify.js';
import { prisma } from '../prisma.js';

// Simple *.myshopify.com validation (public pattern)
function isValidShop(shop: string | undefined): shop is string {
  if (!shop) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop);
}

function verifyRedirectConfig() {
  const appUrl = process.env.APP_URL;
  const frontend = process.env.FRONTEND_URL;
  const problems: string[] = [];
  if (!appUrl) problems.push('APP_URL missing');
  if (appUrl && !/^https?:\/\/localhost:\d+/.test(appUrl)) {
    // Dev expectation; not an error, just note if unusual during local run.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] APP_URL is not a localhost URL; ensure tunnel / partner settings are correct.');
    }
  }
  if (!frontend) problems.push('FRONTEND_URL missing');
  if (problems.length) {
    console.error('[auth] Redirect configuration issues:', problems.join(', '));
  }
}

verifyRedirectConfig();

const router = express.Router();

router.get('/install', async (req, res) => {
  const shop = req.query.shop as string | undefined;
  if (!isValidShop(shop)) {
    return res.status(400).json({ error: 'Invalid shop parameter. Expect <shop>.myshopify.com' });
  }
  try {
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res
    });
    res.redirect(authRoute);
  } catch (e: any) {
    console.error('[auth/install] Error starting OAuth', { shop, message: e?.message });
    res.status(500).json({ error: 'OAuth initiation failed' });
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res
    });
  // Encrypt token at rest with version (current version from env or 1)
  const keyVersion = Number(process.env.ENCRYPTION_KEY_VERSION || '1');
  const blob = encryptToken(session.accessToken!, keyVersion);

    await prisma.shop.upsert({
      where: { shop: session.shop },
  create: { shop: session.shop, accessToken: blob, keyVersion },
  update: { accessToken: blob, keyVersion }
    });

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3001';
    const embeddedUrl = `${frontend}/embedded?shop=${encodeURIComponent(session.shop)}`;
    const rootUrl = `${frontend}/?shop=${encodeURIComponent(session.shop)}`;
    res.status(200).set('Content-Type', 'text/html').send(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>App Installed</title><style>body{font-family:system-ui,Segoe UI,Arial;margin:40px;line-height:1.4;color:#222}a.button{display:inline-block;padding:10px 18px;background:#0a5;color:#fff;text-decoration:none;border-radius:6px;margin-right:12px}code{background:#f4f4f4;padding:2px 5px;border-radius:4px}</style></head><body><h1>App Authorized</h1><p>Shop <code>${session.shop}</code> has been authorized.</p><p>Continue:</p><p><a class="button" href="${embeddedUrl}">Open Embedded App</a> <a class="button" style="background:#0366d6" href="${rootUrl}">Open Root UI</a></p><p>You can safely close this window.</p></body></html>`);
  } catch (e: any) {
    console.error('[auth/callback] OAuth error', {
      shop: (req.query.shop as string) || undefined,
      message: e?.message
    });
    res.status(500).json({ error: 'Auth error' });
  }
});

router.get('/exit', (_req, res) => res.send('You can close this window.'));

export default router;
