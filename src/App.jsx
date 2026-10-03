import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Copy, Eye, EyeOff, ExternalLink, LogIn, LogOut, MessageCircle, Package, Plus, QrCode, Save, Settings, ShoppingBag, Store, Trash2, Users, X } from 'lucide-react';

const API_BASE = import.meta.env.API_URL || '';
const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const api = async (path, options = {}) => {
  const token = localStorage.getItem('quickcart_token');
  const storeId = localStorage.getItem('quickcart_store_id');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(storeId ? { 'X-Store-Id': storeId } : {}), ...(options.headers || {}) }
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
  const [user, setUser] = useState(null), [store, setStore] = useState(null), [stores, setStores] = useState([]), [products, setProducts] = useState([]), [orders, setOrders] = useState([]);
  const [view, setView] = useState('dashboard'), [customerCart, setCustomerCart] = useState({}), [publicStore, setPublicStore] = useState(null);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' }), [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 });
  const [payment, setPayment] = useState(null), [paymentLoading, setPaymentLoading] = useState(false);
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('signup'), [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }), [authError, setAuthError] = useState('');
  const [otpOpen, setOtpOpen] = useState(false), [otp, setOtp] = useState(''), [otpEmail, setOtpEmail] = useState(''), [otpMessage, setOtpMessage] = useState(''), [otpLoading, setOtpLoading] = useState(false);
  const [storeSetupOpen, setStoreSetupOpen] = useState(false), [productModalOpen, setProductModalOpen] = useState(false);
  const hash = window.location.hash;
  const publicMatch = hash.match(/^#\/store\/([^/]+)/);
  const loadPrivate = async () => {
    const token = localStorage.getItem('quickcart_token');
    if (!token) return;
    try {
      const me = await api('/api/me');
      setUser(me.user); setStores(me.stores || (me.store ? [me.store] : [])); if (me.stores?.length && !localStorage.getItem('quickcart_store_id')) localStorage.setItem('quickcart_store_id', me.stores[0].id); setStore(me.stores?.find(s => s.id === localStorage.getItem('quickcart_store_id')) || me.store);
      if (me.store) {
        const [p, o] = await Promise.all([api('/api/products'), api('/api/orders')]);
        setProducts(p.products || []); setOrders(o.orders || []);
      }
    } catch { localStorage.removeItem('quickcart_token'); setUser(null); }
  };

  const loadPublic = async slug => { try { setPublicStore(await api(`/api/storefront/${slug}`)); } catch { setPublicStore(null); } };
  useEffect(() => {
    if (publicMatch) loadPublic(publicMatch[1]); else loadPrivate();
  }, [hash]);

  const submitAuth = async e => {
    e.preventDefault(); setAuthError('');
    if (authMode === 'signup' && authForm.password !== authForm.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = authMode === 'signup' ? { name: authForm.name, email: authForm.email, password: authForm.password } : { email: authForm.email, password: authForm.password };
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (authMode === 'signup') {
        setAuthOpen(false);
        setAuthError('');
        setOtpEmail(data.email || authForm.email.trim().toLowerCase());
        setOtp('');
        setOtpMessage(data.message || 'We sent a 6-digit code to your email.');
        setOtpOpen(true);
        return;
      }
      localStorage.setItem('quickcart_token', data.token);
      setAuthOpen(false); setUser(data.user); await loadPrivate();
    } catch (error) { setAuthError(error.message); }
  };

  const verifyOtp = async e => {
    e.preventDefault(); setOtpLoading(true); setOtpMessage('');
    try {
      const data = await api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email: otpEmail, otp }) });
      localStorage.setItem('quickcart_token', data.token);
      setOtpOpen(false); setOtp(''); setUser(data.user); await loadPrivate();
    } catch (error) { setOtpMessage(error.message); }
    finally { setOtpLoading(false); }
  };

  const resendOtp = async () => {
    setOtpLoading(true); setOtpMessage('');
    try { const data = await api('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email: otpEmail }) }); setOtpMessage(data.message || 'A new code has been sent.'); setOtp(''); }
    catch (error) { setOtpMessage(error.message); }
    finally { setOtpLoading(false); }
  };

  const signOut = () => { localStorage.removeItem('quickcart_token'); localStorage.removeItem('quickcart_store_id'); setUser(null); setStore(null); setStores([]); setProducts([]); setOrders([]); };

  const createStore = async (storeName = 'My Store', slug = '') => {
    setSaving(true);
    try {
      const data = await api('/api/store', { method: 'POST', body: JSON.stringify({ storeName, slug: slug || storeName, tagline: 'Shop with us', vendorPhone: '', deliveryFee: 0, primaryColor: '#12392d' }) });
      setStore(data.store); setStores(current => [...current, data.store]); localStorage.setItem('quickcart_store_id', data.store.id);
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

  if (publicMatch) return <PublicStore data={publicStore} cart={customerCart} setCart={setCustomerCart} customer={customer} setCustomer={setCustomer} />;
  if (!user) return <Landing openAuth={() => setAuthOpen(true)} authOpen={authOpen} mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} error={authError} onSubmit={submitAuth} otpOpen={otpOpen} otp={otp} setOtp={setOtp} otpEmail={otpEmail} otpMessage={otpMessage} otpLoading={otpLoading} onVerifyOtp={verifyOtp} onResendOtp={resendOtp} onCloseOtp={() => setOtpOpen(false)} />;
  if (!store) return <><main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div><section className="landing-hero"><span className="eyebrow-dark">ONE LAST STEP</span><h1>Set up your <span>store.</span></h1><p>Your account is ready. Add the basics and QuickCart will create your storefront.</p><button className="primary big" onClick={() => setStoreSetupOpen(true)} disabled={saving}><Plus size={18} /> {saving ? 'Creating…' : 'Create my store'}</button></section></main><StoreSetupModal open={storeSetupOpen} onClose={() => setStoreSetupOpen(false)} onCreate={async (name, slug) => { await createStore(name, slug); setStoreSetupOpen(false); }} saving={saving} /></>;

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter(o => o.status === 'new').length;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;

  return <><main className="app-shell">
    <header className="dashboard-top"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><div className="top-actions"><a href={shareUrl} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16} /> View store</a><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <div className="dashboard-layout">
      <aside className="sidebar"><div className="store-mini"><Store size={18} /><strong>{store.storeName}</strong><small>/{store.slug}</small></div><div className="store-switcher"><span>YOUR STORES</span>{stores.map(s => <button key={s.id} className={s.id === store.id ? 'store-option active' : 'store-option'} onClick={() => { localStorage.setItem('quickcart_store_id', s.id); window.location.reload(); }}>{s.storeName}</button>)}{stores.length < 2 && <button className="store-add" onClick={() => setStoreSetupOpen(true)}><Plus size={14}/> Add store</button>}</div>{[['dashboard','Overview',BarChart3],['products','Products',Package],['orders','Orders',ShoppingBag],['settings','Store settings',Settings]].map(([id,label,Icon]) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => setView(id)}><Icon size={17} /> {label}</button>)}<div className="sidebar-spacer" /><div className="help"><Users size={17} /><strong>Built for social sellers</strong><span>WhatsApp-first checkout, simple catalog management.</span></div></aside>
      <section className="dashboard-content">
        {view === 'dashboard' && <><div className="page-head"><div><span className="eyebrow-dark">STORE DASHBOARD</span><h1>Good to see you, {user.name || 'seller'}.</h1><p>Manage your storefront and turn social traffic into orders.</p></div><button className="primary" onClick={() => setView('products')}><Plus size={17} /> Add product</button></div><div className="stats"><Stat label="Revenue" value={money(revenue)} /><Stat label="Orders" value={String(orders.length)} /><Stat label="Pending" value={String(pending)} /><Stat label="Products" value={String(products.length)} /></div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Recent orders</h2><button className="link-btn" onClick={() => setView('orders')}>View all</button></div>{orders.length ? orders.slice(0, 5).map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div><div className="panel quick"><h2>Store tools</h2><Tool icon={<Copy />} title="Copy storefront link" action={() => navigator.clipboard.writeText(shareUrl)} /><Tool icon={<QrCode />} title="Share QR code" action={() => alert(shareUrl)} /><Tool icon={<MessageCircle />} title="WhatsApp checkout" action={() => setView('settings')} /></div></div></>}
        {view === 'products' && <><div className="page-head"><div><span className="eyebrow-dark">CATALOG</span><h1>Products</h1><p>Add products and control stock.</p></div><button className="primary" onClick={() => setProductModalOpen(true)}><Plus size={17} /> Add product</button></div><div className="product-admin panel"><h2>Current products</h2>{products.map(p => <div className="admin-row" key={p.id}><span className="product-icon">{p.emoji}</span><div><strong>{p.name}</strong><small>{p.description} · {p.stock} in stock</small></div><strong>{money(p.price)}</strong><button className="icon-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></div>)}</div></>}
        {view === 'orders' && <><div className="page-head"><div><span className="eyebrow-dark">SALES</span><h1>Orders</h1><p>Track every WhatsApp checkout.</p></div></div><div className="panel">{orders.length ? orders.map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div></>}
        {view === 'settings' && <StoreSettings store={store} saving={saving} onSave={saveStore} shareUrl={shareUrl} />}
      </section>
    </div>
  </main><ProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} form={productForm} setForm={setProductForm} onAdd={async () => { await addProduct(); setProductModalOpen(false); }} /></>;
}

function Landing({ openAuth, authOpen, mode, setMode, form, setForm, error, onSubmit, otpOpen, otp, setOtp, otpEmail, otpMessage, otpLoading, onVerifyOtp, onResendOtp, onCloseOtp }) {
  return <main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={openAuth}><LogIn size={16} /> Sign in / Sign up</button></div><section className="landing-hero"><span className="eyebrow-dark">WHATSAPP-FIRST COMMERCE</span><h1>Turn your social audience into <span>orders.</span></h1><p>Create a branded storefront, manage products, receive orders and close sales through WhatsApp.</p><button className="primary big" onClick={openAuth}>Create my store <Plus size={18} /></button></section><div className="feature-strip"><Feature title="Your own store URL" text="Share one link everywhere." /><Feature title="WhatsApp checkout" text="Structured orders, less back-and-forth." /><Feature title="Seller dashboard" text="Products, orders and revenue in one place." /></div>{authOpen && <div className="modal-backdrop"><form className="panel auth-modal" onSubmit={onSubmit}><button type="button" className="close" onClick={openAuth}><X /></button><div className="auth-brand"><span className="brand-mark">Q</span><div><span className="eyebrow-dark">{mode === 'signup' ? 'START SELLING' : 'WELCOME BACK'}</span><h2>{mode === 'signup' ? 'Create your account' : 'Sign in to QuickCart'}</h2></div></div>{mode === 'signup' && <p className="auth-subtitle">Launch your storefront in minutes. We’ll verify your email before you start.</p>}{mode === 'signup' && <label className="auth-field"><span>Your name</span><input autoComplete="name" placeholder="e.g. Adenix" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}<label className="auth-field"><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><PasswordField label="Password" value={form.password} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onChange={value => setForm({ ...form, password: value })} /><div className="password-meter"><span className={form.password.length >= 6 ? 'on' : ''}></span><span className={/[A-Z]/.test(form.password) && /\d/.test(form.password) ? 'on' : ''}></span><span className={form.password.length >= 10 ? 'on' : ''}></span><small>{form.password.length < 6 ? 'Use at least 6 characters' : form.password.length < 10 ? 'Good — a longer password is even better' : 'Strong password'}</small></div>{mode === 'signup' && <PasswordField label="Confirm password" value={form.confirmPassword} placeholder="Re-enter your password" autoComplete="new-password" onChange={value => setForm({ ...form, confirmPassword: value })} />}{error && <div className="error">{error}</div>}<button className="primary auth-submit" type="submit">{mode === 'signup' ? 'Create free account' : 'Sign in'}</button>{mode === 'signup' && <div className="auth-trust"><Check size={15} /> Free to start · Email verification required</div>}<button type="button" className="link-btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button></form></div><OtpModal open={otpOpen} email={otpEmail} otp={otp} setOtp={setOtp} message={otpMessage} loading={otpLoading} onVerify={onVerifyOtp} onResend={onResendOtp} onClose={onCloseOtp} /></main>;
}

function Modal({ children, onClose, wide = false }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className={wide ? 'panel modal-card wide' : 'panel modal-card'}>{children}<button type="button" className="close" onClick={onClose}><X size={18} /></button></div></div>; }

function StoreSetupModal({ open, onClose, onCreate, saving }) { const [name,setName]=useState(''); const [slug,setSlug]=useState(''); if (!open) return null; return <Modal onClose={onClose}><div className="modal-heading"><span className="brand-mark">Q</span><div><span className="eyebrow-dark">STORE SETUP</span><h2>Create another storefront</h2><p>Your free QuickCart account can have up to 2 stores.</p></div></div><div className="form-grid"><label className="field"><span>Store name</span><input autoFocus required placeholder="e.g. Adenix Fashion" value={name} onChange={e=>setName(e.target.value)} /></label><label className="field"><span>Store URL slug</span><input placeholder="adenix-fashion" value={slug} onChange={e=>setSlug(e.target.value)} /></label></div><button className="primary" onClick={()=>onCreate(name,slug)} disabled={saving || !name.trim()}><Plus size={17} /> {saving ? 'Creating…' : 'Create store'}</button></Modal>; }

function ProductModal({ open, onClose, form, setForm, onAdd }) { if (!open) return null; return <Modal onClose={onClose} wide><div className="modal-heading"><span className="brand-mark">+</span><div><span className="eyebrow-dark">NEW PRODUCT</span><h2>Add a product</h2><p>Keep the first version simple. You can edit your catalog later.</p></div></div><div className="form-grid">{[['name','Product name','text'],['price','Price','number'],['description','Description','text'],['emoji','Icon','text'],['stock','Stock','number']].map(([key,label,type]) => <label className="field" key={key}><span>{label}</span><input autoFocus={key === 'name'} type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })} /></label>)}</div><button className="primary" onClick={onAdd}><Plus size={17} /> Add product</button></Modal>; }

function OtpModal({ open, email, otp, setOtp, message, loading, onVerify, onResend, onClose }) {
  if (!open) return null;
  return <div className="modal-backdrop"><form className="panel auth-modal otp-modal" onSubmit={onVerify}>
    <button type="button" className="close" onClick={onClose}><X /></button>
    <span className="brand-mark">Q</span><h2>Verify your email</h2>
    <p>We sent a 6-digit verification code to <strong>{email}</strong>.</p>
    <input className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" placeholder="000000" required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
    {message && <div className="error">{message}</div>}
    <button className="primary" type="submit" disabled={loading || otp.length !== 6}>{loading ? 'Verifying…' : 'Verify email'}</button>
    <button type="button" className="link-btn" onClick={onResend} disabled={loading}>Resend code</button>
  </form></div>;
}

function PasswordField({ label, value, placeholder, autoComplete, onChange }) { const [visible, setVisible] = useState(false); return <label className="auth-field"><span>{label}</span><div className="password-wrap"><input type={visible ? 'text' : 'password'} minLength="6" placeholder={placeholder} autoComplete={autoComplete} required value={value} onChange={e => onChange(e.target.value)} /><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>; }
function Feature({ title, text }) { return <div><strong>{title}</strong><span>{text}</span></div>; }
function Stat({ label, value }) { return <div className="stat panel"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ icon, text }) { return <div className="empty"><span>{icon}</span><strong>{text}</strong><small>It will appear here once customers start using your store.</small></div>; }
function OrderRow({ order }) { return <div className="order-row"><div><strong>{order.customerName || 'Customer'}</strong><small>{order.address || 'No address'} · {new Date(order.createdAt).toLocaleDateString()}</small></div><span className={`status status-${order.status}`}>{order.status}</span><strong>{money(order.total)}</strong></div>; }
function Tool({ icon, title, action }) { return <button className="tool" onClick={action}>{icon}<span>{title}</span><ExternalLink size={14} /></button>; }
function StoreSettings({ store, saving, onSave, shareUrl }) { const [draft, setDraft] = useState(store); const [copied, setCopied] = useState(false); const save = async () => await onSave(draft); return <div><div className="page-head"><div><span className="eyebrow-dark">SETTINGS</span><h1>Store settings</h1><p>Make the storefront yours.</p></div><button className="primary" onClick={save}><Save size={17} /> {saving ? 'Saving…' : 'Save changes'}</button></div><div className="panel settings-form"><div className="form-grid">{[['storeName','Business name'],['slug','Store URL slug'],['tagline','Tagline'],['vendorPhone','WhatsApp number'],['deliveryFee','Default delivery fee'],['primaryColor','Brand color'],['paymentDetails','Payment details']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><input value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: key === 'deliveryFee' ? Number(e.target.value) : e.target.value })} /></label>)}</div><div className="share-box"><strong>Your storefront</strong><code>{shareUrl}</code><button className="ghost" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button></div></div></div>; }
function PublicStore({ data, cart, setCart, customer, setCustomer }) { const [sent, setSent] = useState(false); if (!data) return <main className="center-page"><div className="panel"><h1>Store not found</h1><p>This storefront may have moved or been removed.</p></div></main>; const { store, products } = data; const items = products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })); const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0); const total = subtotal + (subtotal ? store.deliveryFee : 0); const message = [`🛍️ *NEW ORDER — ${store.storeName.toUpperCase()}*`, '', `*Customer:* ${customer.name}`, `*Phone:* ${customer.phone}`, `*Address:* ${customer.address}`, '', '*Items:*', ...items.map(i => `• ${i.quantity}x ${i.name} — ${money(i.price * i.quantity)}`), '', `*Subtotal:* ${money(subtotal)}`, `*Delivery:* ${money(store.deliveryFee)}`, `*TOTAL:* ${money(total)}`, '', '_Order generated by QuickCart_'].join('\\n'); const whatsapp = `https://wa.me/${store.vendorPhone.replace(/\\D/g, '')}?text=${encodeURIComponent(message)}`; const checkout = async () => { if (!customer.name || !customer.address || !items.length) return alert('Add products, your name and delivery address first.'); setPaymentLoading(true); try { const created = await api('/api/orders', { method: 'POST', body: JSON.stringify({ storeId: store.id, customerName: customer.name, customerPhone: customer.phone, address: customer.address, items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })), subtotal, deliveryFee: store.deliveryFee, discount: 0, total }) }); const paymentData = await api('/api/payments/alatpay', { method: 'POST', body: JSON.stringify({ orderId: created.orderId }) }); setPayment(paymentData); setSent(true); } catch (error) { alert(error.message); } finally { setPaymentLoading(false); } }; return <main className="public-store" style={{ '--accent': store.primaryColor || '#12392d' }}><header className="public-nav"><div className="brand"><span className="brand-mark">Q</span>{store.storeName}</div><span className="pill">{items.reduce((s, i) => s + i.quantity, 0)} items</span></header><section className="public-hero"><span className="eyebrow-dark">OFFICIAL STOREFRONT</span><h1>{store.storeName}</h1><p>{store.tagline}</p></section><div className="public-grid"><section className="public-products">{products.map(p => <article className="public-product" key={p.id}><div className="product-art">{p.emoji}</div><div><h3>{p.name}</h3><p>{p.description}</p><strong>{money(p.price)}</strong></div><button className="primary" onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}><Plus size={17} /></button></article>)}</section><aside className="panel public-checkout"><span className="eyebrow-dark">CHECKOUT</span><h2>Your order</h2>{items.length ? items.map(i => <div className="cart-line" key={i.id}><span>{i.quantity}× {i.name}</span><strong>{money(i.price * i.quantity)}</strong></div>) : <Empty icon={<ShoppingBag />} text="Cart is empty" />}<input placeholder="Your name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /><input placeholder="Phone number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /><input placeholder="Delivery address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} /><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><button className="primary checkout-btn" onClick={checkout} disabled={paymentLoading}><MessageCircle size={18} /> {paymentLoading ? 'Creating payment…' : sent ? 'Payment details ready' : 'Pay with ALATPay'}</button>{payment && <div className="payment-box"><strong>ALATPay bank transfer</strong><span>Send exactly {money(payment.amount)} to:</span><code>{payment.accountNumber}</code><small>Bank code: {payment.bankCode || '—'} · Expires: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString() : '—'}</small><button className="ghost" onClick={() => window.open(whatsapp, '_blank')}><MessageCircle size={15} /> Send order on WhatsApp</button></div>}</aside></div></main>; }


export default App;
