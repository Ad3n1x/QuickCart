# QuickCart

Multi-tenant WhatsApp-first social-commerce storefront SaaS.

## Stack
- React + Vite
- Express API
- MongoDB Atlas
- JWT + bcrypt authentication
- GitHub

## Environment variables
Set these on the hosting platform, never in GitHub:
- MONGODB_URI
- JWT_SECRET
- API_URL (frontend API URL, e.g. https://quickcart-api-f7x7.onrender.com)

The MongoDB database is `quickcart`.

## Run locally
```bash
npm install
npm run server
npm run dev
```
