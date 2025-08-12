import express from 'express';
import crypto from 'crypto';
import { shopify } from '../shopify.js';
import { prisma } from '../prisma.js';

const router = express.Router();

router.get('/install', async (req, res) => {
  const shop = req.query.shop as string;
  if (!shop) return res.status(400).send('Missing shop');
  const authRoute = await shopify.auth.begin({
    shop,
    callbackPath: '/api/auth/callback',
    isOnline: false
  });
  res.redirect(authRoute);
});

router.get('/callback', async (req, res) => {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res
    });
    // Encrypt token at rest
    const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'dev').digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const enc = Buffer.concat([cipher.update(session.accessToken), cipher.final()]).toString('base64');
    const blob = `${iv.toString('base64')}:${enc}`;

    await prisma.shop.upsert({
      where: { shop: session.shop },
      create: { shop: session.shop, accessToken: blob },
      update: { accessToken: blob }
    });

    res.redirect(`/embedded?shop=${encodeURIComponent(session.shop)}`);
  } catch (e: any) {
    console.error(e);
    res.status(500).send('Auth error');
  }
});

router.get('/exit', (_req, res) => res.send('You can close this window.'));

export default router;
