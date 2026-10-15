# QuickCart — Production and QA Checklist

QuickCart separates a Vite/React frontend from an Express API and MongoDB-backed data. The repository's existing `npm run check` and `npm run build` commands are useful regression checks, but they do not replace live integration testing.

## 1. Build and deployment

- [ ] Use the Node.js version declared in `package.json`.
- [ ] Run `npm ci`, `npm run check`, and `npm run build`.
- [ ] Confirm GitHub Pages base paths and direct route refresh behavior.
- [ ] Deploy the API separately and verify the frontend's API URL points to the deployed service.
- [ ] Confirm `GET /api/health` reports a healthy API without leaking secrets.
- [ ] Check browser console, server logs, CORS, and preflight requests.

## 2. Seller access and tenant isolation

- [ ] Register, sign in, sign out, and expire a session.
- [ ] Verify every seller endpoint checks authentication and authorizes the seller against the requested store.
- [ ] Attempt to read or mutate another seller's products, customers, discounts, orders, settings, and analytics; expect denial.
- [ ] Validate request bodies and reject unexpected IDs, invalid prices, negative quantities, and oversized strings.
- [ ] Keep secrets only in host environment variables; rotate any credential that was ever committed.

## 3. Customer purchase journey

- [ ] Open a public storefront without a seller session.
- [ ] Add, update and remove cart items; verify stock and price on the server.
- [ ] Verify customer identity and order history are scoped to the correct customer and store.
- [ ] Submit the same order twice and confirm idempotency prevents duplicate orders.
- [ ] Verify order status transitions and seller-scoped cancellation/deletion rules.
- [ ] Test pickup and any other fulfillment methods explicitly.

## 4. Payments and email

- [ ] Use payment-provider test mode only for test purchases.
- [ ] Verify payment status server-side; never trust a browser-only success redirect.
- [ ] Verify webhook signatures and make webhook processing idempotent.
- [ ] Test declined, cancelled, pending, duplicated and delayed payment events.
- [ ] Confirm email failures do not duplicate orders or expose private customer data.

## 5. Privacy, resilience and accessibility

- [ ] Test rate limiting and safe error responses.
- [ ] Confirm no API keys, JWT secrets, MongoDB URI, or payment secrets appear in client bundles or logs.
- [ ] Test slow API responses, offline mode, empty lists and server errors.
- [ ] Test on Android mobile widths and keyboard-only navigation.
- [ ] Add monitoring and a documented rollback path before accepting real transactions.

## Release gate

Do not call the app production-ready until the deployed frontend and API pass the checks above with test accounts and payment sandbox credentials.
