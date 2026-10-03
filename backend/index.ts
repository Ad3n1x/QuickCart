import { router, json, error, requireAuth } from '@appdeploy/sdk';
import { db } from '@appdeploy/sdk';

const tables = { stores: 'stores', products: 'products', orders: 'orders', customers: 'customers' };

async function ownedStore(userId: string) {
  const { items } = await db.list(tables.stores, { filter: { userId }, limit: 1 });
  return items[0] ?? null;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/me': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    return json({ user: ctx.user, store });
  }],
  'POST /api/store': [requireAuth(), async (ctx) => {
    const body = ctx.body as Record<string, unknown>;
    const existing = await ownedStore(ctx.user!.userId);
    if (existing) return error('Store already exists.', 409);
    const slug = String(body.slug || body.storeName || 'my-store').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || `store-${ctx.user!.userId.slice(0, 8)}`;
    const [id] = await db.add(tables.stores, [{ userId: ctx.user!.userId, storeName: String(body.storeName || 'My Store'), slug, tagline: String(body.tagline || 'Shop with us'), vendorPhone: String(body.vendorPhone || ''), deliveryFee: Number(body.deliveryFee || 0), primaryColor: String(body.primaryColor || '#12392d'), logo: String(body.logo || ''), paymentDetails: String(body.paymentDetails || ''), deliveryZones: [], discounts: [], createdAt: new Date().toISOString() }]);
    if (!id) return error('Could not create store.', 500);
    const [store] = await db.get(tables.stores, [id]);
    return json({ store }, 201);
  }],
  'PUT /api/store': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    if (!store) return error('Store not found.', 404);
    const body = ctx.body as Record<string, unknown>;
    const record = { ...store, ...body, userId: ctx.user!.userId, id: undefined } as Record<string, unknown>;
    delete record.id;
    const [ok] = await db.update(tables.stores, [{ id: store.id, record }]);
    if (!ok) return error('Could not update store.', 500);
    const [updated] = await db.get(tables.stores, [store.id]);
    return json({ store: updated });
  }],
  'GET /api/products': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    if (!store) return json({ products: [] });
    const { items } = await db.list(tables.products, { filter: { storeId: store.id }, limit: 100 });
    return json({ products: items });
  }],
  'POST /api/products': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    if (!store) return error('Create your store first.', 400);
    const body = ctx.body as Record<string, unknown>;
    const [id] = await db.add(tables.products, [{ storeId: store.id, name: String(body.name || 'Product'), price: Number(body.price || 0), description: String(body.description || ''), emoji: String(body.emoji || '🛍️'), stock: Number(body.stock ?? 0), active: body.active !== false, createdAt: new Date().toISOString() }]);
    if (!id) return error('Could not create product.', 500);
    const [product] = await db.get(tables.products, [id]);
    return json({ product }, 201);
  }],
  'DELETE /api/products/:id': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    if (!store) return error('Store not found.', 404);
    const [product] = await db.get(tables.products, [ctx.params.id]);
    if (!product || product.storeId !== store.id) return error('Product not found.', 404);
    const [ok] = await db.delete(tables.products, [ctx.params.id]);
    return json({ deleted: ok });
  }],
  'GET /api/storefront/:slug': [async (ctx) => {
    const { items } = await db.list(tables.stores, { filter: { slug: ctx.params.slug }, limit: 1 });
    const store = items[0];
    if (!store) return error('Store not found.', 404);
    const { items: products } = await db.list(tables.products, { filter: { storeId: store.id, active: true }, limit: 100 });
    return json({ store, products });
  }],
  'POST /api/orders': [async (ctx) => {
    const body = ctx.body as Record<string, unknown>;
    const [id] = await db.add(tables.orders, [{ storeId: String(body.storeId), customerName: String(body.customerName || ''), customerPhone: String(body.customerPhone || ''), address: String(body.address || ''), items: Array.isArray(body.items) ? body.items : [], subtotal: Number(body.subtotal || 0), deliveryFee: Number(body.deliveryFee || 0), discount: Number(body.discount || 0), total: Number(body.total || 0), status: 'new', paymentStatus: 'pending', createdAt: new Date().toISOString() }]);
    if (!id) return error('Could not create order.', 500);
    return json({ orderId: id }, 201);
  }],
  'GET /api/orders': [requireAuth(), async (ctx) => {
    const store = await ownedStore(ctx.user!.userId);
    if (!store) return json({ orders: [] });
    const { items } = await db.list(tables.orders, { filter: { storeId: store.id }, limit: 100 });
    return json({ orders: items });
  }],
});
