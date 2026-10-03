import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'https://quick-cart-three-chi.vercel.app';
const allowedOrigins = new Set([frontendUrl, 'http://localhost:5173', 'http://localhost:4173']);
app.use(cors({ origin: (origin, callback) => { if (!origin || allowedOrigins.has(origin)) return callback(null, true); callback(new Error('Origin not allowed by CORS.')); } }));
app.use(express.json({ limit: '2mb' }));

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoFromEmail = process.env.BREVO_FROM_EMAIL;
const brevoFromName = process.env.BREVO_FROM_NAME || 'QuickCart';

if (!mongoUri) console.warn('MONGODB_URI is not configured.');
if (!jwtSecret) console.warn('JWT_SECRET is not configured.');
if (!brevoApiKey) console.warn('BREVO_API_KEY is not configured.');
if (!brevoFromEmail) console.warn('BREVO_FROM_EMAIL is not configured.');

let dbPromise;
async function db() {
  if (!mongoUri) throw new Error('MONGODB_URI is not configured.');
  if (!dbPromise) {
    const client = new MongoClient(mongoUri);
    dbPromise = client.connect().then(c => c.db('quickcart'));
  }
  return dbPromise;
}

function tokenFor(user) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not configured.');
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, jwtSecret, { expiresIn: '7d' });
}

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !jwtSecret) return res.status(401).json({ error: 'Authentication required.' });
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch { return res.status(401).json({ error: 'Invalid or expired session.' }); }
}

function slugify(value) { return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); }
const now = () => new Date().toISOString();
const hashToken = token => createHash('sha256').update(token).digest('hex');

async function sendVerificationEmail(email, name, otp) {
  if (!brevoApiKey) throw new Error('BREVO_API_KEY is not configured.');
  if (!brevoFromEmail) throw new Error('BREVO_FROM_EMAIL is not configured.');
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': brevoApiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { name: brevoFromName, email: brevoFromEmail },
      to: [{ email, name }],
      subject: 'Your QuickCart verification code',
      textContent: `Hi ${name || 'there'}, your QuickCart verification code is ${otp}. It expires in 10 minutes.`,
      htmlContent: `<html><body style="font-family:Arial,sans-serif;background:#f5f8f6;padding:30px"><div style="max-width:520px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1>Welcome to QuickCart 👋</h1><p>Hi ${name || 'there'},</p><p>Use this code to verify your email:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef5f1;padding:18px;text-align:center;border-radius:12px">${otp}</div><p>This code expires in 10 minutes. If you did not create this account, you can ignore this email.</p></div></body></html>`
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Unable to send verification email.');
  return data;
}

app.get('/api/_healthcheck', async (_req, res) => {
  try { const database = await db(); await database.command({ ping: 1 }); res.json({ ok: true, database: 'quickcart', emailProvider: 'brevo' }); }
  catch (error) { console.error(error); res.status(503).json({ ok: false, error: 'Database connection failed.' }); }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const database = await db();
    const users = database.collection('users');
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    if (!email || password.length < 6 || !name) return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required.' });
    if (await users.findOne({ email })) return res.status(409).json({ error: 'An account with that email already exists.' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const user = { id: randomUUID(), name, email, passwordHash: await bcrypt.hash(password, 12), emailVerified: false, emailVerificationOtpHash: hashToken(otp), emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), emailVerificationAttempts: 0, createdAt: now() };
    await users.insertOne(user);
    try { await sendVerificationEmail(email, name, otp); }
    catch (mailError) { await users.deleteOne({ id: user.id }); throw mailError; }
    res.status(201).json({ message: 'Account created. Enter the verification code sent to your email.', requiresVerification: true, email });
  } catch (error) { console.error(error); res.status(500).json({ error: error.message || 'Unable to create account.' }); }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    const database = await db(); const users = database.collection('users');
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    if (user.emailVerified) return res.json({ message: 'Email is already verified.', token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
    if (user.emailVerificationAttempts >= 5) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    if (!user.emailVerificationExpiresAt || new Date(user.emailVerificationExpiresAt) <= new Date()) return res.status(400).json({ error: 'This code has expired. Request a new code.' });
    if (hashToken(otp) !== user.emailVerificationOtpHash) { await users.updateOne({ id: user.id }, { $inc: { emailVerificationAttempts: 1 } }); return res.status(400).json({ error: 'Incorrect verification code.' }); }
    await users.updateOne({ id: user.id }, { $set: { emailVerified: true }, $unset: { emailVerificationOtpHash: '', emailVerificationExpiresAt: '', emailVerificationAttempts: '' } });
    const updated = { ...user, emailVerified: true };
    res.json({ message: 'Email verified successfully.', token: tokenFor(updated), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Unable to verify email.' }); }
});

app.post('/api/auth/resend-otp', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const database = await db(); const users = database.collection('users');
    const user = await users.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account was found with that email.' });
    if (user.emailVerified) return res.status(400).json({ error: 'That email is already verified. You can sign in.' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await users.updateOne({ id: user.id }, { $set: { emailVerificationOtpHash: hashToken(otp), emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), emailVerificationAttempts: 0 } });
    await sendVerificationEmail(user.email, user.name, otp);
    res.json({ message: 'A new verification code has been sent.' });
  } catch (error) { console.error(error); res.status(500).json({ error: error.message || 'Unable to resend verification code.' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try { const database = await db(); const users = database.collection('users'); const email = String(req.body.email || '').trim().toLowerCase(); const password = String(req.body.password || ''); const user = await users.findOne({ email }); if (!user || !await bcrypt.compare(password, user.passwordHash || '')) return res.status(401).json({ error: 'Email or password is incorrect.' }); if (!user.emailVerified) return res.status(403).json({ error: 'Please verify your email before signing in.', code: 'EMAIL_NOT_VERIFIED' }); res.json({ user: { id: user.id, name: user.name, email: user.email }, token: tokenFor(user) }); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Unable to sign in.' }); }
});

app.get('/api/me', auth, async (req, res) => { const database = await db(); const user = await database.collection('users').findOne({ id: req.user.sub }, { projection: { passwordHash: 0 } }); if (!user) return res.status(404).json({ error: 'User not found.' }); const store = await database.collection('stores').findOne({ userId: user.id }); res.json({ user, store }); });

app.post('/api/store', auth, async (req, res) => { const database = await db(); const stores = database.collection('stores'); if (await stores.findOne({ userId: req.user.sub })) return res.status(409).json({ error: 'Store already exists.' }); const name = String(req.body.storeName || 'My Store'); const slug = slugify(req.body.slug || name) || `store-${req.user.sub.slice(0, 8)}`; if (await stores.findOne({ slug })) return res.status(409).json({ error: 'That store URL is already in use.' }); const store = { id: randomUUID(), userId: req.user.sub, storeName: name, slug, tagline: String(req.body.tagline || 'Shop with us'), vendorPhone: String(req.body.vendorPhone || ''), deliveryFee: Number(req.body.deliveryFee || 0), primaryColor: String(req.body.primaryColor || '#12392d'), logo: '', paymentDetails: '', deliveryZones: [], discounts: [], createdAt: now() }; await stores.insertOne(store); res.status(201).json({ store }); });

app.put('/api/store', auth, async (req, res) => { const database = await db(); const stores = database.collection('stores'); const store = await stores.findOne({ userId: req.user.sub }); if (!store) return res.status(404).json({ error: 'Store not found.' }); const allowed = ['storeName','slug','tagline','vendorPhone','deliveryFee','primaryColor','logo','paymentDetails','deliveryZones','discounts']; const patch = {}; for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key]; if (patch.slug !== undefined) { patch.slug = slugify(patch.slug); if (await stores.findOne({ slug: patch.slug, id: { $ne: store.id } })) return res.status(409).json({ error: 'That store URL is already in use.' }); } if (patch.deliveryFee !== undefined) patch.deliveryFee = Number(patch.deliveryFee); await stores.updateOne({ id: store.id, userId: req.user.sub }, { $set: patch }); res.json({ store: await stores.findOne({ id: store.id }) }); });

app.get('/api/products', auth, async (req, res) => { const database = await db(); const store = await database.collection('stores').findOne({ userId: req.user.sub }); if (!store) return res.json({ products: [] }); const products = await database.collection('products').find({ storeId: store.id }).sort({ createdAt: -1 }).toArray(); res.json({ products }); });
app.post('/api/products', auth, async (req, res) => { const database = await db(); const store = await database.collection('stores').findOne({ userId: req.user.sub }); if (!store) return res.status(400).json({ error: 'Create your store first.' }); const product = { id: randomUUID(), storeId: store.id, name: String(req.body.name || 'Product'), price: Number(req.body.price || 0), description: String(req.body.description || ''), emoji: String(req.body.emoji || '🛍️'), stock: Number(req.body.stock ?? 0), active: req.body.active !== false, createdAt: now() }; await database.collection('products').insertOne(product); res.status(201).json({ product }); });
app.delete('/api/products/:id', auth, async (req, res) => { const database = await db(); const store = await database.collection('stores').findOne({ userId: req.user.sub }); if (!store) return res.status(404).json({ error: 'Store not found.' }); const result = await database.collection('products').deleteOne({ id: req.params.id, storeId: store.id }); if (!result.deletedCount) return res.status(404).json({ error: 'Product not found.' }); res.json({ deleted: true }); });
app.get('/api/storefront/:slug', async (req, res) => { const database = await db(); const store = await database.collection('stores').findOne({ slug: req.params.slug }); if (!store) return res.status(404).json({ error: 'Store not found.' }); const products = await database.collection('products').find({ storeId: store.id, active: true }).sort({ createdAt: -1 }).toArray(); res.json({ store, products }); });
app.post('/api/orders', async (req, res) => { const database = await db(); const storeId = String(req.body.storeId || ''); const items = Array.isArray(req.body.items) ? req.body.items : []; const customerName = String(req.body.customerName || '').trim(); const customerPhone = String(req.body.customerPhone || '').trim(); const address = String(req.body.address || '').trim(); if (!storeId || !customerName || !address || !items.length) return res.status(400).json({ error: 'Store, customer name, address and at least one item are required.' }); if (!await database.collection('stores').findOne({ id: storeId })) return res.status(404).json({ error: 'Store not found.' }); const order = { id: randomUUID(), storeId, customerName, customerPhone, address, items, subtotal: Number(req.body.subtotal || 0), deliveryFee: Number(req.body.deliveryFee || 0), discount: Number(req.body.discount || 0), total: Number(req.body.total || 0), status: 'new', paymentStatus: 'pending', createdAt: now() }; await database.collection('orders').insertOne(order); await database.collection('customers').updateOne({ storeId, phone: customerPhone }, { $set: { storeId, name: customerName, phone: customerPhone, address, updatedAt: now() }, $setOnInsert: { createdAt: now() } }, { upsert: true }); res.status(201).json({ orderId: order.id }); });
app.get('/api/orders', auth, async (req, res) => { const database = await db(); const store = await database.collection('stores').findOne({ userId: req.user.sub }); if (!store) return res.json({ orders: [] }); const orders = await database.collection('orders').find({ storeId: store.id }).sort({ createdAt: -1 }).toArray(); res.json({ orders }); });

app.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log(`QuickCart API running on ${process.env.PORT || 5000}`));
