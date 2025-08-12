import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { shopify } from './shopify.js';
import { prisma } from './prisma.js';
import { ensureInstalled } from './utils/ensureInstalled.js';
import { getAdminClient } from './utils/adminClient.js';
import productsRouter from './routes/products.js';
import bulkRouter from './routes/bulk.js';
import authRouter from './routes/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth routes
app.use('/api/auth', authRouter);

// API routes
app.use('/api/products', ensureInstalled, productsRouter);
app.use('/api/bulk', ensureInstalled, bulkRouter);

// Health
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Serve Next.js frontend in dev proxy or behind same origin in prod.
// In dev you will run Next on :3001 and proxy from web, so server stays at :3000.

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
