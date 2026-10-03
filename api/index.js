import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri) console.warn('MONGODB_URI is not configured.');
if (!jwtSecret) console.warn('JWT_SECRET is not configured.');

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
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

const now = () => new Date().toISOString();

app.get('/api/_healthcheck', async (_req, res) => {
  try {
    const database = await db();
    await database.command({ ping: 1 });
    res.json({ ok: true, database: 'quickcart' });
  } catch (error) {
    console.error(error);
    res.status(503).json({ ok: false, error: 'Database connection failed.' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { users } = await db().then(d => ({ users: d.collection('users') }));
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();
    if (!email || password.length < 6 || !name) return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required.' });
    if (await users.findOne({ email })) return res.status(409).json({ error: 'An account with that email already exists.' });
    const user = { id: randomUUID(), name, email, passwordHash: await bcrypt.hash(password, 12), createdAt: now() };
    await users.insertOne(user);
    const { passwordHash, ...safeUser } = user;
    res.status(201).json({ user: safeUser, token: tokenFor(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { users } = await db().then(d => ({ users: d.collection('users') }));
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await users.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.passwordHash || '')) return res.status(401).json({ error: 'Email or password is incorrect.' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token: tokenFor(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to sign in.' });
  }
});

app.get('/api/me', auth, async (req, res) => {
  const database = await db();
  const user = await database.collection('users').findOne({ id: req.user.sub }, { projection: { passwordHash: 0 } });
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const store = await database.collection('stores').findOne({ userId: user.id });
  res.json({ user, store });
});

app.post('/api/store', auth, async (req, res) => {
  const database = await db();
  const stores = database.collection('stores');
  if (await stores.findOne({ userId: req.user.sub })) return res.status(409).json({ error: 'Store already exists.' });
  const name = String(req.body.storeName || 'My Store');
  const slug = slugify(req.body.slug || name) || `store-${req.user.sub.slice(0, 8)}`;
  if (await stores.findOne({ slug })) return res.status(409).json({ error: 'That store URL is already in use.' });
  const store = {
    id: randomUUID(), userId: req.user.sub, storeName: name, slug,
    tagline: String(req.body.tagline || 'Shop with us'), vendorPhone: String(req.body.vendorPhone || ''),
    deliveryFee: Number(req.body.deliveryFee || 0), primaryColor: String(req.body.primaryColor || '#12392d'),
    logo: '', paymentDetails: '', deliveryZones: [], discounts: [], createdAt: now()
  };
  await stores.insertOne(store);
  res.status(201).json({ store });
});

app.put('/api/store', auth, async (req, res) => {
  const database = await db();
  const stores = database.collection('stores');
  const store = await stores.findOne({ userId: req.user.sub });
  if (!store) return res.status(404).json({ error: 'Store not found.' });
  const allowed = ['storeName','slug','tagline','vendorPhone','deliveryFee','primaryColor','logo','paymentDetails','deliveryZones','discounts'];
  const patch = {};
  for (const key of allowed) if (req.body[key] !== undefined) patch[key] = req.body[key];
  if (patch.slug !== undefined) {
    patch.slug = slugify(patch.slug);
    if (await stores.findOne({ slug: patch.slug, id: { $ne: store.id } })) return res.status(409).json({ error: 'That store URL is already in use.' });
  }
  if (patch.deliveryFee !== undefined) patch.deliveryFee = Number(patch.deliveryFee);
  await stores.updateOne({ id: store.id, userId: req.user.sub }, { $set: patch });
  res.json({ store: await stores.findOne({ id: store.id }) });
});

app.get('/api/products', auth, async (req, res) => {
  const database = await db();
  const store = await database.collection('stores').findOne({ userId: req.user.sub });
  if (!store) return res.json({ products: [] });
  const products = await database.collection('products').find({ storeId: store.id }).sort({ createdAt: -1 }).toArray();
  res.json({ products });
});

app.post('/api/products', auth, async (req, res) => {
  const database = await db();
  const store = await database.collection('stores').findOne({ userId: req.user.sub });
  if (!store) return res.status(400).json({ error: 'Create your store first.' });
  const product = {
    id: randomUUID(), storeId: store.id, name: String(req.body.name || 'Product'),
    price: Number(req.body.price || 0), description: String(req.body.description || ''),
    emoji: String(req.body.emoji || '🛍️'), stock: Number(req.body.stock ?? 0),
    active: req.body.active !== false, createdAt: now()
  };
  await database.collection('products').insertOne(product);
  res.status(201).json({ product });
});

app.delete('/api/products/:id', auth, async (req, res) => {
  const database = await db();
  const store = await database.collection('stores').findOne({ userId: req.user.sub });
  if (!store) return res.status(404).json({ error: 'Store not found.' });
  const result = await database.collection('products').deleteOne({ id: req.params.id, storeId: store.id });
  if (!result.deletedCount) return res.status(404).json({ error: 'Product not found.' });
  res.json({ deleted: true });
});

app.get('/api/storefront/:slug', async (req, res) => {
  const database = await db();
  const store = await database.collection('stores').findOne({ slug: req.params.slug });
  if (!store) return res.status(404).json({ error: 'Store not found.' });
  const products = await database.collection('products').find({ storeId: store.id, active: true }).sort({ createdAt: -1 }).toArray();
  res.json({ store, products });
});

app.post('/api/orders', async (req, res) => {
  const database = await db();
  const storeId = String(req.body.storeId || '');
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const customerName = String(req.body.customerName || '').trim();
  const customerPhone = String(req.body.customerPhone || '').trim();
  const address = String(req.body.address || '').trim();
  if (!storeId || !customerName || !address || !items.length) return res.status(400).json({ error: 'Store, customer name, address and at least one item are required.' });
  if (!await database.collection('stores').findOne({ id: storeId })) return res.status(404).json({ error: 'Store not found.' });
  const order = {
    id: randomUUID(), storeId, customerName, customerPhone, address, items,
    subtotal: Number(req.body.subtotal || 0), deliveryFee: Number(req.body.deliveryFee || 0),
    discount: Number(req.body.discount || 0), total: Number(req.body.total || 0),
    status: 'new', paymentStatus: 'pending', createdAt: now()
  };
  await database.collection('orders').insertOne(order);
  await database.collection('customers').updateOne(
    { storeId, phone: customerPhone },
    { $set: { storeId, name: customerName, phone: customerPhone, address, updatedAt: now() }, $setOnInsert: { createdAt: now() } },
    { upsert: true }
  );
  res.status(201).json({ orderId: order.id });
});

app.get('/api/orders', auth, async (req, res) => {
  const database = await db();
  const store = await database.collection('stores').findOne({ userId: req.user.sub });
  if (!store) return res.json({ orders: [] });
  const orders = await database.collection('orders').find({ storeId: store.id }).sort({ createdAt: -1 }).toArray();
  res.json({ orders });
});

export default app;
