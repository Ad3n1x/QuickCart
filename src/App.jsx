import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Copy, ExternalLink, LogIn, LogOut, MessageCircle, Package, Plus, QrCode, Save, Settings, ShoppingBag, Store, Trash2, Users, X } from 'lucide-react';

const API_BASE = import.meta.env.API_URL || '';
const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const api = async (path, options = {}) => {
  const token = localStorage.getItem('quickcart_token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
};

const defaultProducts = [
  { name: 'Classic Tee', price: 12000, description: 'Everyday cotton tee', emoji: '👕', stock: 20, active: true },
  { name: 'Urban Cap', price: 5000, description: 'Structured streetwear cap', emoji: '🧢', stock: 15, active: true }
];

function App() {
  const [user, setUser] = useState(null), [store, setStore] = useState(null), [products, setProducts] = useState([]), [orders, setOrders] = useState([]);
  const [view, setView] = useState('dashboard'), [customerCart, setCustomerCart] = useState({}), [publicStore, setPublicStore] = useState(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' }), [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 });
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('signup'), [authForm, setAuthForm] = useState({ name: '', email: '', password: '' }), [authError, setAuthError] = useState('');
  const [storeSetupOpen, setStoreSetupOpen] = useState(false), [productModalOpen, setProductModalOpen] = useState(false);
  const [verificationState, setVerificationState] = useState(null);

  const hash = window.location.hash;
  const publicMatch = hash.match(/^#\/store\/([^/]+)/);
  const verifyMatch = hash.match(/^#\/verify-email\?token=([^&]+)/);

  const loadPrivate = async () => {
    const token = localStorage.getItem('quickcart_token');
    if (!token) return;
    try {
      const me = await api('/api/me');
      setUser(me.user); setStore(me.store);
      if (me.store) {
        const [p, o] = await Promise.all([api('/api/products'), api('/api/orders')]);
        setProducts(p.products || []); setOrders(o.orders || []);
      }
    } catch { localStorage.removeItem('quickcart_token'); setUser(null); }
  };

  const loadPublic = async slug => { try { setPublicStore(await api(`/api/storefront/${slug}`)); } catch { setPublicStore(null); } };
  useEffect(() => {
    if (verifyMatch) {
      setVerificationState({ loading: true, message: '' });
      api('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: decodeURIComponent(verifyMatch[1]) }) })
        .then(data => { localStorage.setItem('quickcart_token', data.token); setVerificationState({ loading: false, message: data.message }); setUser(data.user); loadPrivate(); })
        .catch(error => setVerificationState({ loading: false, message: error.message, error: true }));
    } else if (publicMatch) loadPublic(publicMatch[1]); else loadPrivate();
  }, [hash]);

  const submitAuth = async e => {
    e.preventDefault(); setAuthError('');
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(authForm) });
      if (authMode === 'signup') {
        setAuthOpen(false);
        setAuthError('');
        alert(data.message || 'Check your email to verify your account.');
        setAuthMode('login');
        return;
      }
      localStorage.setItem('quickcart_token', data.token);
      setAuthOpen(false); setUser(data.user); await loadPrivate();
    } catch (error) { setAuthError(error.message); }
  };

  const signOut = () => { localStorage.removeItem('quickcart_token'); setUser(null); setStore(null); setProducts([]); setOrders([]); };

  const createStore = async () => {
    setSaving(true);
    try {
      const data = await api('/api/store', { method: 'POST', body: JSON.stringify({ storeName: 'My Store', slug: 'my-store', tagline: 'Shop with us', vendorPhone: '', deliveryFee: 0, primaryColor: '#12392d' }) });
      setStore(data.store);
      for (const product of defaultProducts) await api('/api/products', { method: 'POST', body: JSON.stringify(product) });
      const p = await api('/api/products'); setProducts(p.products || []);
    } finally { setSaving(false); }
  };

  const saveStore = async patch => {
    setSaving(true);
    try { const data = await api('/api/store', { method: 'PUT', body: JSON.stringify(patch) }); setStore(data.store); }
    finally { setSaving(false); }
  };

  const addProduct = async () => {
    const data = await api('/api/products', { method: 'POST', body: JSON.stringify(productForm) });
    setProducts(current => [...current, data.product]);
    setProductForm({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 });
  };

  const deleteProduct = async id => {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(current => current.filter(p => p.id !== id));
  };

  if (verifyMatch) return <VerifyEmail state={verificationState} />;
  if (publicMatch) return <PublicStore data={publicStore} cart={customerCart} setCart={setCustomerCart} customer={customer} setCustomer={setCustomer} />;
  if (!user) return <Landing openAuth={() => setAuthOpen(true)} authOpen={authOpen} mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} error={authError} onSubmit={submitAuth} />;
  if (!store) return <><main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div><section className="landing-hero"><span className="eyebrow-dark">ONE LAST STEP</span><h1>Set up your <span>store.</span></h1><p>Your account is ready. Add the basics and QuickCart will create your storefront.</p><button className="primary big" onClick={() => setStoreSetupOpen(true)} disabled={saving}><Plus size={18} /> {saving ? 'Creating…' : 'Create my store'}</button></section></main><StoreSetupModal open={storeSetupOpen} onClose={() => setStoreSetupOpen(false)} onCreate={async () => { await createStore(); setStoreSetupOpen(false); }} saving={saving} /></>;

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter(o => o.status === 'new').length;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;

  return <><main className="app-shell">
    <header className="dashboard-top"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><div className="top-actions"><a href={shareUrl} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16} /> View store</a><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <div className="dashboard-layout">
      <aside className="sidebar"><div className="store-mini"><Store size={18} /><strong>{store.storeName}</strong><small>/{store.slug}</small></div>{[['dashboard','Overview',BarChart3],['products','Products',Package],['orders','Orders',ShoppingBag],['settings','Store settings',Settings]].map(([id,label,Icon]) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => setView(id)}><Icon size={17} /> {label}</button>)}<div className="sidebar-spacer" /><div className="help"><Users size={17} /><strong>Built for social sellers</strong><span>WhatsApp-first checkout, simple catalog management.</span></div></aside>
      <section className="dashboard-content">
        {view === 'dashboard' && <><div className="page-head"><div><span className="eyebrow-dark">STORE DASHBOARD</span><h1>Good to see you, {user.name || 'seller'}.</h1><p>Manage your storefront and turn social traffic into orders.</p></div><button className="primary" onClick={() => setView('products')}><Plus size={17} /> Add product</button></div><div className="stats"><Stat label="Revenue" value={money(revenue)} /><Stat label="Orders" value={String(orders.length)} /><Stat label="Pending" value={String(pending)} /><Stat label="Products" value={String(products.length)} /></div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Recent orders</h2><button className="link-btn" onClick={() => setView('orders')}>View all</button></div>{orders.length ? orders.slice(0, 5).map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div><div className="panel quick"><h2>Store tools</h2><Tool icon={<Copy />} title="Copy storefront link" action={() => navigator.clipboard.writeText(shareUrl)} /><Tool icon={<QrCode />} title="Share QR code" action={() => alert(shareUrl)} /><Tool icon={<MessageCircle />} title="WhatsApp checkout" action={() => setView('settings')} /></div></div></>}
        {view === 'products' && <><div className="page-head"><div><span className="eyebrow-dark">CATALOG</span><h1>Products</h1><p>Add products and control stock.</p></div><button className="primary" onClick={() => setProductModalOpen(true)}><Plus size={17} /> Add product</button></div><div className="product-admin panel"><div className="form-grid">{[['name','Product name','text'],['price','Price','number'],['description','Description','text'],['emoji','Icon','text'],['stock','Stock','number']].map(([key,label,type]) => <label className="field" key={key}><span>{label}</span><input type={type} value={productForm[key]} onChange={e => setProductForm({ ...productForm, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>)}</div></div><div className="product-admin panel"><h2>Current products</h2>{products.map(p => <div className="admin-row" key={p.id}><span className="product-icon">{p.emoji}</span><div><strong>{p.name}</strong><small>{p.description} · {p.stock} in stock</small></div><strong>{money(p.price)}</strong><button className="icon-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></div>)}</div></>}
        {view === 'orders' && <><div className="page-head"><div><span className="eyebrow-dark">SALES</span><h1>Orders</h1><p>Track every WhatsApp checkout.</p></div></div><div className="panel">{orders.length ? orders.map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div></>}
        {view === 'settings' && <StoreSettings store={store} saving={saving} onSave={saveStore} shareUrl={shareUrl} />}
      </section>
    </div>
  </main><ProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} form={productForm} setForm={setProductForm} onAdd={async () => { await addProduct(); setProductModalOpen(false); }} /></>;
}

function Landing({ openAuth, authOpen, mode, setMode, form, setForm, error, onSubmit }) {
  return <main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={openAuth}><LogIn size={16} /> Sign in / Sign up</button></div><section className="landing-hero"><span className="eyebrow-dark">WHATSAPP-FIRST COMMERCE</span><h1>Turn your social audience into <span>orders.</span></h1><p>Create a branded storefront, manage products, receive orders and close sales through WhatsApp.</p><button className="primary big" onClick={openAuth}>Create my store <Plus size={18} /></button></section><div className="feature-strip"><Feature title="Your own store URL" text="Share one link everywhere." /><Feature title="WhatsApp checkout" text="Structured orders, less back-and-forth." /><Feature title="Seller dashboard" text="Products, orders and revenue in one place." /></div>{authOpen && <div className="modal-backdrop"><form className="panel auth-modal" onSubmit={onSubmit}><button type="button" className="close" onClick={openAuth}><X /></button><h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>{mode === 'signup' && <input placeholder="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />}<input type="email" placeholder="Email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><input type="password" minLength="6" placeholder="Password (6+ characters)" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />{error && <div className="error">{error}</div>}<button className="primary" type="submit">{mode === 'signup' ? 'Create account' : 'Sign in'}</button><button type="button" className="link-btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button></form></div>}</main>;
}

function Modal({ children, onClose, wide = false }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={wide ? 'panel modal-card wide' : 'panel modal-card'}>{children}<button type="button" className="close" onClick={onClose}><X size={18} /></button></div></div>; }

function StoreSetupModal({ open, onClose, onCreate, saving }) { if (!open) return null; return <Modal onClose={onClose}><div className="modal-heading"><span className="brand-mark">Q</span><div><span className="eyebrow-dark">STORE SETUP</span><h2>Create your storefront</h2><p>QuickCart will start you with a simple catalog you can edit later.</p></div></div><button className="primary" onClick={onCreate} disabled={saving}><Plus size={17} /> {saving ? 'Creating…' : 'Create my store'}</button></Modal>; }

function ProductModal({ open, onClose, form, setForm, onAdd }) { if (!open) return null; return <Modal onClose={onClose} wide><div className="modal-heading"><span className="brand-mark">+</span><div><span className="eyebrow-dark">NEW PRODUCT</span><h2>Add a product</h2><p>Keep the first version simple. You can edit your catalog later.</p></div></div><div className="form-grid">{[['name','Product name','text'],['price','Price','number'],['description','Description','text'],['emoji','Icon','text'],['stock','Stock','number']].map(([key,label,type]) => <label className="field" key={key}><span>{label}</span><input autoFocus={key === 'name'} type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>)}</div><button className="primary" onClick={onAdd}><Plus size={17} /> Add product</button></Modal>; }

function Feature({ title, text }) { return <div><strong>{title}</strong><span>{text}</span></div>; }
function Stat({ label, value }) { return <div className="stat panel"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ icon, text }) { return <div className="empty"><span>{icon}</span><strong>{text}</strong><small>It will appear here once customers start using your store.</small></div>; }
function OrderRow({ order }) { return <div className="order-row"><div><strong>{order.customerName || 'Customer'}</strong><small>{order.address || 'No address'} · {new Date(order.createdAt).toLocaleDateString()}</small></div><span className={`status status-${order.status}`}>{order.status}</span><strong>{money(order.total)}</strong></div>; }
function Tool({ icon, title, action }) { return <button className="tool" onClick={action}>{icon}<span>{title}</span><ExternalLink size={14} /></button>; }
function StoreSettings({ store, saving, onSave, shareUrl }) { const [draft, setDraft] = useState(store); const [copied, setCopied] = useState(false); const save = async () => await onSave(draft); return <div><div className="page-head"><div><span className="eyebrow-dark">SETTINGS</span><h1>Store settings</h1><p>Make the storefront yours.</p></div><button className="primary" onClick={save}><Save size={17} /> {saving ? 'Saving…' : 'Save changes'}</button></div><div className="panel settings-form"><div className="form-grid">{[['storeName','Business name'],['slug','Store URL slug'],['tagline','Tagline'],['vendorPhone','WhatsApp number'],['deliveryFee','Default delivery fee'],['primaryColor','Brand color'],['paymentDetails','Payment details']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><input value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: key === 'deliveryFee' ? Number(e.target.value) : e.target.value })} /></label>)}</div><div className="share-box"><strong>Your storefront</strong><code>{shareUrl}</code><button className="ghost" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button></div></div></div>; }
function PublicStore({ data, cart, setCart, customer, setCustomer }) { const [sent, setSent] = useState(false); if (!data) return <main className="center-page"><div className="panel"><h1>Store not found</h1><p>This storefront may have moved or been removed.</p></div></main>; const { store, products } = data; const items = products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })); const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0); const total = subtotal + (subtotal ? store.deliveryFee : 0); const message = [`🛍️ *NEW ORDER — ${store.storeName.toUpperCase()}*`, '', `*Customer:* ${customer.name}`, `*Phone:* ${customer.phone}`, `*Address:* ${customer.address}`, '', '*Items:*', ...items.map(i => `• ${i.quantity}x ${i.name} — ${money(i.price * i.quantity)}`), '', `*Subtotal:* ${money(subtotal)}`, `*Delivery:* ${money(store.deliveryFee)}`, `*TOTAL:* ${money(total)}`, '', '_Order generated by QuickCart_'].join('\\n'); const whatsapp = `https://wa.me/${store.vendorPhone.replace(/\\D/g, '')}?text=${encodeURIComponent(message)}`; const checkout = async () => { if (!customer.name || !customer.address || !items.length) return alert('Add products, your name and delivery address first.'); await api('/api/orders', { method: 'POST', body: JSON.stringify({ storeId: store.id, customerName: customer.name, customerPhone: customer.phone, address: customer.address, items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })), subtotal, deliveryFee: store.deliveryFee, discount: 0, total }) }); setSent(true); window.open(whatsapp, '_blank'); }; return <main className="public-store" style={{ '--accent': store.primaryColor || '#12392d' }}><header className="public-nav"><div className="brand"><span className="brand-mark">Q</span>{store.storeName}</div><span className="pill">{items.reduce((s, i) => s + i.quantity, 0)} items</span></header><section className="public-hero"><span className="eyebrow-dark">OFFICIAL STOREFRONT</span><h1>{store.storeName}</h1><p>{store.tagline}</p></section><div className="public-grid"><section className="public-products">{products.map(p => <article className="public-product" key={p.id}><div className="product-art">{p.emoji}</div><div><h3>{p.name}</h3><p>{p.description}</p><strong>{money(p.price)}</strong></div><button className="primary" onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}><Plus size={17} /></button></article>)}</section><aside className="panel public-checkout"><span className="eyebrow-dark">CHECKOUT</span><h2>Your order</h2>{items.length ? items.map(i => <div className="cart-line" key={i.id}><span>{i.quantity}× {i.name}</span><strong>{money(i.price * i.quantity)}</strong></div>) : <Empty icon={<ShoppingBag />} text="Cart is empty" />}<input placeholder="Your name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /><input placeholder="Phone number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /><input placeholder="Delivery address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} /><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><button className="primary checkout-btn" onClick={checkout}><MessageCircle size={18} /> {sent ? 'Order sent — send another' : 'Order via WhatsApp'}</button></aside></div></main>; }


function VerifyEmail({ state }) {
  return <main className="center-page"><div className="panel onboarding"><span className="brand-mark">Q</span><h1>{state?.loading ? 'Verifying your email…' : state?.error ? 'Verification failed' : 'Email verified 🎉'}</h1><p>{state?.message || 'Checking your verification link.'}</p>{!state?.loading && <a className="primary" href={window.location.pathname}>Continue to QuickCart</a>}</div></main>;
}

export default App;
