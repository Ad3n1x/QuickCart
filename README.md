# QuickCart

WhatsApp-first social-commerce storefront SaaS for independent sellers.

## Application architecture

- **Browser entrypoint:** `index.html` loads `src/main.jsx`, which mounts the React app in `src/App.jsx` and the shared styles in `src/index.css`.
- **Seller experience:** store setup, products, orders, customers, analytics, receipts, discounts, plan settings, and navigation are handled by the React app.
- **Customer storefront:** the public store routes are rendered by the same app and use store-specific data, customer authentication, and customer-email-scoped cart/order caches.
- **API:** `server.js` starts the Express application exported from `api/index.js`. MongoDB Atlas stores users, stores, products, and orders.
- **Hosting:** GitHub Actions builds the React/Vite frontend for GitHub Pages. The API is a separate service and must be deployed/healthy independently.
- **Compatibility note:** `src/main.tsx` and `src/App.tsx` are not the configured browser entrypoint. The active build uses the JavaScript JSX files.

## Quality checks

Run the cross-app structure and production-invariant checks before shipping:

```bash
npm run check
npm run build
```

The structure checks verify the configured app entrypoint, the GitHub Pages base path, customer email/store isolation, protected customer order history, order idempotency, seller-store-scoped order deletion, pickup as the default fulfillment method, and deployment workflow checks. These are regression guards, not a substitute for live end-to-end tests.

## Environment variables

Set these on the hosting platforms, never in GitHub:

- `MONGODB_URI`
- `JWT_SECRET`
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`
- `FRONTEND_URL`
- `API_URL` (frontend build variable)
- `ALATPAY_SECRET_KEY`
- `ALATPAY_PUBLIC_KEY`
- `ALATPAY_BUSINESS_ID`
- `ALATPAY_BASE_URL`

The MongoDB database is `quickcart`.

## Run locally

```bash
npm install
npm run server
npm run dev
```
