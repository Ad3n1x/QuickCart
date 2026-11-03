# QuickCart architecture

## Implemented on the refactor branch

The live root entrypoints are deliberately retained for compatibility, but the implementation has begun moving behind them:

- `src/App.jsx` is now a compatibility export; app composition lives in `src/app/App.jsx`.
- Seller dashboard views, public storefront/order tracking, landing/authentication and receipt views are separated under `src/features/`.
- Shared UI primitives and phone input are under `src/components/`; formatting, identity, order, receipt, navigation and JSON helpers are under `src/lib/`.
- The global stylesheet lives in `src/styles/main.css`; `src/index.css` remains the stable Vite stylesheet entrypoint.
- `api/index.js` remains the Vercel-compatible Express entrypoint and now composes separate route modules under `server/src/routes/`.
- MongoDB connection, auth middleware/services, email, payments, plans, store lookup and identity helpers are isolated under `server/src/`.
- A pull-request CI workflow runs syntax/invariant checks and a Vite production build.

This is still a modular monolith. The migration has not been merged or switched to a new deployment root. API contract and browser regression verification must pass before merge.

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

## Client structure

The active Vite client remains in the root `src/` directory so the current deployment root, public assets and PWA paths do not need to change during this refactor.

```text
src/
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

`src/main.jsx` remains the live Vite entrypoint. A separate `client/` directory is intentionally not introduced until Vite's root, base path, public assets, PWA/service-worker paths, and GitHub Pages workflow can be migrated and tested together.

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
| `src/App.jsx` | `src/app/App.jsx` (root file is a compatibility export); features under `src/features/` |
| `src/index.css` | `src/styles/main.css` (root file is a stable import shim) |
| `src/lib/api.js` | `client/src/lib/api/` |
| `api/index.js` | Vercel-compatible composition root registering `server/src/routes/*` and `server/src/services/*` |
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
