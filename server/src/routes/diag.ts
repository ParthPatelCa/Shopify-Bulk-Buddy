import express from 'express';
import { prisma } from '../prisma.js';
import { getAdminClient } from '../utils/adminClient.js';
import { decryptToken } from '../utils/encryption.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const shop = (req as any).shop as string;
  const report: any = { shop, env: {}, db: {}, shopify: {} };
  const required = ['SHOPIFY_API_KEY','SHOPIFY_API_SECRET','APP_URL','ENCRYPTION_KEY','DATABASE_URL'];
  report.env.missing = required.filter(k => !process.env[k]);

  try {
    await prisma.$queryRaw`SELECT 1`;
    report.db.ok = true;
  } catch (e: any) {
    report.db.ok = false;
    report.db.error = e?.message;
  }

  try {
    const row = await prisma.shop.findUnique({ where: { shop } });
    if (row) {
      const { token } = decryptToken(row.accessToken);
      const client = getAdminClient(shop, token);
      const q = `#graphql { shop { name } }`;
      const resp: any = await client.query({ data: { query: q } });
      report.shopify.ok = true;
      report.shopify.shopName = resp.body.data.shop.name;
    } else {
      report.shopify.ok = false;
      report.shopify.error = 'Not installed';
    }
  } catch (e: any) {
    report.shopify.ok = false;
    report.shopify.error = e?.message;
  }

  res.json(report);
});

export default router;
