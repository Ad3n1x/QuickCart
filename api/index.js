import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID,randomBytes } from 'node:crypto';
import { registerCustomerAuthRoutes } from "../server/src/routes/customer-auth.js";
import { registerSellerAuthRoutes } from "../server/src/routes/seller-auth.js";
import { registerStoreRoutes } from "../server/src/routes/store.js";
import { registerPaymentRoutes } from "../server/src/routes/payments.js";
import { registerDiscountRoutes } from "../server/src/routes/discounts.js";
import { registerOrderRoutes } from "../server/src/routes/orders.js";
import { registerBusinessOsRoutes } from "../server/src/routes/business-os.js";
import { registerAdminRoutes } from "../server/src/routes/admin.js";
import { createDatabaseConnection } from "../server/src/config/database.js";
import { createAuthServices } from "../server/src/middleware/auth.js";
import { createOtp,emailPattern,now,slugify } from "../server/src/utils/identity.js";
import { PLAN_CONFIG,planFor,planStoreLimit } from "../server/src/config/plans.js";
import { createVerificationEmailSender,createOrderUpdateEmailSender,createAdminPasswordResetEmailSender } from "../server/src/services/email.js";
import { createPaymentServices } from "../server/src/services/payments.js";
import { getUserStore } from "../server/src/services/stores.js";

const app = express();

const frontendUrl = (process.env.FRONTEND_URL || 'https://quick-cart-three-chi.vercel.app').replace(/\/+$/, '');
const allowedOrigins = new Set([frontendUrl, 'https://quick-cart-adeniran-victor-adebowales-projects.vercel.app', 'https://quick-cart-git-main-adeniran-victor-adebowales-projects.vercel.app', 'https://quick-cart-three-chi.vercel.app', 'https://ad3n1x.github.io', 'http://localhost:5173', 'http://localhost:4173']);
const isAllowedOrigin = origin => !origin || allowedOrigins.has(origin);
app.set('trust proxy',1);
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');if(req.path.startsWith('/api/'))res.setHeader('Cache-Control','no-store');if(req.secure||req.headers['x-forwarded-proto']==='https')res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');next();});
app.use((req,res,next)=>{if(req.path.startsWith('/api/') && process.env.NODE_ENV==='production' && req.headers['x-forwarded-proto']!=='https')return res.status(400).json({error:'HTTPS is required.',code:'HTTPS_REQUIRED'});next();});
app.use(cors({ origin: (origin, callback) => { if (isAllowedOrigin(origin)) return callback(null, true); callback(new Error('Origin not allowed by CORS.')); } }));
app.use(express.json({ limit: '8mb' }));

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
const adminEmail = process.env.ADMIN_EMAIL || 'adenix271@gmail.com';
const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
if (!adminJwtSecret) console.warn('ADMIN_JWT_SECRET is not configured; private admin sign-in is disabled.');
if (!adminPasswordHash) console.info('ADMIN_PASSWORD_HASH is not configured; the primary admin will be initialized with an inaccessible random password during recovery.');
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoFromEmail = process.env.BREVO_FROM_EMAIL;
const brevoFromName = process.env.BREVO_FROM_NAME || 'QuickCart';
const alatPaySecretKey = process.env.ALATPAY_SECRET_KEY;
const alatPayPublicKey = process.env.ALATPAY_PUBLIC_KEY;
const alatPayBusinessId = process.env.ALATPAY_BUSINESS_ID;
const alatPayBaseUrl = process.env.ALATPAY_BASE_URL || 'https://apibox.alatpay.ng/bank-transfer';
if (!mongoUri) console.warn('MONGODB_URI is not configured.');
if (!jwtSecret) console.warn('JWT_SECRET is not configured.');
if (!brevoApiKey) console.warn('BREVO_API_KEY is not configured.');
if (!brevoFromEmail) console.warn('BREVO_FROM_EMAIL is not configured.');
if (!alatPaySecretKey) console.warn('ALATPAY_SECRET_KEY is not configured.');
if (!alatPayBusinessId) console.warn('ALATPAY_BUSINESS_ID is not configured.');

const db = createDatabaseConnection(mongoUri);
const { tokenFor, auth, hashToken, customerTokenFor, customerAuth, adminTokenFor, adminAuth } = createAuthServices(jwtSecret, adminJwtSecret);
const requireCurrentAdminSession = (req,res,next) => adminAuth(req,res,async()=>{
 try {
  const credential=await (await db()).collection("admin_credentials").findOne({id:"primary-admin"},{projection:{passwordChangedAt:1}});
  const changedAt=credential?.passwordChangedAt?Math.floor(new Date(credential.passwordChangedAt).getTime()/1000):0;
  if(changedAt&&Number(req.admin?.iat||0)<=changedAt)return res.status(401).json({error:"Your administrator session is no longer valid. Sign in again.",code:"ADMIN_SESSION_REVOKED"});
  next();
 } catch(error) { console.error("Admin session validation failed:",error?.message||error); return res.status(503).json({error:"Unable to verify administrator session."}); }
});
const sendVerificationEmail = createVerificationEmailSender({ apiKey: brevoApiKey, fromEmail: brevoFromEmail, fromName: brevoFromName });
const sendOrderUpdateEmail = createOrderUpdateEmailSender({ apiKey: brevoApiKey, fromEmail: brevoFromEmail, fromName: brevoFromName });
const sendAdminPasswordResetEmail = createAdminPasswordResetEmailSender({ apiKey: brevoApiKey, fromEmail: brevoFromEmail, fromName: brevoFromName });
const { uniquePaymentReference, createAlatPayVirtualAccount, verifyAlatPayTransaction } = createPaymentServices({ secretKey: alatPaySecretKey, businessId: alatPayBusinessId, baseUrl: alatPayBaseUrl });

app.get('/api/_healthcheck',async(_req,res)=>{try{const database=await db();await database.command({ping:1});const adminRecovery={adminJwtSecret:adminJwtSecret?'configured':'unavailable',passwordBootstrap:adminPasswordHash?'configured':'automatic',brevoApiKey:brevoApiKey?'configured':'unavailable',brevoSender:brevoFromEmail?'configured':'unavailable',frontendUrl:frontendUrl?'configured':'unavailable'};const adminReady=Boolean(adminJwtSecret&&brevoApiKey&&brevoFromEmail&&frontendUrl);const ready=Boolean(jwtSecret&&brevoApiKey&&brevoFromEmail&&adminReady);const status={database:'connected',authentication:jwtSecret?'configured':'unavailable',emailProvider:brevoApiKey&&brevoFromEmail?'configured':'unavailable',adminRecovery:{...adminRecovery,ready:adminReady}};if(!ready)return res.status(503).json({ok:false,...status});res.json({ok:true,...status});}catch(error){console.error('Health check failed:',error?.message||error);res.status(503).json({ok:false,database:'unavailable',error:'Service dependencies are not ready.'});}});

const routeDependencies = { db, auth, customerAuth, customerTokenFor, tokenFor, hashToken, emailPattern, createOtp, sendVerificationEmail, sendOrderUpdateEmail, bcrypt, randomUUID, randomBytes, jwt, jwtSecret, now, slugify, planFor, planStoreLimit, PLAN_CONFIG, uniquePaymentReference, createAlatPayVirtualAccount, verifyAlatPayTransaction, getUserStore };
registerCustomerAuthRoutes(app, routeDependencies);
registerSellerAuthRoutes(app, routeDependencies);
registerStoreRoutes(app, routeDependencies);
registerPaymentRoutes(app, routeDependencies);
registerDiscountRoutes(app, routeDependencies);
registerOrderRoutes(app, routeDependencies);
registerBusinessOsRoutes(app, routeDependencies);
registerAdminRoutes(app, { db, adminAuth:requireCurrentAdminSession, adminTokenFor, adminEmail, adminPasswordHash, bcrypt, randomBytes, sendAdminPasswordResetEmail, frontendUrl });

export default app;
