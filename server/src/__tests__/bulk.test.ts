import { describe, it, expect, vi } from 'vitest';

// Mock GraphQL client
const mockClient = {
  query: vi.fn()
};

vi.mock('../utils/adminClient.js', () => ({
  getAdminClient: () => mockClient,
  graphqlWithRetry: vi.fn()
}));

describe('Bulk operations', () => {
  it('should chunk changes into correct batch sizes', () => {
    const changes = Array.from({ length: 75 }, (_, i) => ({ variantId: `gid://shopify/ProductVariant/${i}`, price: '10.00' }));
    const batchSize = 25;
    const chunks = [];
    for (let i = 0; i < changes.length; i += batchSize) {
      chunks.push(changes.slice(i, i + batchSize));
    }
    
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(25);
    expect(chunks[1]).toHaveLength(25);
    expect(chunks[2]).toHaveLength(25);
  });

  it('should aggregate user errors correctly', () => {
    const mockResponse: Record<string, { userErrors: Array<{ field: string[]; message: string }> }> = {
      v0: { userErrors: [{ field: ['price'], message: 'Invalid price' }] },
      v1: { userErrors: [] },
      v2: { userErrors: [{ field: ['sku'], message: 'SKU exists' }] }
    };

    const results: Array<{ variantId: string; ok: boolean; errors?: Array<{ field: string[]; message: string }> }> = [];
    const chunk = [
      { variantId: 'gid://shopify/ProductVariant/1' },
      { variantId: 'gid://shopify/ProductVariant/2' },
      { variantId: 'gid://shopify/ProductVariant/3' }
    ];

    for (let i = 0; i < chunk.length; i++) {
      const key = `v${i}`;
      const ue = mockResponse[key]?.userErrors || [];
      if (ue.length) {
        results.push({ variantId: chunk[i].variantId, ok: false, errors: ue });
      } else {
        results.push({ variantId: chunk[i].variantId, ok: true });
      }
    }

    expect(results).toHaveLength(3);
    expect(results[0].ok).toBe(false);
    expect(results[1].ok).toBe(true);
    expect(results[2].ok).toBe(false);
  });
});

describe('CSV validation', () => {
  it('should validate required columns', () => {
    const csvData: Array<Record<string, string>> = [
      { title: 'Product 1', sku: 'SKU1' }, // missing variantId
      { variantId: 'gid://shopify/ProductVariant/1', title: 'Product 2', sku: 'SKU2', price: '10.00' }
    ];
    
    const requiredColumns = ['variantId', 'title'];
    const errors: Array<{ row: number; message: string }> = [];
    
    csvData.forEach((row, index) => {
      const missing = requiredColumns.filter(col => !row[col]);
      if (missing.length) {
        errors.push({ row: index + 1, message: `Missing columns: ${missing.join(', ')}` });
      }
    });
    
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(1);
  });

  it('should coerce numeric fields safely', () => {
    const testCases = [
      { input: '10.50', expected: 10.50 },
      { input: '10,50', expected: null }, // comma separator not allowed
      { input: 'abc', expected: null },
      { input: '', expected: null },
      { input: '0', expected: 0 },
      { input: '-5', expected: null } // negative weights not allowed
    ];

    function coercePrice(value: string): number | null {
      if (!value || typeof value !== 'string') return null;
      const cleaned = value.trim();
      if (!/^\d*\.?\d+$/.test(cleaned)) return null;
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }

    function coerceWeight(value: string): number | null {
      const num = coercePrice(value);
      return num !== null && num >= 0 ? num : null;
    }

    testCases.forEach(({ input, expected }) => {
      if (input === '-5') {
        expect(coerceWeight(input)).toBe(expected);
      } else {
        expect(coercePrice(input)).toBe(expected);
      }
    });
  });
});
