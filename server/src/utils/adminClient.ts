import { shopify } from '../shopify.js';

// Type representing enriched Shopify GraphQL errors we surface
export interface ShopifyGraphQLError extends Error {
  status?: number;
  userErrors?: Array<{ field?: string[]; message: string }>;
  retryAfterMs?: number;
}

export function getAdminClient(shop: string, accessToken: string) {
  // Ensure offline session semantics; token should already represent offline scope
  return new shopify.clients.Graphql({
    session: {
      shop,
      accessToken,
      isOnline: false,
      expires: undefined,
      scope: (process.env.SCOPES || ''),
      id: `${shop}_${Date.now()}`,
      state: 'offline'
    } as any
  });
}

interface GraphQLCallOptions {
  query: string;
  variables?: Record<string, any>;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number; // initial backoff
  factor?: number; // exponential factor
  maxDelayMs?: number; // cap
  onRetry?: (attempt: number, waitMs: number, reason: string) => void;
}

const defaultRetry: Required<RetryOptions> = {
  maxRetries: 5,
  baseDelayMs: 500,
  factor: 2,
  maxDelayMs: 8000,
  onRetry: () => {}
};

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function extractUserErrors(obj: any, acc: Array<{ field?: string[]; message: string }> = []): Array<{ field?: string[]; message: string }> {
  if (!obj || typeof obj !== 'object') return acc;
  if (Array.isArray(obj)) {
    for (const item of obj) extractUserErrors(item, acc);
  } else {
    if (Array.isArray(obj.userErrors)) {
      for (const ue of obj.userErrors) {
        if (ue && ue.message) acc.push({ field: ue.field, message: ue.message });
      }
    }
    for (const k of Object.keys(obj)) extractUserErrors(obj[k], acc);
  }
  return acc;
}

/**
 * Perform a GraphQL query with automatic retries on HTTP 429 (throttling) and network errors.
 * Throws a typed ShopifyGraphQLError including userErrors if present.
 */
export async function graphqlWithRetry(client: ReturnType<typeof getAdminClient>, call: GraphQLCallOptions, retryOpts: RetryOptions = {}) {
  const opts = { ...defaultRetry, ...retryOpts };
  let attempt = 0;
  // Keep last error to surface meaningful message
  let lastErr: any;
  while (attempt <= opts.maxRetries) {
    try {
      const response: any = await client.query({ data: { query: call.query, variables: call.variables || {} } });
      const { body } = response || {};
      if (body?.errors) {
        const err: ShopifyGraphQLError = new Error('Shopify GraphQL top-level errors');
        err.status = response.status;
        err.userErrors = body.errors.map((e: any) => ({ message: e.message, field: e.path }));
        throw err;
      }
      const userErrors = extractUserErrors(body?.data);
      if (userErrors.length) {
        const err: ShopifyGraphQLError = new Error('Shopify userErrors present');
        err.userErrors = userErrors;
        throw err;
      }
      return body?.data;
    } catch (e: any) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      // Determine if throttled (HTTP 429) or rate limit messaging
      const isThrottle = status === 429 || /throttl/i.test(e?.message || '');
      if (isThrottle && attempt < opts.maxRetries) {
        const wait = Math.min(opts.baseDelayMs * Math.pow(opts.factor, attempt), opts.maxDelayMs);
        opts.onRetry(attempt + 1, wait, 'throttle');
        await sleep(wait);
        attempt++;
        continue;
      }
      // Non-retryable or exceeded attempts
      if (e && e.userErrors) {
        throw e; // already typed
      }
      const err: ShopifyGraphQLError = new Error(e?.message || 'GraphQL request failed');
      err.status = status;
      throw err;
    }
  }
  // If we exit loop without returning, throw last error
  const finalErr: ShopifyGraphQLError = new Error(lastErr?.message || 'GraphQL retries exhausted');
  finalErr.status = lastErr?.status;
  throw finalErr;
}
