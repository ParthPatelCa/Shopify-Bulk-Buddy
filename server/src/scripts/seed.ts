import { prisma } from '../prisma.js';

async function main() {
  // No-op seed for now. Useful pattern for future.
  console.log('No seed required. Use /api/auth/install to authorize a shop.');
}

main().finally(() => prisma.$disconnect());
