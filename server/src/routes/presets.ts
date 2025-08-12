import express from 'express';
import { prisma } from '../prisma.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const shop = (req as any).shop as string;
  const list = await (prisma as any).preset.findMany({ where: { shop }, orderBy: { createdAt: 'desc' } });
  res.json(list);
});

router.post('/', async (req, res) => {
  const shop = (req as any).shop as string;
  const { name, filters = {}, columns = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const rec = await (prisma as any).preset.create({ data: { shop, name, filtersJson: JSON.stringify(filters), columnsJson: JSON.stringify(columns) } });
  res.json(rec);
});

router.delete('/:id', async (req, res) => {
  const shop = (req as any).shop as string;
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  await (prisma as any).preset.deleteMany({ where: { id, shop } });
  res.json({ ok: true });
});

export default router;
