# Shopify Bulk Buddy (MVP)

A minimal, production-leaning scaffold for a Shopify bulk variant and metafield editor.
It uses Next.js for the UI, Express for backend API, SQLite for storage, and the official `@shopify/shopify-api` SDK for OAuth and GraphQL calls.

> This is an MVP scaffold, not a finished app.
> It includes working OAuth routes, a basic token store, product fetch, CSV import/export, and a bulk save preview flow.

## Quick start

1. Install dependencies:
   ```bash
   npm i
   ```

2. Copy environment file and fill values (both public + secret keys):
   ```bash
   cp .env.example .env
   # Set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, NEXT_PUBLIC_SHOPIFY_API_KEY (same as key), ENCRYPTION_KEY
   # Optionally adjust SCOPES. Keep APP_URL=http://localhost:3000 for local.
   ```

3. Dev run (guards check required env + free ports first):
   ```bash
   npm run dev
   # predev runs scripts/checkEnv.mjs (fails fast if missing/dummy vars)
   # then scripts/checkPorts.mjs (ensures 3000 & 3001 free)
   ```

4. In your Shopify Partner dashboard, set **App URL** to `http://localhost:3000/api/auth/callback` and **Allowed redirection URL(s)** to:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/api/auth/exit`
   - `http://localhost:3000/api/auth/online/callback`

5. Install on a dev store by visiting:
   ```
   http://localhost:3000/api/auth/install?shop=<your-dev-store>.myshopify.com
   ```

## Scripts

- `npm run dev` — Concurrent dev (Express on :3000, Next on :3001) with pre-flight env/port checks.
- `npm run build` — Builds Next (server is TS so compile separately if needed via server workspace `build`).
- `npm run start` — Starts production server (prestart env check runs first).
- `npm run prisma:push` — Pushes Prisma schema to SQLite and generates client.
- `npm run seed` — Runs seed script (currently a no-op placeholder).

### Guard scripts
| Script | Purpose |
|--------|---------|
| `scripts/checkEnv.mjs` | Ensures required env vars exist & not dummy before launch. |
| `scripts/checkPorts.mjs` | Verifies ports 3000/3001 are free (adjust with PORT/NEXT_PORT). |

## Structure

```
/server         Express API, Shopify OAuth, GraphQL helpers, Prisma client
/web            Next.js 14 app with App Bridge wrapper and basic table editor
/prisma         Prisma schema for SQLite
```

## Notes

- The OAuth flow stores offline tokens encrypted in SQLite using Prisma.
- The UI loads products & variants via the API and shows an editable table (supports CSV import/export & bulk variant updates).
- Bulk edits preview changes before sending mutations to Shopify; userErrors are surfaced server-side when using the retry helper.
- You will still need to set up your app in the Partner dashboard and configure the **App Bridge** URL allowlist for embedded usage.

## Embedded mode
After successful OAuth callback a simple HTML success page links to `/embedded?shop=<shop>` which loads the Polaris/App Bridge wrapped UI (Next.js route at `app/embedded/page.tsx`).

## Troubleshooting
| Issue | Fix |
|-------|-----|
| `Missing SHOPIFY_API_KEY...` exit | Set values in `.env` (both SHOPIFY_API_KEY & NEXT_PUBLIC_SHOPIFY_API_KEY). |
| Port in use (EADDRINUSE) | Stop other processes or change `PORT` / `NEXT_PORT` in `.env`. |
| OAuth redirect mismatch | Ensure Partner App URL & redirect URLs exactly match those in step 4. |
| 429 throttling | Server retry helper (`graphqlWithRetry`) auto-backs off; consider reducing batch size. |

