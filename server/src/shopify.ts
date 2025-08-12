import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';

if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET || !process.env.APP_URL) {
  throw new Error('Missing SHOPIFY_API_KEY, SHOPIFY_API_SECRET, or APP_URL');
}

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: (process.env.SCOPES || 'read_products,write_products').split(','),
  hostName: process.env.APP_URL!.replace(/^https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true
});
