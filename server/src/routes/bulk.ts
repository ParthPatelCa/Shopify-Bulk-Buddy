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

// POST /api/bulk/preview  { changes: [{variantId, price?, sku?, weight?}] }
router.post('/preview', async (req, res) => {
  const { changes } = req.body;
  if (!Array.isArray(changes)) return res.status(400).json({ error: 'Invalid changes' });
  // Echo back with basic validation notes
  const notes = changes.map(c => {
    const errs:string[] = [];
    if (c.price && isNaN(Number(c.price))) errs.push('price not a number');
    if (c.weight && isNaN(Number(c.weight))) errs.push('weight not a number');
    return { ...c, errors: errs };
  });
  res.json({ notes });
});

// POST /api/bulk/apply { shop, description, changes: [...] }
router.post('/apply', async (req, res) => {
  const shop = (req as any).shop as string;
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);

  const { description = 'bulk update', changes = [] } = req.body;
  if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ error: 'No changes' });

  const chunks = [];
  const batchSize = 50;
  for (let i = 0; i < changes.length; i += batchSize) {
    chunks.push(changes.slice(i, i + batchSize));
  }

  try {
    for (const chunk of chunks) {
      const mutationLines = chunk.map((c, i) => {
        const fields = [];
        if (c.price != null) fields.push(`price: \"${c.price}\"`);
        if (c.sku != null) fields.push(`sku: \"${c.sku}\"`);
        if (c.weight != null) fields.push(`weight: ${Number(c.weight)}`);
        return `v${i}: productVariantUpdate(input: { id: \"${c.variantId}\", ${fields.join(', ')} }) { userErrors { field message } }`;
      }).join('\n');

      const mutation = `mutation { ${mutationLines} }`;
      await client.query({ data: { query: mutation } });
    }

    await prisma.batch.create({
      data: { shop, description, payloadJson: JSON.stringify(changes).slice(0, 500000) }
    });

    res.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Bulk apply failed' });
  }
});

export default router;
