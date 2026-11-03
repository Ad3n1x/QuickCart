# QuickCart implementation audit

Audit date: 2026-11-03  
Audited base: `main` at `0b8cbd51ef75b552dc1fcd910d641aa1d306a889`  
Working branch: `implementation/business-os-phase-1`

## Existing system

- Public repository: `Ad3n1x/QuickCart`; default branch is `main`.
- Active frontend: React 19 + Vite 6, with the existing root `src/` entrypoint.
- Active API: Express 5 in `api/index.js`, started through `server.js`.
- Persistence: MongoDB Node driver 6 / MongoDB Atlas.
- Authentication: separate seller and customer JWT flows.
- Existing integrations: Brevo email and ALATPay payment initialization.
- Existing deployment files include Vercel configuration and GitHub Pages workflows.
- The live frontend/API entrypoints and deployment paths must remain compatible during incremental work.

## Existing capabilities confirmed in source

- Seller registration and authentication.
- Store setup, public storefront and product management.
- Customer accounts and customer order history.
- Cart persistence separated by store and guest/customer identity.
- Checkout with server-side product/price lookup, stock validation and order idempotency.
- Order tracking using a per-order confirmation token.
- Seller order management and manual order creation.
- Discounts and existing monetization configuration.
- Receipt scanning and receipt generation.
- Seller dashboard, customer list and basic order-derived analytics.
- WhatsApp status message drafting through a seller-triggered `wa.me` link, now routed through a shared Nigerian-number normalizer and status template helper.

## Launch-free state confirmed

- `server/src/config/plans.js` returns the Free plan and removes store limits.
- Paid plan checkout is paused while the previous plan/payment implementation is retained.
- Discount endpoints no longer enforce paid-tier restrictions.
- Manual seller order creation exists on the active branch.
- These existing behaviours must remain intact.

## Gaps and risks found

### Critical

1. **Guest checkout was not actually guest-accessible on the base branch.** The order endpoint rejected requests without a verified customer JWT even though the storefront persisted guest carts and the order model supported confirmation tokens. The Phase 1 branch changes this to optional customer authentication, requires a customer name and phone, and retains per-order confirmation-token authorization.
2. **ALATPay callback verification needs a provider-specific security review.** The visible callback handler updates payment state from the request body and does not show a signature/authenticity check. Do not treat callback data as trusted or release payment automation until the current ALATPay verification mechanism is implemented and tested.
3. **Automated integration and browser E2E coverage is missing.** Existing quality checks are mostly source invariants plus a small unit-test suite. Production workflows need real API and browser tests.

### High priority

1. **Analytics were summaries, not actual graphs.** The base dashboard calculated totals and status/product counts from orders but did not provide time-series charts or reporting-period controls. Phase 1 adds real order-backed sales and volume graphs using the recorded order timestamps and totals; empty periods show an honest empty state.
2. **The dashboard header was forced to fixed positioning by a later CSS override**, with compensating top padding on the content. Phase 1 restores sticky document flow and removes the extra content offset to prevent the header from covering page text.
3. **WhatsApp updates are seller-triggered drafts**, not automatic delivery notifications. The current UI opens a pre-filled WhatsApp chat. Official WhatsApp Business Platform integration, approved templates, opt-in tracking and message delivery logs remain future work.
4. **Manual order inventory handling.** Phase 1 now matches seller-entered manual line items to active catalogue products by product ID (when supplied) or exact normalized product name. Matching lines reserve stock with conditional updates and roll back partial reservations if order creation fails. Custom one-off lines remain explicitly untracked rather than silently changing catalogue stock.
5. **Inventory and order writes are not consistently wrapped in database transactions.** Review transaction support and implement safe reservation/rollback semantics before high-volume use.
6. **The current analytics page receives the seller's order list and computes metrics in the browser.** This is real order data, but large-scale analytics should move to indexed server-side aggregation with bounded date ranges and pagination.

### Existing code that must remain outside the active runtime

- `backend/index.ts` references the AppDeploy SDK.
- `appdeploy.auth-login.json` is a legacy repository file.
- The active MERN runtime is the Express API in `api/index.js` and the routes under `server/src/routes/`.
- Do not use AppDeploy or merge its SDK code into the active application.

## Phase 1 changes on this branch

- Guest checkout accepts orders without a customer account while retaining optional verified customer sessions.
- Guest orders require a name and phone number, use server-derived product prices, retain stock checks and receive an unguessable order confirmation token (or an idempotent retry token).
- The storefront no longer sends an empty customer bearer token for guests.
- The invariant checker now covers guest checkout.
- The analytics page now provides selectable 7/30/90-day order-backed sales and order-volume graphs, payment-received totals, product performance and status breakdowns.
- The dashboard header now uses sticky document flow rather than fixed positioning with a manual content offset.
- Additional regression checks cover analytics, layout behaviour and manual-order stock reservations.
- Seller-created manual orders now reserve stock for matched catalogue items, roll back partial reservations on failure, and upsert customer records by store and phone. Custom one-off lines are retained without pretending to adjust catalogue inventory.

## Remaining roadmap

1. Resolve payment callback authenticity and idempotent payment-event processing.
2. Expand inventory movement history and transactional order/inventory writes; manual catalogue-order stock reservation and basic phone-based CRM upsert are now implemented.
3. Add backend analytics aggregation and reporting APIs.
4. Add order status notification preferences, official WhatsApp integration and delivery message templates.
5. Expand the Business OS APIs and workspace: expenses, invoices, cashflow summary, supplier directory, purchase orders, stock adjustment journal, delivery assignments, referral codes and explainable seller-reviewed recommendations now have initial scoped endpoints and dashboard screens. These need deeper workflows, reconciliation and E2E validation before production use.
6. Marketing attribution capture and referral-code management endpoints are present; attribution is not yet fully connected to checkout conversion, and abandoned-checkout session creation/recovery is not complete. Do not claim abandoned-cart recovery is live.
7. Rules-based seller recommendations and approval/dismissal audit records are present. These are not an LLM agent and approvals do not execute actions. Expand audit context and approved-action workflows only with explicit seller confirmation.
8. Add broader integration/E2E tests, restore tests, monitoring and production smoke tests. New route tests currently cover the initial expense endpoints only.
9. Validate NDPA privacy notices, data retention, data-subject request handling and processor agreements.
10. Validate deployment health on the existing Vercel/Render services before any production release.

## Release rule

This branch is an incremental implementation, not proof that the complete business operating system is finished. Do not merge or claim production readiness until CI, integration tests, security review and production smoke tests pass.
