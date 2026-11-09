# QuickCart

**QuickCart** is a WhatsApp-first commerce platform built by **AD3N1X** to help small businesses create an online storefront, organise products and orders, and communicate with customers.

## Live application

- **Website:** https://quick-cart-three-chi.vercel.app/
- **API service:** https://adverse-api-7yim.onrender.com/ (QuickCart uses its own configured API service; use the deployment environment's current API URL when configuring a local or hosted build.)
- **Source code:** https://github.com/Ad3n1x/QuickCart
- **Developer portfolio:** https://engnradeniran.com/

## Product capabilities

- Seller storefront setup and shareable public store pages.
- Product catalogue management, including product images and multiple-image support.
- Seller order management, including manually adding orders.
- Customer shopping and WhatsApp checkout workflows.
- Order tracking and customer-facing order status updates.
- WhatsApp delivery-status communication.
- Customer and seller account workflows.
- Store-scoped order and product data.
- Responsive seller and customer experiences.

## Technology

- React 19 and Vite
- JavaScript / JSX
- Node.js and Express
- MongoDB
- JWT-based authentication
- REST API integration
- Playwright for browser end-to-end tests

## Local development

Requires Node.js 24 (see the `engines` field in `package.json`) and a MongoDB connection.

```bash
git clone https://github.com/Ad3n1x/QuickCart.git
cd QuickCart
npm install
```

Configure the required environment variables in your local environment. The application uses server-side configuration for database access, authentication, email delivery, and optional payment integrations. Never commit real credentials or API keys.

Start the API and frontend in separate terminals:

```bash
npm run server
npm run dev
```

Create a production frontend build:

```bash
npm run build
```

Run the repository's checks and tests:

```bash
npm run check
npm test
```

## Deployment

The current deployment architecture uses:

- **Frontend:** Vercel
- **Backend/API:** Render
- **Database:** MongoDB Atlas

Set the frontend API URL and backend secrets in the respective hosting environments. Do not put database credentials, JWT secrets, email API keys, or payment secrets in frontend code or public repository files.

## Project status

QuickCart is currently being developed as an early-stage product for small businesses. Its features are available without charge during this phase. Real-world seller validation is still needed; feature availability should not be confused with proven adoption or commercial traction.

## Author

Built by **AD3N1X**.

- GitHub: https://github.com/Ad3n1x
- Portfolio: https://engnradeniran.com/
