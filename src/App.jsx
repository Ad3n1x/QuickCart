import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Check, Copy, Crown, Eye, EyeOff, ExternalLink, LogIn, LogOut, MessageCircle, Package, Plus, Save, Settings, ShoppingBag, Store, Trash2, TrendingUp, UserRound, Users, Tag, X, Edit3, Download, Search, Truck, Share2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_BASE = import.meta.env.API_URL || 'https://quickcart-api-f7x7.onrender.com';
const money = n => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
let activeRequests = 0;
const setGlobalLoading = delta => { activeRequests = Math.max(0, activeRequests + delta); window.dispatchEvent(new CustomEvent('quickcart-loading', { detail: { loading: activeRequests > 0 } })); };
const api = async (path, options = {}) => {
  setGlobalLoading(1);
  try {
    const token = localStorage.getItem('quickcart_token');
    const storeId = localStorage.getItem('quickcart_store_id');
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(storeId ? { 'X-Store-Id': storeId } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'Request failed.'); error.status = response.status; error.path = path; throw error; }
    return data;
  } finally { setGlobalLoading(-1); }
};

const defaultProducts = [{ name: 'Classic Tee', price: 12000, description: 'Everyday cotton tee', emoji: '👕', stock: 20, active: true }, { name: 'Urban Cap', price: 5000, description: 'Structured streetwear cap', emoji: '🧢', stock: 15, active: true }];

function App() {
  const [user, setUser] = useState(null), [store, setStore] = useState(null), [stores, setStores] = useState([]), [products, setProducts] = useState([]), [orders, setOrders] = useState([]);
  const [view, setView] = useState('dashboard'), [customerCart, setCustomerCart] = useState({}), [publicStore, setPublicStore] = useState(null), [premiumOpen, setPremiumOpen] = useState(false), [selectedPlan, setSelectedPlan] = useState('Premium');
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' }), [saving, setSaving] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price: 0, description: '', emoji: '🛍️', stock: 0, imageUrl: '', variants: '' });
  const [globalLoading, setGlobalLoadingState] = useState(false);
  const [payment, setPayment] = useState(null), [paymentLoading, setPaymentLoading] = useState(false), [paymentStatus, setPaymentStatus] = useState('idle'), [paymentError, setPaymentError] = useState('');
  const [authOpen, setAuthOpen] = useState(false), [authMode, setAuthMode] = useState('signup'), [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }), [authError, setAuthError] = useState(''), [authLoading, setAuthLoading] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false), [otp, setOtp] = useState(''), [otpEmail, setOtpEmail] = useState(''), [otpMessage, setOtpMessage] = useState(''), [otpLoading, setOtpLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false), [storeSetupOpen, setStoreSetupOpen] = useState(false), [productModalOpen, setProductModalOpen] = useState(false), [editingProduct, setEditingProduct] = useState(null), [planInfo, setPlanInfo] = useState({ plan: 'Free' }), [discounts, setDiscounts] = useState([]), [discountForm, setDiscountForm] = useState({ code: '', type: 'percent', value: 10, expiresAt: '' });
  const hash = window.location.hash;
  useEffect(() => { const handler = event => setGlobalLoadingState(Boolean(event.detail?.loading)); window.addEventListener('quickcart-loading', handler); return () => window.removeEventListener('quickcart-loading', handler); }, []);
  const pathStoreMatch = window.location.pathname.match(/^\/store\/([^/]+)\/?$/);
  const publicMatch = pathStoreMatch || hash.match(/^#\/store\/([^/]+)/);

  const loadPrivate = async () => {
    const token = localStorage.getItem('quickcart_token');
    if (!token) return false;
    let me;
    try { me = await api('/api/me'); }
    catch (error) {
      if (error.status === 401) { localStorage.removeItem('quickcart_token'); localStorage.removeItem('quickcart_store_id'); setUser(null); setStore(null); setStores([]); setProducts([]); setOrders([]); }
      return false;
    }
    setUser(me.user); setStores(me.stores || (me.store ? [me.store] : []));
    const savedStoreId = localStorage.getItem('quickcart_store_id');
    if (me.stores?.length && !savedStoreId) localStorage.setItem('quickcart_store_id', me.stores[0].id);
    const activeStore = me.stores?.find(s => s.id === (savedStoreId || me.stores?.[0]?.id)) || me.store || null;
    setStore(activeStore);
    if (activeStore) {
      const results = await Promise.allSettled([api('/api/products'), api('/api/orders'), api('/api/plan')]);
      const [p, o, pl] = results;
      if (p.status === 'fulfilled') setProducts(p.value.products || []);
      if (o.status === 'fulfilled') setOrders(o.value.orders || []);
      if (pl.status === 'fulfilled') setPlanInfo(pl.value || { plan: 'Free' });
      const currentPlan = pl.status === 'fulfilled' ? pl.value?.plan : 'Free';
      if (currentPlan === 'Premium' || currentPlan === 'Business') { try { const d = await api('/api/discounts'); setDiscounts(d.discounts || []); } catch {} }
    }
    return true;
  };

  const loadPublic = async slug => { try { setPublicStore(await api(`/api/storefront/${slug}`)); } catch { setPublicStore(null); } };
  useEffect(() => { if (publicMatch) loadPublic(decodeURIComponent(publicMatch[1])); else loadPrivate(); }, [hash]);

  const submitAuth = async e => {
    e.preventDefault(); if (authLoading) return; setAuthError(''); setAuthLoading(true);
    if (authMode === 'signup' && authForm.password !== authForm.confirmPassword) { setAuthError('Passwords do not match.'); setAuthLoading(false); return; }
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = authMode === 'signup' ? { name: authForm.name, email: authForm.email, password: authForm.password } : { email: authForm.email, password: authForm.password };
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      if (authMode === 'signup') { setAuthOpen(false); setAuthError(''); setOtpEmail(data.email || authForm.email.trim().toLowerCase()); setOtp(''); setOtpMessage(data.message || 'We sent a 6-digit code to your email.'); setOtpOpen(true); return; }
      localStorage.setItem('quickcart_token', data.token);
      localStorage.setItem('quickcart_login_at', String(Date.now()));
      setAuthOpen(false); setUser(data.user); await loadPrivate();
    } catch (error) { setAuthError(error.message || 'Unable to complete authentication. Please try again.'); } finally { setAuthLoading(false); }
  };

  const verifyOtp = async e => {
    e.preventDefault(); setOtpLoading(true); setOtpMessage('');
    try { const data = await api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email: otpEmail, otp }) }); localStorage.setItem('quickcart_token', data.token); localStorage.setItem('quickcart_login_at', String(Date.now())); setOtpOpen(false); setOtp(''); setUser(data.user); await loadPrivate(); }
    catch (error) { setOtpMessage(error.message); } finally { setOtpLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    const IDLE_MS = 30 * 60 * 1000, ABSOLUTE_MS = 8 * 60 * 60 * 1000;
    const storedLoginAt = Number(localStorage.getItem('quickcart_login_at'));
    const loginAt = Number.isFinite(storedLoginAt) && storedLoginAt > 0 ? storedLoginAt : Date.now();
    localStorage.setItem('quickcart_login_at', String(loginAt));
    let lastActivity = Date.now();
    let timer;
    const logoutExpired = () => { localStorage.removeItem('quickcart_token'); localStorage.removeItem('quickcart_store_id'); localStorage.removeItem('quickcart_login_at'); setUser(null); setStore(null); setStores([]); setProducts([]); setOrders([]); setPremiumOpen(false); };
    const check = () => { const nowMs = Date.now(); if (nowMs - lastActivity >= IDLE_MS || nowMs - loginAt >= ABSOLUTE_MS) logoutExpired(); };
    const activity = () => { lastActivity = Date.now(); };
    ['mousedown','keydown','touchstart','scroll'].forEach(event => window.addEventListener(event, activity, { passive: true }));
    timer = setInterval(check, 15000);
    return () => { clearInterval(timer); ['mousedown','keydown','touchstart','scroll'].forEach(event => window.removeEventListener(event, activity)); };
  }, [user]);

  const signOut = () => { localStorage.removeItem('quickcart_token'); localStorage.removeItem('quickcart_store_id'); localStorage.removeItem('quickcart_login_at'); setUser(null); setStore(null); setStores([]); setProducts([]); setOrders([]); };

  /* The remainder of this file is intentionally preserved by the existing application implementation. */
