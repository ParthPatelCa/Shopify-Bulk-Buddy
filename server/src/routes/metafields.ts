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

router.get('/definitions', async (req, res) => {
  const shop = (req as any).shop;
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);
  // Basic query for first 50 product + variant metafield definitions
  const query = `#graphql
    query defs($ownerType: MetafieldOwnerType!) {
      metafieldDefinitions(ownerType: $ownerType, first: 50) { edges { node { id name key namespace type } } }
    }
  `;
  try {
    const productDefs: any = await client.query({ data: { query, variables: { ownerType: 'PRODUCT' } } });
    const variantDefs: any = await client.query({ data: { query, variables: { ownerType: 'PRODUCTVARIANT' } } });
    res.json({ product: productDefs.body.data.metafieldDefinitions.edges.map((e: any) => e.node), variant: variantDefs.body.data.metafieldDefinitions.edges.map((e: any) => e.node) });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Metafield definitions fetch failed' });
  }
});

router.post('/values', async (req, res) => {
  const { ownerIds = [] } = req.body;
  const shop = (req as any).shop;
  if (!Array.isArray(ownerIds) || ownerIds.length === 0) return res.status(400).json({ error: 'ownerIds required' });
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);
  // Fetch up to 20 owners per query
  const chunks: string[][] = [];
  for (let i = 0; i < ownerIds.length; i += 20) chunks.push(ownerIds.slice(i, i + 20));
  const results: any[] = [];
  for (const chunk of chunks) {
    const query = `#graphql
      query metafields($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product { id metafields(first: 50) { edges { node { id key namespace type value } } } }
          ... on ProductVariant { id metafields(first: 50) { edges { node { id key namespace type value } } } }
        }
      }
    `;
    try {
      const resp: any = await client.query({ data: { query, variables: { ids: chunk } } });
      results.push(...resp.body.data.nodes);
    } catch (e: any) {
      console.error('metafields values chunk failed', e?.message);
    }
  }
  res.json({ nodes: results });
});

router.post('/set', async (req, res) => {
  const { metafields = [] } = req.body; // [{ownerId, namespace, key, type, value}]
  if (!Array.isArray(metafields) || metafields.length === 0) return res.status(400).json({ error: 'metafields required' });
  const shop = (req as any).shop;
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);

  // Batch metafieldsSet; limit size to avoid throttling
  const chunks: any[] = [];
  const batchSize = 20;
  for (let i = 0; i < metafields.length; i += batchSize) chunks.push(metafields.slice(i, i + batchSize));
  const responses: any[] = [];
  try {
    for (const chunk of chunks) {
      const mutation = `#graphql
        mutation setMeta($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields { id owner { __typename ... on Product { id } ... on ProductVariant { id } } key namespace value type }
            userErrors { field message }
          }
        }
      `;
      const resp: any = await client.query({ data: { query: mutation, variables: { metafields: chunk } } });
      responses.push(resp.body.data.metafieldsSet);
      await new Promise(r => setTimeout(r, 400));
    }
    res.json({ results: responses });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'metafieldsSet failed', details: e?.message });
  }
});

export default router;
