# QuickCart Business OS — Release Scope

This release extends the existing QuickCart application. It must not replace the app, remove monetization code, or introduce paid gates during the free launch.

## Delivery policy
- Work on `implementation/business-os-phase-1`; do not merge to `main` or deploy until the release gates below pass.
- Keep credentials in Render/Vercel environment settings. Never commit secrets or request them in chat.
- Use seller-triggered WhatsApp click-to-chat links with prefilled messages. This is assisted sending, not background/automated delivery.
- ALATPay callbacks are untrusted notifications. Payment state may change only after server-side provider verification against the stored transaction, order, amount and NGN currency.
- All business records must be scoped to the authenticated seller/store on every read and write.
- AI may recommend; consequential actions require seller approval and an audit record.

## Workstreams and acceptance criteria

### 1. WhatsApp order updates (no Meta API)
- Add configurable message templates for received, confirmed, preparing, dispatched, delivered and cancelled states.
- Normalize Nigerian phone numbers to international format safely; reject invalid values.
- Build encoded `https://wa.me/<number>?text=<encoded-message>` links from the seller's authenticated order view.
- Include order reference, store name and relevant delivery details; never expose internal tokens.
- Record that a message was prepared/opened only where observable. Do not claim it was sent or delivered.
- Test encoding, phone normalization, missing phone and all supported statuses.

### 2. ALATPay sandbox verification
- Keep callback handling fail-closed.
- Validate provider lookup schema using real sandbox transactions and merchant credentials configured as environment variables.
- Match transaction ID, order/reference, expected amount, amount paid, currency, business identity and successful provider status.
- Make updates idempotent and prevent a failed/duplicate callback from marking an order paid.
- Add mocked tests for success, mismatch, failure, provider timeout and duplicate callbacks.
- Production verification remains blocked until sandbox evidence is recorded.

### 3. Finance
- Store expenses, invoices, cashflow entries and reconciliation records with store ownership, currency, timestamps and immutable audit metadata.
- Derive totals from persisted records; distinguish recorded income from provider-confirmed payments.
- Support invoice status and payment references; avoid silently editing reconciled entries.
- Add tests for totals, date ranges, duplicate references and cross-store access.

### 4. Inventory and procurement
- Record append-only stock movements with reason, quantity, actor and source reference.
- Add supplier records and purchase orders with draft/submitted/received/cancelled states.
- Receiving a purchase order must create stock movements exactly once.
- Reconcile existing stock quantities before enabling ledger-derived stock as authoritative.
- Test concurrent reservations, partial receiving, cancellation and duplicate operations.

### 5. Delivery operations
- Add delivery assignments, courier/contact details, status timeline and proof/reference fields.
- Keep assignment and status changes store-scoped and auditable.
- Support unassigned, assigned, picked-up, in-transit, delivered and failed/cancelled states.
- Do not claim GPS tracking unless a real location source exists.

### 6. Marketing
- Capture attribution with consent-aware first-touch/last-touch fields.
- Add referral codes with abuse controls and attribution records.
- Implement abandoned-checkout detection with deduplication and seller-triggered follow-up; no unsolicited automatic messaging.
- Measure funnel conversion from persisted events, not fabricated counters.

### 7. Seller-approved AI
- Generate recommendations from store-scoped data with evidence and confidence/context.
- Keep recommendations read-only until a seller explicitly approves an action.
- Record proposed action, input snapshot/reference, approver, timestamp, outcome and reversal where applicable.
- No autonomous payment, pricing, customer messaging or inventory mutation.

### 8. Security, privacy and E2E
- Audit tenant isolation across every route and resource, including object-ID substitution and nested resources.
- Validate ownership before all mutations; add negative cross-tenant tests.
- Minimise personal data, document purposes/retention/deletion/export flows, and review consent and privacy notices against Nigeria's NDPA with qualified guidance.
- Add browser E2E coverage for seller onboarding, storefront checkout, order management, manual orders, payment lifecycle, WhatsApp handoff, finance, inventory and delivery.
- Verify auth, CSRF/origin assumptions, rate limits, input validation, secrets handling, logging redaction and backup/restore procedure.

### 9. Production release
- Confirm the intended Vercel frontend and Render API services and their current deployments.
- Verify environment variables and database connectivity without exposing secret values.
- Run production smoke tests for health, auth, storefront, checkout, order updates and sandbox payment flow.
- Confirm CORS, HTTPS, logs and rollback target.
- Deploy only after CI, E2E, security checks and owner-approved sandbox validation pass.

## Release gates
- [ ] All workstreams implemented or explicitly deferred with user approval.
- [ ] Unit, integration and browser E2E suites pass.
- [ ] Cross-tenant negative tests pass.
- [ ] ALATPay sandbox verification evidence recorded.
- [ ] Production smoke tests pass on the existing Vercel/Render services.
- [ ] No secrets committed; production credentials remain in provider settings.
- [ ] PR reviewed and merge explicitly approved.

## Current baseline
The existing phase-1 branch already contains guest checkout, data-backed analytics, manual-order stock reservation, safer order deletion and server-side ALATPay lookup wiring. These are foundations, not proof that the workstreams above are complete.