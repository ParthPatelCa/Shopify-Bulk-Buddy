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

2. Copy environment file and fill values:
   ```bash
   cp .env.example .env
   # Fill SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, APP_URL, and ENCRYPTION_KEY
   ```

3. Dev run:
   ```bash
   npm run dev
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

- `npm run dev` — Runs server and Next together with `concurrently`.
- `npm run build` — Builds Next and prepares server.
- `npm run start` — Starts production server.
- `npm run prisma:push` — Pushes Prisma schema to SQLite.
- `npm run seed` — Seeds a dev shop row for local testing.

## Structure

```
/server         Express API, Shopify OAuth, GraphQL helpers, Prisma client
/web            Next.js 14 app with App Bridge wrapper and basic table editor
/prisma         Prisma schema for SQLite
```

## Notes

- The OAuth flow stores offline tokens encrypted in SQLite using Prisma.
- The UI loads products and variants via our API and shows an editable table.
- Bulk edits preview changes before sending mutations to Shopify.
- CSV import/export is included with basic validation.
- You will still need to set up your app in the Partner dashboard and configure the **App Bridge** URL allowlist for embedded usage.
