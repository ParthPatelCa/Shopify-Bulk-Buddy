import express from 'express';
import { prisma } from '../prisma.js';
import crypto from 'crypto';
import { getAdminClient, graphqlWithRetry } from '../utils/adminClient.js';
import cryptoLib from 'crypto';

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

  const { description = 'bulk update', changes = [], metafields = [] } = req.body;
  if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ error: 'No changes' });

  const batchSize = 25; // safer smaller chunk to reduce throttling
  const delayMs = 500; // wait between chunks

  const chunks: any[] = [];
  for (let i = 0; i < changes.length; i += batchSize) chunks.push(changes.slice(i, i + batchSize));

  const results: any[] = [];
  let successCount = 0;
  let errorCount = 0;
  const beforeSnapshots: Record<string, any> = {};

  try {
    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci];
      // Build multi-mutation
  const mutationLines = chunk.map((c: any, i: number) => {
        const fields: string[] = [];
        if (c.price != null) fields.push(`price: \"${c.price}\"`);
        if (c.sku != null) fields.push(`sku: \"${c.sku}\"`);
        if (c.weight != null) fields.push(`weight: ${Number(c.weight)}`);
        return `v${i}: productVariantUpdate(input: { id: \"${c.variantId}\", ${fields.join(', ')} }) { userErrors { field message } }`;
      }).join('\n');
      const mutation = `mutation { ${mutationLines} }`;
      const data = await graphqlWithRetry(client, { query: mutation });
      // Extract per sub-mutation userErrors
      for (let i = 0; i < chunk.length; i++) {
        const key = `v${i}`;
        const ue = (data?.[key]?.userErrors) || [];
        if (ue.length) {
          errorCount++;
          results.push({ variantId: chunk[i].variantId, ok: false, errors: ue });
        } else {
          successCount++;
          results.push({ variantId: chunk[i].variantId, ok: true });
        }
      }
      if (ci < chunks.length - 1) await new Promise(r => setTimeout(r, delayMs));
    }

    // Record batch + change log (calculate checksum)
    const batchRec = await prisma.batch.create({
      data: { shop, description, payloadJson: JSON.stringify(changes).slice(0, 500000) }
    });
    const checksum = cryptoLib.createHash('sha256').update(JSON.stringify(changes)).digest('hex');
    await (prisma as any).changeLog.create({
      data: { shop, changesJson: JSON.stringify({ changes, results }), checksum }
    });    res.json({
      ok: errorCount === 0,
      successCount,
      errorCount,
      total: changes.length,
      batchId: batchRec.id,
      chunkCount: chunks.length,
      results
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: 'Bulk apply failed', details: e?.message });
  }
});

// Rollback last ChangeLog (simple inverse: requires providing previous values in original change set in future enhancement)
router.post('/rollback', async (req, res) => {
  const shop = (req as any).shop as string;
  const row = await prisma.shop.findFirst({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'No shop' });
  const token = decryptToken(row.accessToken);
  const client = getAdminClient(shop, token);
  const last = await (prisma as any).changeLog?.findFirst({ where: { shop }, orderBy: { id: 'desc' } });
  if (!last) return res.status(404).json({ error: 'No change log' });
  const parsed = JSON.parse(last.changesJson || '{}');
  const originalChanges = parsed.changes || [];
  if (!Array.isArray(originalChanges) || originalChanges.length === 0) {
    return res.status(400).json({ error: 'No changes to rollback' });
  }
  // Inverse: we cannot restore previous values unless they were captured; placeholder behavior.
  return res.status(501).json({ error: 'Rollback not fully implemented: previous values not stored in change log.' });
});

export default router;
