import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Copy, Crown, Eye, EyeOff, ExternalLink, LogIn, LogOut, MessageCircle, Package, Plus, QrCode, Save, Settings, ShoppingBag, Store, Trash2, TrendingUp, UserRound, Users, Tag, X } from 'lucide-react';

const API_BASE = import.meta.env.API_URL || '';
const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
let activeRequests = 0;
const setGlobalLoading = delta => { activeRequests = Math.max(0, activeRequests + delta); window.dispatchEvent(new CustomEvent('quickcart-loading', { detail: { loading: activeRequests > 0 } })); };
const api = async (path, options = {}) => {
  setGlobalLoading(1);
  const token = localStorage.getItem('quickcart_token');
  const storeId = localStorage.getItem('quickcart_store_id');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(storeId ? { 'X-Store-Id': storeId } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { setGlobalLoading(-1); throw new Error(data.error || 'Request failed.'); }
  setGlobalLoading(-1);
  return data;
};

const defaultProducts = [
  { name: 'Classic Tee', price: 12000, description: 'Everyday cotton tee', emoji: '👕', stock: 20, active: true },
  { name: 'Urban Cap', price: 5000, description: 'Structured streetwear cap', emoji: '🧢', stock: 15, active: true }
];

function App() {
  const [user, setUser] = useState(null), [store, setStore] = useState(null), [stores, setStores] = useState([]), [products, setProducts] = useState([]), [orders, setOrders] = useState([]);
  const [view, setView] = useState('dashboard'), [customerCart, setCustomerCart] = useState({}), [publicStore, setPublicStore] = useState(null), [premiumOpen, setPremiumOpen] = useState(false), [selectedPlan, setSelectedPlan] = useState('Premium');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' }), [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0 });
  const [globalLoading, setGlobalLoadingState] = useState(false);
  const [payment, setPayment] = useState(null), [paymentLoading, setPaymentLoading] = useState(false), [paymentStatus, setPaymentStatus] = useState('idle'), [paymentError, setPaymentError] = useState('');
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('signup'), [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }), [authError, setAuthError] = useState('');
  const [otpOpen, setOtpOpen] = useState(false), [otp, setOtp] = useState(''), [otpEmail, setOtpEmail] = useState(''), [otpMessage, setOtpMessage] = useState(''), [otpLoading, setOtpLoading] = useState(false);
  const [storeSetupOpen, setStoreSetupOpen] = useState(false), [productModalOpen, setProductModalOpen] = useState(false);
  const hash = window.location.hash;
  useEffect(() => { const handler = event => setGlobalLoadingState(Boolean(event.detail?.loading)); window.addEventListener('quickcart-loading', handler); return () => window.removeEventListener('quickcart-loading', handler); }, []);
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

  useEffect(() => {
    if (!payment?.orderId || paymentStatus === 'paid' || paymentStatus === 'failed' || paymentStatus === 'expired') return;
    let active = true;
    let timer;
    const checkPayment = async () => {
      try {
        const result = await api(`/api/payments/alatpay/status?orderId=${encodeURIComponent(payment.orderId)}`);
        if (!active) return;
        setPaymentStatus(result.paymentStatus || 'awaiting_transfer');
        if (result.paymentStatus === 'paid') {
          setPayment(current => current ? { ...current, status: 'paid' } : current);
          clearInterval(timer);
        } else if (['failed','expired'].includes(result.paymentStatus)) {
          clearInterval(timer);
        }
      } catch (error) {
        if (active) setPaymentError(error.message || 'Unable to check payment status.');
      }
    };
    checkPayment();
    timer = setInterval(checkPayment, 3000);
    return () => { active = false; clearInterval(timer); };
  }, [payment?.orderId, paymentStatus]);

  useEffect(() => {
    if (!user) return;
    const IDLE_MS = 30 * 60 * 1000;
    const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
    const loginAt = Number(localStorage.getItem('quickcart_login_at') || Date.now());
    localStorage.setItem('quickcart_login_at', String(loginAt));
    let lastActivity = Date.now();
    let timer;
    const logoutExpired = () => {
      localStorage.removeItem('quickcart_token');
      localStorage.removeItem('quickcart_store_id');
      localStorage.removeItem('quickcart_login_at');
      setUser(null); setStore(null); setStores([]); setProducts([]); setOrders([]);
      setPremiumOpen(false);
      window.history.replaceState({}, '', window.location.pathname);
    };
    const check = () => {
      const nowMs = Date.now();
      if (nowMs - lastActivity >= IDLE_MS || nowMs - loginAt >= ABSOLUTE_MS) logoutExpired();
    };
    const activity = () => { lastActivity = Date.now(); };
    ['mousedown','keydown','touchstart','scroll'].forEach(event => window.addEventListener(event, activity, { passive:true }));
    timer = setInterval(check, 15000);
    return () => {
      clearInterval(timer);
      ['mousedown','keydown','touchstart','scroll'].forEach(event => window.removeEventListener(event, activity));
    };
  }, [user]);

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

  if (publicMatch) return <><LoadingOverlay visible={globalLoading} /><PublicStore data={publicStore} cart={customerCart} setCart={setCustomerCart} customer={customer} setCustomer={setCustomer} /></>;
  if (!user) return <><LoadingOverlay visible={globalLoading} /><Landing openAuth={() => setAuthOpen(true)} authOpen={authOpen} mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} error={authError} onSubmit={submitAuth} otpOpen={otpOpen} otp={otp} setOtp={setOtp} otpEmail={otpEmail} otpMessage={otpMessage} otpLoading={otpLoading} onVerifyOtp={verifyOtp} onResendOtp={resendOtp} onCloseOtp={() => setOtpOpen(false)} /></>;
  if (!store) return <><LoadingOverlay visible={globalLoading} /><main className="landing"><div className="landing-nav"><div className="brand"><img className="brand-logo" src="/quickcart-logo.svg" alt="QuickCart" /><span>QuickCart</span></div><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div><section className="landing-hero"><span className="eyebrow-dark">ONE LAST STEP</span><h1>Set up your <span>store.</span></h1><p>Your account is ready. Add the basics and QuickCart will create your storefront.</p><button className="primary big" onClick={() => setStoreSetupOpen(true)} disabled={saving}><Plus size={18} /> {saving ? 'Creating…' : 'Create my store'}</button></section></main><StoreSetupModal open={storeSetupOpen} onClose={() => setStoreSetupOpen(false)} onCreate={async (name, slug) => { await createStore(name, slug); setStoreSetupOpen(false); }} saving={saving} /></>;

  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const pending = orders.filter(o => o.status === 'new').length;
  const customers = [...new Map(orders.map(o => [o.customerPhone || o.customerName || o.id, o])).values()];
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const lowStock = products.filter(p => Number(p.stock) <= 5).length;
  const shareUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;

  return <><LoadingOverlay visible={globalLoading} /><main className="app-shell">
    <header className="dashboard-top"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><div className="top-actions"><button className="premium-chip" onClick={() => setPremiumOpen(true)}><Crown size={15}/> Premium</button><a href={shareUrl} target="_blank" rel="noreferrer" className="ghost"><ExternalLink size={16} /> View store</a><button className="ghost" onClick={signOut}><LogOut size={16} /> Sign out</button></div></header>
    <div className="dashboard-layout">
      <aside className="sidebar"><div className="store-mini"><Store size={18} /><strong>{store.storeName}</strong><small>/{store.slug}</small></div><div className="store-switcher"><span>YOUR STORES</span>{stores.map(s => <button key={s.id} className={s.id === store.id ? 'store-option active' : 'store-option'} onClick={() => { localStorage.setItem('quickcart_store_id', s.id); window.location.reload(); }}>{s.storeName}</button>)}{stores.length < 2 && <button className="store-add" onClick={() => setStoreSetupOpen(true)}><Plus size={14}/> Add store</button>}</div>{[['dashboard','Overview',BarChart3],['products','Products',Package],['orders','Orders',ShoppingBag],['customers','Customers',UserRound],['analytics','Analytics',TrendingUp],['discounts','Discounts',Tag],['settings','Store settings',Settings],['premium','Premium',Crown]].map(([id,label,Icon]) => <button key={id} className={view === id ? 'nav active' : 'nav'} onClick={() => setView(id)}><Icon size={17} /> {label}</button>)}<div className="sidebar-spacer" /><div className="help"><Users size={17} /><strong>Built for social sellers</strong><span>WhatsApp-first checkout, simple catalog management.</span></div></aside>
      <section className="dashboard-content">
        {view === 'dashboard' && <><div className="page-head"><div><span className="eyebrow-dark">STORE DASHBOARD</span><h1>Good to see you, {user.name || 'seller'}.</h1><p>Manage your storefront and turn social traffic into orders.</p></div><button className="primary" onClick={() => setView('products')}><Plus size={17} /> Add product</button></div><div className="stats"><Stat label="Revenue" value={money(revenue)} /><Stat label="Orders" value={String(orders.length)} /><Stat label="Pending" value={String(pending)} /><Stat label="Products" value={String(products.length)} /></div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Recent orders</h2><button className="link-btn" onClick={() => setView('orders')}>View all</button></div>{orders.length ? orders.slice(0, 5).map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div><div className="panel quick"><h2>Store tools</h2><Tool icon={<Copy />} title="Copy storefront link" action={() => navigator.clipboard.writeText(shareUrl)} /><Tool icon={<QrCode />} title="Share QR code" action={() => alert(shareUrl)} /><Tool icon={<MessageCircle />} title="WhatsApp checkout" action={() => setView('settings')} /><Tool icon={<TrendingUp />} title="Unlock sales analytics" action={() => setView('premium')} /></div></div><div className="upgrade-banner"><div><span className="premium-label"><Crown size={14}/> QUICKCART PREMIUM</span><h2>See what is actually driving your sales.</h2><p>Unlock analytics, customer history, inventory tools, discounts and advanced storefront controls.</p></div><button className="primary" onClick={() => setView('premium')}><Crown size={17}/> Explore Premium</button></div></>}
        {view === 'products' && <><div className="page-head"><div><span className="eyebrow-dark">CATALOG</span><h1>Products</h1><p>Add products and control stock.</p></div><button className="primary" onClick={() => setProductModalOpen(true)}><Plus size={17} /> Add product</button></div><div className="product-admin panel"><h2>Current products</h2>{products.map(p => <div className="admin-row" key={p.id}><span className="product-icon">{p.emoji}</span><div><strong>{p.name}</strong><small>{p.description} · {p.stock} in stock</small></div><strong>{money(p.price)}</strong><button className="icon-btn" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></div>)}</div></>}
        {view === 'orders' && <><div className="page-head"><div><span className="eyebrow-dark">SALES</span><h1>Orders</h1><p>Track every WhatsApp checkout.</p></div></div><div className="panel">{orders.length ? orders.map(o => <OrderRow key={o.id} order={o} />) : <Empty icon={<ShoppingBag />} text="No orders yet" />}</div></>}
        {view === 'customers' && <CustomersPage customers={customers} />}{view === 'analytics' && <AnalyticsPage revenue={revenue} orders={orders} averageOrder={averageOrder} />}{view === 'discounts' && <DiscountsPage onUpgrade={() => setView('premium')} />}{view === 'settings' && <StoreSettings store={store} saving={saving} onSave={saveStore} shareUrl={shareUrl} />}{view === 'premium' && <PremiumPage onUpgrade={plan => { setSelectedPlan(plan || 'Premium'); setPremiumOpen(true); }} />}
      </section>
    </div>
  </main><ProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} form={productForm} setForm={setProductForm} onAdd={async () => { await addProduct(); setProductModalOpen(false); }} /><PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} plan={selectedPlan} payment={payment} paymentStatus={paymentStatus} paymentError={paymentError} paymentLoading={paymentLoading} onPayPlan={async plan => { setPaymentLoading(true); setPaymentError(''); setPayment(null); setPaymentStatus('idle'); try { const result = await api('/api/payments/alatpay/plan', { method:'POST', body:JSON.stringify({ plan }) }); setPayment(result); setPaymentStatus(result.status || 'awaiting_transfer'); } catch (e) { setPaymentError(e.message); } finally { setPaymentLoading(false); } }} onResetPayment={() => { setPayment(null); setPaymentStatus('idle'); setPaymentError(''); }} /></>;
}

function Landing({ openAuth, authOpen, mode, setMode, form, setForm, error, onSubmit, otpOpen, otp, setOtp, otpEmail, otpMessage, otpLoading, onVerifyOtp, onResendOtp, onCloseOtp }) {
  return <main className="landing"><div className="landing-nav"><div className="brand"><span className="brand-mark">Q</span> QuickCart</div><button className="ghost" onClick={openAuth}><LogIn size={16} /> Sign in / Sign up</button></div><section className="landing-hero"><span className="eyebrow-dark">WHATSAPP-FIRST COMMERCE</span><h1>Turn your social audience into <span>orders.</span></h1><p>Create a branded storefront, manage products, receive orders and close sales through WhatsApp.</p><button className="primary big" onClick={openAuth}>Create my store <Plus size={18} /></button></section><div className="feature-strip"><Feature title="Your own store URL" text="Share one link everywhere." /><Feature title="WhatsApp checkout" text="Structured orders, less back-and-forth." /><Feature title="Seller dashboard" text="Products, orders and revenue in one place." /></div>{authOpen && <div className="modal-backdrop"><form className="panel auth-modal" onSubmit={onSubmit}><button type="button" className="close" onClick={openAuth}><X /></button><div className="auth-brand"><span className="brand-mark">Q</span><div><span className="eyebrow-dark">{mode === 'signup' ? 'START SELLING' : 'WELCOME BACK'}</span><h2>{mode === 'signup' ? 'Create your account' : 'Sign in to QuickCart'}</h2></div></div>{mode === 'signup' && <p className="auth-subtitle">Launch your storefront in minutes. We’ll verify your email before you start.</p>}{mode === 'signup' && <label className="auth-field"><span>Your name</span><input autoComplete="name" placeholder="e.g. Adenix" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>}<label className="auth-field"><span>Email address</span><input type="email" autoComplete="email" placeholder="you@example.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><PasswordField label="Password" value={form.password} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} onChange={value => setForm({ ...form, password: value })} /><div className="password-meter"><span className={form.password.length >= 6 ? 'on' : ''}></span><span className={/[A-Z]/.test(form.password) && /\d/.test(form.password) ? 'on' : ''}></span><span className={form.password.length >= 10 ? 'on' : ''}></span><small>{form.password.length < 6 ? 'Use at least 6 characters' : form.password.length < 10 ? 'Good — a longer password is even better' : 'Strong password'}</small></div>{mode === 'signup' && <PasswordField label="Confirm password" value={form.confirmPassword} placeholder="Re-enter your password" autoComplete="new-password" onChange={value => setForm({ ...form, confirmPassword: value })} />}{error && <div className="error">{error}</div>}<button className="primary auth-submit" type="submit">{mode === 'signup' ? 'Create free account' : 'Sign in'}</button>{mode === 'signup' && <div className="auth-trust"><Check size={15} /> Free to start · Email verification required</div>}<button type="button" className="link-btn" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Create one'}</button></form></div>}<OtpModal open={otpOpen} email={otpEmail} otp={otp} setOtp={setOtp} message={otpMessage} loading={otpLoading} onVerify={onVerifyOtp} onResend={onResendOtp} onClose={onCloseOtp} /></main>;
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


function CustomersPage({ customers }) {
  return <div><div className="page-head"><div><span className="eyebrow-dark">CUSTOMERS</span><h1>Customer history</h1><p>See the people behind your orders in one place.</p></div></div><div className="panel data-panel">{customers.length ? customers.map(c => <div className="customer-row" key={c.id}><div className="avatar">{(c.customerName || 'C').charAt(0).toUpperCase()}</div><div><strong>{c.customerName || 'Customer'}</strong><small>{c.customerPhone || 'No phone'} · Last order {new Date(c.createdAt).toLocaleDateString()}</small></div><strong>{money(c.total)}</strong></div>) : <Empty icon={<UserRound />} text="No customers yet" />}</div></div>;
}
function AnalyticsPage({ revenue, orders, averageOrder }) {
  const max = Math.max(...orders.map(o => Number(o.total) || 0), 1);
  return <div><div className="page-head"><div><span className="eyebrow-dark">PREMIUM ANALYTICS</span><h1>Sales analytics</h1><p>A clearer view of your store performance.</p></div><span className="locked-pill"><Crown size={14}/> Premium</span></div><div className="stats"><Stat label="Revenue" value={money(revenue)} /><Stat label="Orders" value={String(orders.length)} /><Stat label="Average order" value={money(averageOrder)} /><Stat label="Conversion insight" value="Coming soon" /></div><div className="panel chart-panel"><div className="panel-head"><div><h2>Order value</h2><small>Each bar represents an order</small></div><TrendingUp size={20}/></div><div className="bar-chart">{orders.slice(-8).map((o,i)=><div className="bar-wrap" key={o.id || i}><div className="bar" style={{height:`${Math.max(12,(Number(o.total)||0)/max*100)}%`}}></div><small>{money(o.total).replace('NGN','₦')}</small></div>)}</div></div></div>;
}
function DiscountsPage({ onUpgrade }) {
  return <div><div className="page-head"><div><span className="eyebrow-dark">PROMOTIONS</span><h1>Discounts & coupons</h1><p>Create offers that give customers another reason to buy.</p></div><button className="primary" onClick={onUpgrade}><Crown size={16}/> Unlock</button></div><div className="locked-feature panel"><div className="feature-icon"><Tag/></div><div><h2>Turn promotions into a growth tool.</h2><p>Premium lets you create percentage or fixed discounts, set expiry dates and track which offers drive orders.</p></div><div className="feature-list"><span><Check/> Percentage discounts</span><span><Check/> Expiry dates</span><span><Check/> Campaign tracking</span></div></div></div>;
}
function PremiumPage({ onUpgrade }) {
  const plans = [
    {name:'Free',price:'₦0',period:'/forever',desc:'Everything needed to start selling.',features:['2 storefronts','Basic catalog','WhatsApp checkout','Order management']},
    {name:'Premium',price:'₦4,999',period:'/month',desc:'The growth toolkit for serious sellers.',featured:true,features:['Unlimited products','Sales analytics','Customer history','Inventory tools','Discounts & coupons','Custom branding','Advanced order tools','Priority support']},
    {name:'Business',price:'₦9,999',period:'/month',desc:'For larger social-commerce operations.',features:['Everything in Premium','Advanced reports','Team workflows','Priority support']}
  ];
  return <div className="premium-page"><div className="page-head"><div><span className="eyebrow-dark">QUICKCART PLANS</span><h1>Start free. Grow when you're ready.</h1><p>Keep the simple WhatsApp-first workflow and unlock more powerful seller tools as your business grows.</p></div><Crown className="premium-crown" size={34}/></div><div className="plans">{plans.map(p=><div className={p.featured?'plan-card featured':'plan-card'} key={p.name}>{p.featured&&<span className="plan-badge">MOST POPULAR</span>}<span className="eyebrow-dark">{p.name.toUpperCase()}</span><h2>{p.name}</h2><div className="plan-price">{p.price}<small>{p.period}</small></div><p>{p.desc}</p><div className="plan-features">{p.features.map(f=><span key={f}><Check size={15}/>{f}</span>)}</div>{p.name !== 'Free'&&<button className="primary" onClick={() => onUpgrade(p.name)}><Crown size={16}/> {p.name === 'Business' ? 'Choose Business' : 'Upgrade to Premium'}</button>}</div>)}</div></div>;
}
function PremiumModal({ open, onClose, plan = 'Premium', payment, paymentStatus, paymentError, paymentLoading, onPayPlan, onResetPayment }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;
  const amount = plan === 'Business' ? 9999 : 4999;
  const paid = paymentStatus === 'paid';
  const failed = paymentStatus === 'failed';
  const expired = paymentStatus === 'expired';
  const waiting = payment && !paid && !failed && !expired;
  const copyAccount = async () => {
    if (!payment?.accountNumber) return;
    await navigator.clipboard.writeText(payment.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return <Modal onClose={onClose} wide>
    <div className="premium-modal">
      {paid ? <>
        <div className="payment-success-icon"><Check size={30}/></div>
        <span className="premium-label"><Check size={14}/> PAYMENT CONFIRMED</span>
        <h2>You're {plan} now. 🎉</h2>
        <p>Your payment was confirmed by ALATPay and your QuickCart subscription has been activated.</p>
        <div className="payment-confirmed-card">
          <span>Plan</span><strong>{plan}</strong>
          <span>Amount</span><strong>{money(amount)} / month</strong>
          <span>Order</span><code>{payment.orderId}</code>
        </div>
        <button className="primary big" onClick={onClose}>Continue to QuickCart</button>
      </> : waiting ? <>
        <span className="premium-label"><Crown size={14}/> COMPLETE PAYMENT</span>
        <h2>Pay for {plan} securely.</h2>
        <p>Transfer exactly <strong>{money(payment.amount || amount)}</strong> to the temporary account below. QuickCart will detect the confirmed payment automatically.</p>
        <div className="payment-account-card">
          <div className="payment-waiting"><span className="pulse-dot"></span><strong>Waiting for payment</strong><small>Checking automatically every few seconds</small></div>
          <div className="payment-detail"><span>Amount</span><strong>{money(payment.amount || amount)}</strong></div>
          <div className="payment-detail"><span>Bank code</span><strong>{payment.bankCode || '—'}</strong></div>
          <div className="payment-account-number"><span>Account number</span><strong>{payment.accountNumber || '—'}</strong><button type="button" className="ghost" onClick={copyAccount}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy'}</button></div>
          <div className="payment-expiry">Expires: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString() : 'within 30 minutes'}</div>
        </div>
        <div className="payment-tip"><strong>Don't close this window.</strong> You can switch to your banking app, make the transfer, then return here. The popup will update automatically after ALATPay confirms it.</div>
        {paymentError && <div className="error">{paymentError}</div>}
        <button className="ghost payment-cancel" onClick={onResetPayment}>Use another payment attempt</button>
      </> : failed || expired ? <>
        <div className="payment-failed-icon"><X size={28}/></div>
        <span className="premium-label">{expired ? 'PAYMENT EXPIRED' : 'PAYMENT FAILED'}</span>
        <h2>{expired ? 'This payment window expired.' : 'The payment was not completed.'}</h2>
        <p>{expired ? 'The temporary account is no longer active. Start a new payment to continue.' : 'ALATPay reported that this payment did not complete.'}</p>
        <button className="primary big" onClick={onResetPayment}>Try again</button>
      </> : <>
        <span className="premium-label"><Crown size={14}/> {plan.toUpperCase()}</span>
        <h2>{plan === 'Business' ? 'Choose QuickCart Business.' : 'Unlock QuickCart Premium.'}</h2>
        <p>{plan === 'Business' ? 'Business includes every Premium feature plus advanced reports and team workflows.' : 'Premium includes the full seller growth toolkit.'}</p>
        <div className="modal-price"><strong>{money(amount)}</strong><span>/ month</span></div>
        <div className="modal-feature-grid"><span><Check/> Analytics</span><span><Check/> Inventory</span><span><Check/> Customers</span><span><Check/> Discounts</span><span><Check/> Branding</span><span><Check/> Advanced orders</span></div>
        {paymentError && <div className="error">{paymentError}</div>}
        <button className="primary big" disabled={paymentLoading} onClick={() => onPayPlan(plan)}>{paymentLoading ? 'Creating secure payment…' : 'Continue to payment'}</button>
        <small className="payment-secure-note">Secure bank-transfer checkout powered by ALATPay.</small>
      </>}
    </div>
  </Modal>;
}
function LoadingOverlay({ visible }) {
  if (!visible) return null;
  return <div className="global-loading" role="status" aria-live="polite">
    <div className="loading-card">
      <div className="loading-spinner" aria-hidden="true"></div>
      <strong>QuickCart is working…</strong>
      <span>Please wait a moment.</span>
    </div>
  </div>;
}
function PasswordField({ label, value, placeholder, autoComplete, onChange }) { const [visible, setVisible] = useState(false); return <label className="auth-field"><span>{label}</span><div className="password-wrap"><input type={visible ? 'text' : 'password'} minLength="6" placeholder={placeholder} autoComplete={autoComplete} required value={value} onChange={e => onChange(e.target.value)} /><button type="button" className="password-toggle" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>; }
function Feature({ title, text }) { return <div><strong>{title}</strong><span>{text}</span></div>; }
function Stat({ label, value }) { return <div className="stat panel"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ icon, text }) { return <div className="empty"><span>{icon}</span><strong>{text}</strong><small>It will appear here once customers start using your store.</small></div>; }
function OrderRow({ order }) { return <div className="order-row"><div><strong>{order.customerName || 'Customer'}</strong><small>{order.address || 'No address'} · {new Date(order.createdAt).toLocaleDateString()}</small></div><span className={`status status-${order.status}`}>{order.status}</span><strong>{money(order.total)}</strong></div>; }
function Tool({ icon, title, action }) { return <button className="tool" onClick={action}>{icon}<span>{title}</span><ExternalLink size={14} /></button>; }
function StoreSettings({ store, saving, onSave, shareUrl }) { const [draft, setDraft] = useState(store); const [copied, setCopied] = useState(false); const save = async () => await onSave(draft); return <div><div className="page-head"><div><span className="eyebrow-dark">SETTINGS</span><h1>Store settings</h1><p>Make the storefront yours.</p></div><button className="primary" onClick={save}><Save size={17} /> {saving ? 'Saving…' : 'Save changes'}</button></div><div className="panel settings-form"><div className="form-grid">{[['storeName','Business name'],['slug','Store URL slug'],['tagline','Tagline'],['vendorPhone','WhatsApp number'],['deliveryFee','Default delivery fee'],['primaryColor','Brand color'],['paymentDetails','Payment details']].map(([key,label]) => <label className="field" key={key}><span>{label}</span><input value={draft[key] ?? ''} onChange={e => setDraft({ ...draft, [key]: key === 'deliveryFee' ? Number(e.target.value) : e.target.value })} /></label>)}</div><div className="share-box"><strong>Your storefront</strong><code>{shareUrl}</code><button className="ghost" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1200); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button></div></div></div>; }
function PublicStore({ data, cart, setCart, customer, setCustomer }) { const [sent, setSent] = useState(false); if (!data) return <main className="center-page"><div className="panel"><h1>Store not found</h1><p>This storefront may have moved or been removed.</p></div></main>; const { store, products } = data; const items = products.filter(p => cart[p.id]).map(p => ({ ...p, quantity: cart[p.id] })); const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0); const total = subtotal + (subtotal ? store.deliveryFee : 0); const message = [`🛍️ *NEW ORDER — ${store.storeName.toUpperCase()}*`, '', `*Customer:* ${customer.name}`, `*Phone:* ${customer.phone}`, `*Address:* ${customer.address}`, '', '*Items:*', ...items.map(i => `• ${i.quantity}x ${i.name} — ${money(i.price * i.quantity)}`), '', `*Subtotal:* ${money(subtotal)}`, `*Delivery:* ${money(store.deliveryFee)}`, `*TOTAL:* ${money(total)}`, '', '_Order generated by QuickCart_'].join('\\n'); const whatsapp = `https://wa.me/${store.vendorPhone.replace(/\\D/g, '')}?text=${encodeURIComponent(message)}`; const checkout = async () => { if (!customer.name || !customer.address || !items.length) return alert('Add products, your name and delivery address first.'); setPaymentLoading(true); try { const created = await api('/api/orders', { method: 'POST', body: JSON.stringify({ storeId: store.id, customerName: customer.name, customerPhone: customer.phone, address: customer.address, items: items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })), subtotal, deliveryFee: store.deliveryFee, discount: 0, total }) }); const paymentData = await api('/api/payments/alatpay', { method: 'POST', body: JSON.stringify({ orderId: created.orderId }) }); setPayment(paymentData); setSent(true); } catch (error) { alert(error.message); } finally { setPaymentLoading(false); } }; return <main className="public-store" style={{ '--accent': store.primaryColor || '#12392d' }}><header className="public-nav"><div className="brand"><img className="brand-logo" src="/quickcart-logo.svg" alt="QuickCart" /><span>{store.storeName}</span></div><span className="pill">{items.reduce((s, i) => s + i.quantity, 0)} items</span></header><section className="public-hero"><span className="eyebrow-dark">OFFICIAL STOREFRONT</span><h1>{store.storeName}</h1><p>{store.tagline}</p></section><div className="public-grid"><section className="public-products">{products.map(p => <article className="public-product" key={p.id}><div className="product-art">{p.emoji}</div><div><h3>{p.name}</h3><p>{p.description}</p><strong>{money(p.price)}</strong></div><button className="primary" onClick={() => setCart(c => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}><Plus size={17} /></button></article>)}</section><aside className="panel public-checkout"><span className="eyebrow-dark">CHECKOUT</span><h2>Your order</h2>{items.length ? items.map(i => <div className="cart-line" key={i.id}><span>{i.quantity}× {i.name}</span><strong>{money(i.price * i.quantity)}</strong></div>) : <Empty icon={<ShoppingBag />} text="Cart is empty" />}<input placeholder="Your name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /><input placeholder="Phone number" value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /><input placeholder="Delivery address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} /><div className="total-line"><span>Total</span><strong>{money(total)}</strong></div><button className="primary checkout-btn" onClick={checkout} disabled={paymentLoading}><MessageCircle size={18} /> {paymentLoading ? 'Creating payment…' : sent ? 'Payment details ready' : 'Pay with ALATPay'}</button>{payment && <div className="payment-box"><strong>ALATPay bank transfer</strong><span>Send exactly {money(payment.amount)} to:</span><code>{payment.accountNumber}</code><small>Bank code: {payment.bankCode || '—'} · Expires: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString() : '—'}</small><button className="ghost" onClick={() => window.open(whatsapp, '_blank')}><MessageCircle size={15} /> Send order on WhatsApp</button></div>}</aside></div></main>; }


export default App;
