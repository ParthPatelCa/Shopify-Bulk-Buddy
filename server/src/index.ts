// Load env from monorepo root first, then local server .env
import dotenv from 'dotenv';
import path from 'path';
try { dotenv.config({ path: path.resolve(process.cwd(), '../.env') }); } catch {}
dotenv.config();
import express from 'express';
import cors from 'cors';
import { ensureInstalled } from './utils/ensureInstalled.js';
import productsRouter from './routes/products.js';
import bulkRouter from './routes/bulk.js';
import authRouter from './routes/auth.js';
import metafieldsRouter from './routes/metafields.js';
import diagRouter from './routes/diag.js';
import presetsRouter from './routes/presets.js';

// Validate required env early to avoid undefined usages later
const required = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'APP_URL', 'ENCRYPTION_KEY', 'DATABASE_URL'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth routes
app.use('/api/auth', authRouter);

// API routes
app.use('/api/products', ensureInstalled, productsRouter);
app.use('/api/bulk', ensureInstalled, bulkRouter);
app.use('/api/metafields', ensureInstalled, metafieldsRouter);
app.use('/api/diag', ensureInstalled, diagRouter);
app.use('/api/presets', ensureInstalled, presetsRouter);

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Serve Next.js frontend in dev proxy or behind same origin in prod.
// In dev you will run Next on :3001 and proxy from web, so server stays at :3000.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
