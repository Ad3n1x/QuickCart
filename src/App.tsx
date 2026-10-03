import { useEffect, useMemo, useState } from 'react';
import { api, auth, image } from '@appdeploy/client';
import { BarChart3, Check, Copy, ExternalLink, LogIn, LogOut, Menu, MessageCircle, Package, Plus, QrCode, Save, Settings, ShoppingBag, Store, Trash2, Upload, Users, X } from 'lucide-react';

type Product = { id: string; name: string; price: number; description: string; emoji: string; stock: number; active: boolean };
type StoreData = { id: string; storeName: string; slug: string; tagline: string; vendorPhone: string; deliveryFee: number; primaryColor: string; logo: string; paymentDetails: string; deliveryZones?: { name: string; fee: number }[]; discounts?: { code: string; type: string; value: number }[] };
type Order = { id: string; customerName: string; customerPhone: string; address: string; items: { name: string; quantity: number; price: number }[]; subtotal: number; deliveryFee: number; discount: number; total: number; status: string; paymentStatus: string; createdAt: string };
const money = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const defaultProducts = [{ name: 'Classic Tee', price: 12000, description: 'Everyday cotton tee', emoji: '👕', stock: 20, active: true }, { name: 'Urban Cap', price: 5000, description: 'Structured streetwear cap', emoji: '🧢', stock: 15, active: true }];

function App() {
  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [view, setView] = useState<'dashboard' | 'products' | 'orders' | 'settings'>('dashboard');
  const [customerCart, setCustomerCart] = useState<Record<string, number>>({});
  const [publicStore, setPublicStore] = useState<{ store: StoreData; products: Product[] } | null>(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 });

  const hash = window.location.hash;
  const publicMatch = hash.match(/^#\/store\/([^/]+)/);
  const isPublic = Boolean(publicMatch);

  const loadPrivate = async () => {
    if (!auth.isSignedIn()) return;
    const me = await api.get('/api/me');
    setUser(me.data.user);
    setStore(me.data.store);
    if (me.data.store) {
      const [p, o] = await Promise.all([api.get('/api/products'), api.get('/api/orders')]);
      setProducts(p.data.products || []);
      setOrders(o.data.orders || []);
    }
  };

  const loadPublic = async (slug: string) => {
    try { const response = await api.get(`/api/storefront/${slug}`); setPublicStore(response.data); } catch { setPublicStore(null); }
  };

  useEffect(() => { if (publicMatch) void loadPublic(publicMatch[1]); else void loadPrivate(); }, [hash]);

  const signIn = async () => { await auth.signIn(); await loadPrivate(); };
  const signOut = async () => { await auth.signOut(); setUser(null); setStore(null); };

  const createStore = async () => {
    setSaving(true);
    try {
      const response = await api.post('/api/store', { storeName: 'My Store', slug: 'my-store', tagline: 'Shop with us', vendorPhone: '', deliveryFee: 0, primaryColor: '#12392d' });
      setStore(response.data.store);
      for (const product of defaultProducts) { await api.post('/api/products', product); }
      const p = await api.get('/api/products'); setProducts(p.data.products || []);
    } finally { setSaving(false); }
  };

  const saveStore = async (patch: Partial<StoreData>) => { if (!store) return; setSaving(true); try { const response = await api.put('/api/store', patch); setStore(response.data.store); } finally { setSaving(false); } };
  const addProduct = async () => { const response = await api.post('/api/products', productForm); setProducts(current => [...current, response.data.product]); setProductForm({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 }); };
  const deleteProduct = async (id: string) => { await api.delete(`/api/products/${id}`); setProducts(current => current.filter(p => p.id !== id)); };

  if (isPublic) return <PublicStore data={publicStore} cart={customerCart} setCart={setCustomerCart} customer={customer} setCustomer={setCustomer} />;
  if (!user) return <Landing onSignIn={signIn} />;
  if (!store) return <main className="center-page"><div className="panel onboarding"><Store size={44} /><h1>Create your storefront</h1><p>Your account is ready. Create your store and get a shareable storefront URL.</p><button className="primary" onClick={createStore} disabled={saving}><Plus size={18} /> {saving ? 'Creating…' : 'Create my store'}</button></div></main>;

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter(o => o.status === 'new').length;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;

  return <main className="app-shell">
    <header className="dashboard-top"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><div className="top-actions"><a href={shareUrl} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16} /> View store</a><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <div className="dashboard-layout">
      <aside className="sidebar"><div className="store-mini"><Store size={18} /><strong>{store.storeName}</strong><small>/{store.slug}</small></div>{[['dashboard','Overview',BarChart3],['products','Products',Package],['orders','Orders',ShoppingBag],['settings','Store settings',Settings]].map(([id,label,Icon]: any) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => setView(id)}><Icon size={17} /> {label}</button>)}<div className="sidebar-spacer" /><div className="help"><Users size={17} /><strong>Built for social sellers</strong><span>WhatsApp-first checkout, simple catalog management.</span></div></aside>
      <section className="dashboard-content">
        {view === 'dashboard' && <><div className="page-head"><div><span className="eyebrow-dark">STORE DASHBOARD</span><h1>Good to see you, {user.name || 'seller'}.</h1><p>Manage your storefront and turn social traffic into orders.</p></div><button className="primary" onClick={() => setView('products')}><Plus size={17} /> Add product</button></div><div className="stats"><Stat label="Revenue" value={money(revenue)} /><Stat label="Orders" value={String(orders.length)} /><Stat label="Pending" value={String(pending)} /><Stat label="Products" value={String(products.length)} /></div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Recent orders</h2><button className="link-btn" onClick={() => setView('orders')}>View all</button></div>{orders.length ? orders.slice(0, 5).map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div><div className="panel quick"><h2>Store tools</h2><Tool icon={<Copy />} title="Copy storefront link" action={async () => { await navigator.clipboard.writeText(shareUrl); alert('Store link copied.'); }} /><Tool icon={<QrCode />} title="Share QR code" action={() => alert(`Your store URL is ${shareUrl}`)} /><Tool icon={<MessageCircle />} title="WhatsApp checkout" action={() => setView('settings')} /></div></div></>}
        {view === 'products' && <><div className="page-head"><div><span className="eyebrow-dark">CATALOG</span><h1>Products</h1><p>Add products and control stock.</p></div></div><div className="product-admin panel"><div className="form-grid">{[['name','Product name','text'],['price','Price','number'],['description','Description','text'],['emoji','Icon','text'],['stock','Stock','number']].map(([key,label,type]) => <label className="field" key={key}><span>{label}</span><input type={type} value={(productForm as any)[key]} onChange={e => setProductForm({ ...productForm, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>)}</div><button className="primary" onClick={addProduct}><Plus size={17} /> Add product</button></div><div className="product-admin panel"><h2>Current products</h2>{products.map(p => <div className="admin-row" key={p.id}><span className="product-icon">{p.emoji}</span><div><strong>{p.name}</strong><small>{p.description} · {p.stock} in stock</small></div><strong>{money(p.price)}</strong><button className="icon-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></div>)}</div></>}
        {view === 'orders' && <><div className="page-head"><div><span className="eyebrow-dark">SALES</span><h1>Orders</h1><p>Track every WhatsApp checkout.</p></div></div><div className="panel">{orders.length ? orders.map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div></>}
        {view === 'settings' && <StoreSettings store={store} saving={saving} onSave={saveStore} shareUrl={shareUrl} />}
      </section>
    </div>
  </main>;
}

function Landing({ onSignIn }: { onSignIn: () => void }) { return <main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={onSignIn}><LogIn size={16} /> Sign in / Sign up</button></div><section className="landing-hero"><span className="eyebrow-dark">WHATSAPP-FIRST COMMERCE</span><h1>Turn your social audience into <span>orders.</span></h1><p>Create a branded storefront, manage products, receive orders and close sales through WhatsApp.</p><button className="primary big" onClick={onSignIn}>Create my store <Plus size={18} /></button></section><div className="feature-strip"><Feature title="Your own store URL" text="Share one link everywhere." /><Feature title="WhatsApp checkout" text="Structured orders, less back-and-forth." /><Feature title="Seller dashboard" text="Products, orders and revenue in one place." /></div></main> }
function Feature({ title, text }: { title: string; text: string }) { return <div><strong>{title}</strong><span>{text}</span></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat panel"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="empty"><span>{icon}</span><strong>{text}</strong><small>It will appear here once customers start using your store.</small></div>; }
function OrderRow({ order }: { order: Order }) { return <div className="order-row"><div><strong>{order.customerName || 'Customer'}</strong><small>{order.address || 'No address'} · {new Date(order.createdAt).toLocaleDateString()}</small></div><span className={`status status-${order.status}`}>{order.status}</span><strong>{money(order.total)}</strong></div>; }
function Tool({ icon, title, action }: { icon: React.ReactNode; title: string; action: () => void }) { return <button className="tool" onClick={action}>{icon}<span>{title}</span><ExternalLink size={14} /></button>; }
function StoreSettings({ store, saving, onSave, shareUrl }: { store: StoreData; saving: boolean; onSave: (patch: Partial<StoreData>) => Promise<void>; shareUrl: string }) { const [draft, setDraft] = useState(store); const [copied, setCopied] = useState(false); const save = async () => { await onSave(draft); }; return <div><div className="page-head"><div><span className="eyebrow-dark">SETTINGS</span><h1>Store settings</h1><p>Make the storefront yours.</p></div><button className="primary" onClick={save}><Save size={17} /> {saving ? 'Saving…' : 'Save changes'}</button></div><div className="panel settings-form"><div className="form-grid">{[['storeName','Business name'],['slug','Store URL slug'],['tagline','Tagline'],['vendorPhone','WhatsApp number'],['deliveryFee','Default delivery fee'],['primaryColor','Brand color'],['paymentDetails','Payment details']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><input value={(draft as any)[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: key === 'deliveryFee' ? Number(e.target.value) : e.target.value })} /></label>)}</div><div className="share-box"><strong>Your storefront</strong><code>{shareUrl}</code><button className="ghost" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button></div></div></div> }
function PublicStore({ data, cart, setCart, customer, setCustomer }: { data: { store: StoreData; products: Product[] } | null; cart: Record<string, number>; setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>; customer: { name: string; phone: string; address: string }; setCustomer: React.Dispatch<React.SetStateAction<{ name: string; phone: string; address: string }>> }) { const [sent, setSent] = useState(false); if (!data) return <main className="center-page"><div className="panel"><h1>Store not found</h1><p>This storefront may have moved or been removed.</p></div></main>; const { store, products } = data; const items = products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })); const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0); const total = subtotal + (subtotal ? store.deliveryFee : 0); const message = [`🛍️ *NEW ORDER — ${store.storeName.toUpperCase()}*`, '', `*Customer:* ${customer.name}`, `*Phone:* ${customer.phone}`, `*Address:* ${customer.address}`, '', '*Items:*', ...items.map(i => `• ${i.quantity}x ${i.name} — ${money(i.price * i.quantity)}`), '', `*Subtotal:* ${money(subtotal)}`, `*Delivery:* ${money(store.deliveryFee)}`, `*TOTAL:* ${money(total)}`, '', '_Order generated by QuickCart_'].join('\n'); const whatsapp = `https://wa.me/${store.vendorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`; const checkout = async () => { if (!customer.name || !customer.address || !items.length) return alert('Add products, your name and delivery address first.'); await api.post('/api/orders', { storeId: store.id, customerName: customer.name, customerPhone: customer.phone, address: customer.address, items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })), subtotal, deliveryFee: store.deliveryFee, discount: 0, total }); setSent(true); window.open(whatsapp, '_blank'); }; return <main className="public-store" style={{ ['--accent' as any]: store.primaryColor || '#12392d' }}><header className="public-nav"><div className="brand"><span className="brand-mark">Q</span>{store.storeName}</div><span className="pill">{items.reduce((s, i) => s + i.quantity, 0)} items</span></header><section className="public-hero"><span className="eyebrow-dark">OFFICIAL STOREFRONT</span><h1>{store.storeName}</h1><p>{store.tagline}</p></section><div className="public-grid"><section className="public-products">{products.map(p => <article className="public-product" key={p.id}><div className="product-art">{p.emoji}</div><div><h3>{p.name}</h3><p>{p.description}</p><strong>{money(p.price)}</strong></div><button className="primary" onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}><Plus size={17} /></button></article>)}</section><aside className="panel public-checkout"><span className="eyebrow-dark">CHECKOUT</span><h2>Your order</h2>{items.length ? items.map(i => <div className="cart-line" key={i.id}><span>{i.quantity}× {i.name}</span><strong>{money(i.price * i.quantity)}</strong></div>) : <Empty icon={<ShoppingBag />} text="Cart is empty" />}<input placeholder="Your name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /><input placeholder="Phone number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /><input placeholder="Delivery address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} /><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><button className="primary checkout-btn" onClick={checkout}><MessageCircle size={18} /> {sent ? 'Order sent — send another' : 'Order via WhatsApp'}</button></aside></div></main> }
export default App;
