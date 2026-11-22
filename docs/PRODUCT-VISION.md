# QuickCart — Product Vision

**Product direction:** A Nigeria-first business and shopping platform for independent sellers and shoppers, growing into a connected operating system for small businesses.

## Founding problem

Independent sellers often coordinate storefronts, products, customers, orders, inventory, money, delivery and marketing through disconnected tools and manual processes. Buyers also need a clear way to discover sellers, place orders and understand fulfilment.

## Core promise

QuickCart should connect the buyer shopping journey with the seller's day-to-day business operations. It should help a small business run its commerce workflow from product discovery through fulfilment and review without pretending that every seller operates like a large retailer.

## Product areas

### Buyer experience
- Discover participating independent sellers and their storefronts.
- Browse products and availability.
- Use guest or registered checkout where supported.
- See accurate order status and delivery information.
- Understand who receives payment and how fulfilment is arranged.

### Seller operating system
- Storefront, catalogue and product-image management.
- Orders, manual order creation, customer records and customer communication.
- Inventory quantities, movement history, suppliers and purchase orders.
- Expenses, invoices, cashflow, payment reconciliation and finance history.
- Delivery assignment, status history, tracking references and proof of fulfilment.
- Marketing attribution, referrals, abandoned-checkout recovery and reporting.
- Seller-approved recommendations and auditable actions.

### Connected intelligence
- Use persisted business records to explain trends and surface useful recommendations.
- Show where each recommendation came from and what data it relied on.
- Require explicit seller approval before consequential actions.
- Record approval, execution result and reversal history when an approved action is eventually implemented.
- Never autonomously change prices, inventory, payments or customer communications.

## Non-negotiable operating constraints

- Nigeria is the initial market; currency, phone handling and seller workflows must be suitable for that market.
- Buyers and sellers are distinct account contexts with explicit ownership and authorization.
- Every seller/business record must be scoped to the authenticated store on every read and write.
- Buyer payments remain directly arranged with sellers in the current model. QuickCart must not imply escrow, custody of funds or guaranteed settlement.
- ALATPay callbacks are untrusted until verified server-side against the stored transaction, order, amount, currency and provider status.
- WhatsApp click-to-chat is a seller-triggered handoff with a prefilled message, not proof of sending or delivery. Do not claim automated WhatsApp delivery notifications without a properly approved and verified integration.
- Guest checkout must not depend on a customer account, but order access must still use a secure confirmation mechanism.
- Analytics must come from persisted records. Do not fabricate charts, seller counts, transaction totals or adoption claims.
- Free-launch policy must not accidentally delete or corrupt existing monetization logic.
- Privacy, retention, deletion, data-subject requests and processor disclosures need implementation and qualified compliance review. A code feature is not a legal compliance certificate.

## Current implementation baseline

The current repository documents and contains seller storefronts, product catalogues, seller order workflows, customer checkout/tracking, seller-triggered WhatsApp handoff and an early Business OS area. The Business OS release-scope document records initial endpoints and UI for expenses, invoices, cashflow summaries, stock movements, suppliers, purchase orders, delivery assignments, referral codes and explainable rules-based recommendations.

Those initial screens and endpoints are not proof that the whole operating system is production-ready. The release-scope and implementation-audit documents still identify important gaps, including verified ALATPay sandbox evidence, immutable and transaction-safe finance/inventory ledgers, partial procurement workflows, proof of delivery, conversion attribution, abandoned-checkout recovery, audited AI action execution, comprehensive tenant-isolation tests, full browser E2E and production smoke tests.

## Acceptance criteria

A Business OS release must demonstrate:

1. Seller and buyer workflows work independently and together.
2. Cross-store/object-ID substitution tests reject access to another seller's records.
3. Order creation and inventory reservation/rollback are idempotent and concurrency-safe.
4. Payment state changes only after verified provider evidence.
5. Cashflow and reports reconcile to persisted, traceable events.
6. Stock and finance ledgers retain append-only history and cannot silently rewrite reconciled records.
7. Delivery status history is auditable; GPS or proof-of-delivery claims are made only when real evidence exists.
8. Marketing attribution is connected to checkout events and consent/retention rules.
9. Seller recommendations expose evidence and require explicit approval before any action.
10. Unit, integration and browser E2E checks pass, followed by smoke tests on the actual Vercel/Render production services.

## Change-control rule

The complete Business OS is the target vision. The current marketplace and initial Business OS modules are implementation stages, not a reason to narrow the product's identity. Conversely, planned modules must not be advertised as shipped until tested and available.
