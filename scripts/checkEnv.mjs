#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load root .env
const rootEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });

const required = ['SHOPIFY_API_KEY','SHOPIFY_API_SECRET','APP_URL','ENCRYPTION_KEY','DATABASE_URL'];
const missing = required.filter(k => !process.env[k] || process.env[k].includes('dummy'));
if (missing.length) {
  console.error('[checkEnv] Missing or dummy env vars: ' + missing.join(', '));
  process.exit(1);
}
console.log('[checkEnv] Env OK');
