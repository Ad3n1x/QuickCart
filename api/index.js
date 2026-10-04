import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { randomUUID, createHash, createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

const app = express();
const frontendUrl = process.env.FRONTEND_URL || 'https://quick-cart-three-chi.vercel.app';
const allowedOrigins = new Set([frontendUrl, 'https://quick-cart-three-chi.vercel.app', 'http://localhost:5173', 'http://localhost:4173']);
const isAllowedOrigin = origin => !origin || allowedOrigins.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
const corsOptions = { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Store-Id'], optionsSuccessStatus: 204 };
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

app.post('/api/auth/login', async (req,res) => {
  try {
    const email=String(req.body?.email||'').trim().toLowerCase();
    const password=String(req.body?.password||'');
    if(!email || !password) return res.status(400).json({error:'Email and password are required.'});
    const database=await db();
    const users=database.collection('users');
    const user=await users.findOne({$or:[{emailHash:hashEmail(email)},{email}]});
    if(!user || !(await bcrypt.compare(password,user.passwordHash||''))) return res.status(401).json({error:'Invalid email or password.'});
    const safe=secureUser(user);
    if(!user.emailVerified) return res.status(403).json({error:'Please verify your email before signing in.',code:'EMAIL_NOT_VERIFIED',email:safe.email});
    const updated={...safe,lastActivityAt:new Date()};
    await users.updateOne({id:user.id},{$set:{lastActivityAt:updated.lastActivityAt}});
    return res.json({message:'Signed in successfully.',user:{id:user.id,name:safe.name,email:safe.email},token:tokenFor(updated)});
  } catch (error) {
    console.error('LOGIN_ERROR',error);
    return res.status(500).json({error:'Unable to sign in right now. Please try again.'});
  }
});

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoFromEmail = process.env.BREVO_FROM_EMAIL;
const brevoFromName = process.env.BREVO_FROM_NAME || 'QuickCart';
const alatPaySecretKey = process.env.ALATPAY_SECRET_KEY;
const alatPayPublicKey = process.env.ALATPAY_PUBLIC_KEY;
const alatPayBusinessId = process.env.ALATPAY_BUSINESS_ID;
const alatPayBaseUrl = process.env.ALATPAY_BASE_URL || 'https://apibox.alatpay.ng/bank-transfer';
const encryptionSecret = process.env.JWT_SECRET || process.env.QUICKCART_ENCRYPTION_KEY;
const encryptionKey = createHash('sha256').update(String(encryptionSecret || 'quickcart-fallback')).digest();
if (!mongoUri) console.warn('MONGODB_URI is not configured.');
if (!jwtSecret) console.warn('JWT_SECRET is not configured.');
if (!brevoApiKey) console.warn('BREVO_API_KEY is not configured.');
if (!brevoFromEmail) console.warn('BREVO_FROM_EMAIL is not configured.');
if (!alatPaySecretKey) console.warn('ALATPAY_SECRET_KEY is not configured.');
if (!alatPayBusinessId) console.warn('ALATPAY_BUSINESS_ID is not configured.');
function encryptValue(value) { const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',encryptionKey,iv); const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]); return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${data.toString('base64url')}`; }
function decryptValue(value) { try { const [iv,tag,data]=String(value||'').split('.'); if(!iv||!tag||!data) return null; const decipher=createDecipheriv('aes-256-gcm',encryptionKey,Buffer.from(iv,'base64url')); decipher.setAuthTag(Buffer.from(tag,'base64url')); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')); } catch { return null; } }
const hashEmail=email=>createHmac('sha256',encryptionKey).update(String(email).trim().toLowerCase()).digest('hex');
const secureUser=user=>{if(!user)return user;const secure=decryptValue(user.secure)||{};return {...user,name:secure.name||user.name||'',email:secure.email||user.email||'',secure:undefined,emailHash:undefined,passwordHash:undefined,emailVerificationOtpHash:undefined};};

let dbPromise;
async function ensureIndex(collection, keys, options) { const existing = await collection.listIndexes().toArray(); const current = existing.find(index => index.name === options.name); if (current) { const sameKeys = JSON.stringify(current.key) === JSON.stringify(keys); const sameUnique = Boolean(current.unique) === Boolean(options.unique); if (sameKeys && sameUnique) return; await collection.dropIndex(options.name); } await collection.createIndex(keys, options); }
async function db() { if (!mongoUri) throw new Error('MONGODB_URI is not configured.'); if (!dbPromise) { const client = new MongoClient(mongoUri); dbPromise = client.connect().then(async c => { const database=c.db('quickcart'); const usersCollection=database.collection('users'); try { await usersCollection.dropIndex('email_unique'); } catch (error) { if (error?.codeName !== 'IndexNotFound') throw error; } const users=database.collection('users'); try { await users.dropIndex('email_unique'); } catch (error) { if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) throw error; } await Promise.all([ensureIndex(users,{email:1},{name:'email_lookup',unique:false}),ensureIndex(database.collection('stores'),{slug:1},{name:'slug_unique',unique:true}),ensureIndex(database.collection('stores'),{userId:1,createdAt:1},{name:'user_created'}),ensureIndex(database.collection('products'),{storeId:1,createdAt:-1},{name:'store_created'}),ensureIndex(database.collection('orders'),{storeId:1,createdAt:-1},{name:'store_created'}),ensureIndex(database.collection('orders'),{id:1},{name:'id_unique',unique:true}),ensureIndex(database.collection('customers'),{storeId:1,phone:1},{name:'store_phone_unique',unique:true}),ensureIndex(database.collection('discounts'),{storeId:1,code:1},{name:'store_code_unique',unique:true})]); return database; }); } return dbPromise; }
function tokenFor(user) { if (!jwtSecret) throw new Error('JWT_SECRET is not configured.'); return jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '8h' }); }
async function auth(req, res, next) {
  try {
    const h=req.headers.authorization||'';