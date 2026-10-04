# QuickCart

WhatsApp-first social-commerce storefront SaaS for independent sellers.

## Stack
- React + Vite
- Express API on Render
- MongoDB Atlas
- JWT + bcrypt authentication
- Brevo transactional email
- GitHub + Vercel

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

<!-- GitHub Pages deployment trigger: 2026-10-04 latest build. -->
