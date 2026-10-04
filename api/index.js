import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { randomUUID, createHash } from 'node:crypto';

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'https://quick-cart-three-chi.vercel.app';
const allowedOrigins = new Set([frontendUrl, 'https://quick-cart-three-chi.vercel.app', 'http://localhost:5173', 'http://localhost:4173']);
const isAllowedOrigin = origin => !origin || allowedOrigins.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
const corsOptions = { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Store-Id'], optionsSuccessStatus: 204 };
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
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

