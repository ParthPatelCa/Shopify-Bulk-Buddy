import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
// Ensure env is loaded if this module is imported first
import dotenv from 'dotenv';
import path from 'path';
try { dotenv.config({ path: path.resolve(process.cwd(), '../.env') }); } catch {}
dotenv.config();

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
