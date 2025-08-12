import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

export async function ensureInstalled(req: Request, res: Response, next: NextFunction) {
  const shop = (req.query.shop as string) || (req.headers['x-shop'] as string);
  if (!shop) return res.status(400).json({ error: 'Missing shop' });
  const row = await prisma.shop.findUnique({ where: { shop } });
  if (!row) return res.status(401).json({ error: 'App not installed for shop' });
  (req as any).shop = shop;
  (req as any).accessToken = row.accessToken;
  next();
}
