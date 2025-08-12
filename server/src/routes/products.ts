import express from 'express';
import { prisma } from '../prisma.js';
import crypto from 'crypto';
import { getAdminClient } from '../utils/adminClient.js';

const router = express.Router();

function decryptToken(blob: string) {
  const [ivB64, encB64] = blob.split(':');
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'dev').digest();
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// GET /api/products?shop=...&cursor=...&limit=...
router.get('/', async (req, res) => {
  const shop = (req as any).shop as string;
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);

  const first = Math.min(parseInt((req.query.limit as string) || '50'), 100);
  const after = req.query.cursor ? `, after: "${req.query.cursor}"` : '';

  const query = `#graphql
    query Products($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          cursor
          node {
            id
            title
            variants(first: 100) {
              edges {
                node {
                  id
                  sku
                  price
                  weight
                }
              }
            }
          }
          }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  try {
    const resp:any = await client.query({
      data: { query, variables: { first, after: req.query.cursor || null } }
    });
    res.json(resp.body.data.products);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'GraphQL error' });
  }
});

export default router;
