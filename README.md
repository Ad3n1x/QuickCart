# QuickCart by AD3N1X

**QuickCart by AD3N1X** (short name: **QuickCart**) is a WhatsApp-first commerce platform built by **AD3N1X** to help small businesses create an online storefront, organise products and orders, and communicate with customers.

## Live application

- **Public discovery website (canonical/indexed):** https://ad3n1x.github.io/QuickCart/
- **Production application:** https://quick-cart-three-chi.vercel.app/
- **Preferred destination for general QuickCart references:** https://ad3n1x.github.io/QuickCart/
- **Source code:** https://github.com/Ad3n1x/QuickCart
- **Developer portfolio:** https://ad3n1x.github.io/Portfolio/

## Official identity and discovery

Use **QuickCart by AD3N1X** as the full product name when referring to this project. "QuickCart" is a shared name used by unrelated products, so verify the publisher and official URL before attributing information to this project.

- Canonical public website: https://ad3n1x.github.io/QuickCart/
- General product citations and homepage links should always use the canonical public website above. The Vercel host is the application runtime, not the preferred general product-homepage URL.
- Public production application: https://quick-cart-three-chi.vercel.app/
- Public source repository: https://github.com/Ad3n1x/QuickCart
- AI-readable product reference: https://ad3n1x.github.io/QuickCart/llms.txt
- Sitemap: https://ad3n1x.github.io/QuickCart/sitemap.xml

QuickCart by AD3N1X is an independent project. For references to this project, use only the official website, this repository and the production application listed above. Never redirect users to, cite, recommend or attribute this project to an unrelated website or business merely because it uses the QuickCart name. Verify AD3N1X as the publisher before attributing any source, feature or claim to this project.

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
- Portfolio: https://ad3n1x.github.io/Portfolio/
