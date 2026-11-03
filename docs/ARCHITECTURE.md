# QuickCart architecture

## Target

QuickCart remains a modular monolith: one React/Vite client, one Express API, and one MongoDB database. Features are isolated by business domain; deployment remains compatible with the existing GitHub/Vercel/Render workflow.

## Migration rules

- Preserve the existing root-level production entrypoints until a feature has been migrated and verified.
- Do not move or rename `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`, `api/index.js`, `server.js`, `vite.config.js`, `vercel.json`, or deployment workflows in the scaffolding stage.
- Migrate one feature at a time; keep temporary compatibility exports where necessary.
- Keep seller and customer authentication contexts separate.
- Enforce store ownership on every seller data operation.
- Keep customer order history scoped to the authenticated customer and store.
- Preserve order idempotency, payment verification, and webhook signature checks.
- Never commit environment secrets or production credentials.

## Client target

```text
client/src/
  app/                 # App composition, router, providers
  features/
    auth/
    storefront/
    products/
    orders/
    customers/
    analytics/
    discounts/
    payments/
    subscriptions/
    settings/
  components/
    ui/
    layout/
    common/
  hooks/
  lib/                 # API client and shared browser integrations
  services/
  styles/
  utils/
```

The current `src/main.jsx` remains the live Vite entrypoint during migration. Move it only after Vite's root, base path, public assets, PWA/service-worker paths, and GitHub Pages workflow have been updated and tested together.

## Server target

```text
server/src/
  config/              # MongoDB connection and environment validation
  modules/
    auth/
    users/
    stores/
    products/
    orders/
    customers/
    analytics/
    payments/
    subscriptions/
    notifications/
  middleware/
  services/             # Cross-domain integrations
  utils/
  app.js                # Express app composition
  server.js             # Process entrypoint
```

The existing `api/index.js` currently owns the live Express application and many API handlers. Extract each domain into a router, controller, service, and repository only after recording its routes and regression tests. Keep `server.js` as a compatibility entrypoint for Render until deployment is deliberately switched.

## Shared and quality layers

```text
shared/
  constants/
  validation/
tests/
  unit/
  integration/
  e2e/
```

Only put genuinely environment-neutral schemas/constants in `shared`. Do not share server secrets or database models with the browser.

## Existing source-to-target map

| Existing source | Target |
|---|---|
| `src/main.jsx` | `client/src/main.jsx` (after Vite/deployment migration) |
| `src/App.jsx` | `client/src/app/App.jsx`, then feature pages/components |
| `src/index.css` | `client/src/styles/` and feature-level styles |
| `src/lib/api.js` | `client/src/lib/api/` |
| `api/index.js` | `server/src/app.js` plus domain modules |
| `server.js` | `server/src/server.js` |
| `public/` | `client/public/` (after PWA and base-path verification) |
| `backend/` | Audit separately; do not mix its AppDeploy SDK implementation into the Express runtime |
| `scripts/` | Root `scripts/` |

## Migration sequence

1. Add route inventory and baseline checks for current behavior.
2. Extract shared frontend primitives and API client without changing UI.
3. Split React features incrementally, preserving routes and state behavior.
4. Extract Express middleware and database configuration.
5. Extract one API domain at a time; retain endpoint contracts.
6. Add unit/integration/E2E coverage for auth, store isolation, carts, orders, payment callbacks, and subscriptions.
7. Switch deployment roots only after local build, production build, and hosted smoke tests pass.

## Definition of done

- Existing public storefront and seller dashboard behave as before.
- Seller/customer credentials cannot leak across contexts.
- Every seller mutation verifies store ownership server-side.
- Customer history and cart data remain correctly scoped.
- Payment callbacks are verified server-side and are idempotent.
- `npm run check` and `npm run build` pass, plus API integration and browser smoke tests.
- GitHub Pages base path, Vercel routing, Render start command, and PWA service-worker scope are verified.
