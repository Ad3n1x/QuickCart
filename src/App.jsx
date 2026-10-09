
import React,{useEffect,useMemo,useRef,useState} from "react";
import { api } from "./lib/api.js";
import {BarChart3,Check,ChevronDown,ChevronLeft,Copy,Crown,Download,Edit3,ExternalLink,Eye,EyeOff,FileText,LogIn,LogOut,Menu,MessageCircle,Package,Plus,Save,Search,Settings,Share2,ShoppingBag,Store,Tag,Trash2,TrendingUp,Truck,Upload,UserRound,Users,X,Image as ImageIcon} from "lucide-react";

// Production API is supplied by Vercel; the fallback keeps local/GitHub-hosted builds working.
const BASE=(import.meta.env.BASE_URL||"/").replace(/\/$/,"");
const fmt=n=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(n)||0);
const PHONE_COUNTRIES=[
  ["NG","Nigeria","+234"],["GH","Ghana","+233"],["KE","Kenya","+254"],["ZA","South Africa","+27"],["US","United States","+1"],["CA","Canada","+1"],["GB","United Kingdom","+44"],["AE","UAE","+971"],["IN","India","+91"],["DE","Germany","+49"],["FR","France","+33"],["AU","Australia","+61"]
];
function splitPhone(value){
  const raw=String(value||"").trim();
  const match=PHONE_COUNTRIES.find(([,label,code])=>raw.startsWith(code));
  if(match)return {code:match[2],number:raw.slice(match[2].length).replace(/\D/g,"")};
  if(raw.startsWith("0"))return {code:"+234",number:raw.slice(1).replace(/\D/g,"")};
  return {code:"+234",number:raw.replace(/\D/g,"")};
}
function joinPhone(code,number){
  return String(code||"+234")+String(number||"").replace(/\D/g,"").replace(/^0+/,"");
}
function PhoneField({label="Phone",value,onChange,required=false}){
  const initial=splitPhone(value),[code,setCode]=useState(initial.code),[number,setNumber]=useState(initial.number);
  useEffect(()=>{const next=splitPhone(value);setCode(next.code);setNumber(next.number)},[value]);
  const update=(nextCode,nextNumber)=>{setCode(nextCode);setNumber(nextNumber);onChange?.(joinPhone(nextCode,nextNumber));};
  return <div className="phone-field"><span>{label}</span><div className="phone-input"><select aria-label="Country code" value={code} onChange={e=>update(e.target.value,number)}>{PHONE_COUNTRIES.map(([iso,name,c])=><option key={iso} value={c}>{iso} {c} · {name}</option>)}</select><input type="tel" inputMode="tel" autoComplete="tel" required={required} value={number} onChange={e=>update(code,e.target.value)} placeholder="8012345678"/></div></div>
}
function escapePrintHtml(value){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
function printReceiptDocument(order,store){
  if(!order)return;
  const popup=window.open("","_blank","width=520,height=760");
  if(!popup){window.alert("Please allow pop-ups to print the receipt.");return}
  const items=Array.isArray(order.items)?order.items:[];
  const rows=items.map(x=>`<div class="row"><span>${escapePrintHtml(x.quantity||1)}× ${escapePrintHtml(x.name||"Item")}</span><b>${escapePrintHtml(fmt(Number(x.price||0)*Number(x.quantity||1)))}</b></div>`).join("");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapePrintHtml(String(order.id||"").slice(0,12))}</title><style>
  @page{size:auto;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#15221c;font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.receipt{width:80mm;max-width:100%;margin:0 auto}.brand{display:flex;gap:9px;align-items:center;padding-bottom:12px;border-bottom:1px dashed #999}.brand strong,.brand small{display:block}.brand small{color:#68736e;font-size:10px;margin-top:2px}.meta,.customer{display:grid;gap:4px;padding:11px 0;border-bottom:1px dashed #999;font-size:10px}.meta{display:flex;justify-content:space-between;gap:8px}.customer strong{font-size:11px}.row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;font-size:10px}.total{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #15221c;font-size:14px}.foot{text-align:center;padding-top:10px;border-top:1px dashed #999;color:#68736e;font-size:9px;line-height:1.5}
  </style></head><body><main class="receipt"><div class="brand"><div><strong>${escapePrintHtml(store?.storeName||"QuickCart Store")}</strong><small>${escapePrintHtml(store?.tagline||"Thank you for your order")}</small></div></div><div class="meta"><span>Receipt #${escapePrintHtml(String(order.id||"").slice(0,12))}</span><span>${escapePrintHtml(order.createdAt?new Date(order.createdAt).toLocaleString():"—")}</span></div><div class="customer"><strong>${escapePrintHtml(order.customerName||"Customer")}</strong><span>${escapePrintHtml(order.customerPhone||"")}</span><span>${escapePrintHtml(order.address||"—")}</span></div><div>${rows}</div><div class="total"><span>Total</span><b>${escapePrintHtml(fmt(order.total))}</b></div><div class="foot">Payment: ${escapePrintHtml(String(order.paymentMethod||"Pay on delivery").replaceAll("_"," "))}<br>Status: ${escapePrintHtml(order.status||"new")}<br><br>Powered by QuickCart</div></main><script>window.addEventListener("load",()=>{setTimeout(()=>{window.focus();window.print()},120)});window.addEventListener("afterprint",()=>window.close());<\/script></body></html>`;
  popup.document.open();popup.document.write(html);popup.document.close();
}
const slugify=v=>String(v||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48);
const emailOf=v=>String(v||"").trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g,"");
const routes={overview:"dashboard",dashboard:"dashboard",products:"products",orders:"orders",customers:"customers",analytics:"analytics",discounts:"discounts",receipts:"receipts",settings:"settings",premium:"premium"};

function cleanPath(){const raw=window.location.pathname||"/";return BASE&&raw.startsWith(BASE)?raw.slice(BASE.length)||"/":raw}
function getRoute(){const p=cleanPath();let m=p.match(/^\/store\/([^/]+)\/auth\/(login|signup)\/?$/);if(m)return{type:"store-auth",slug:decodeURIComponent(m[1]),mode:m[2]};m=p.match(/^\/store\/([^/]+)\/?$/);if(m)return{type:"store",slug:decodeURIComponent(m[1])};m=p.match(/^\/auth\/(login|signup)\/?$/);if(m)return{type:"auth",mode:m[1]};m=p.match(/^\/app(?:\/([^/]+))?\/?$/);if(m)return{type:"app",view:routes[m[1]||"overview"]||"dashboard"};return{type:"landing"}}
function go(path,replace=false){const url=(BASE||"")+path;(replace?history.replaceState:history.pushState).call(history,{}, "",url);dispatchEvent(new PopStateEvent("popstate"))}
function body(v){return JSON.stringify(v)}
function useRoute(){const[r,setR]=useState(getRoute());useEffect(()=>{const f=()=>setR(getRoute());addEventListener("popstate",f);return()=>removeEventListener("popstate",f)},[]);return r}

function Logo({size=36}){return <span className="qc-logo" style={{width:size,height:size}} aria-label="QuickCart" role="img"><ShoppingBag size={Math.round(size*.56)}/></span>}
function Field({label,...p}){return <label className="qc-field"><span>{label}</span><input {...p}/></label>}
function Password({value,onChange,label="Password"}){const[s,setS]=useState(false);return <label className="qc-field"><span>{label}</span><div className="qc-password"><input type={s?"text":"password"} value={value} onChange={e=>onChange(e.target.value)} autoComplete="current-password"/><button type="button" onClick={()=>setS(v=>!v)} aria-label={s?"Hide password":"Show password"}>{s?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
function Loading({label="Loading QuickCart…"}){return <div className="qc-loading"><span className="qc-spinner"/>{label}</div>}
function Empty({title,text,action}){return <div className="qc-empty"><Package size={25}/><h3>{title}</h3><p>{text}</p>{action}</div>}
function Notice({value,onClose}){if(!value)return null;return <div className="qc-notice" role="status"><div><strong>{value.title}</strong><span>{value.message}</span></div><button type="button" onClick={onClose}><X size={16}/></button></div>}
function Modal({title,subtitle,onClose,children,wide=false,className=""}){useEffect(()=>{const f=e=>e.key==="Escape"&&onClose?.();addEventListener("keydown",f);const old=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{removeEventListener("keydown",f);document.body.style.overflow=old}},[onClose]);return <div className="qc-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}><section className={"qc-modal"+(wide?" wide":"")+(className?" "+className:"")} role="dialog" aria-modal="true" aria-label={title}><header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={18}/></button></header><div className="qc-modal-body">{children}</div></section></div>}

function Landing({onAuth,canInstall,onInstall}){
 const scroll=id=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
 useEffect(()=>{try{history.scrollRestoration="manual";const y=Number(sessionStorage.getItem("qc_landing_y")||0);if(y)requestAnimationFrame(()=>scrollTo(0,y))}catch{};const save=()=>{try{sessionStorage.setItem("qc_landing_y",String(Math.round(window.scrollY)))}catch{}};addEventListener("pagehide",save);addEventListener("beforeunload",save);return()=>{removeEventListener("pagehide",save);removeEventListener("beforeunload",save)}},[]);
 return <main className="landing-redesign">
  <nav className="landing-redesign-nav"><button className="landing-brand" onClick={()=>scrollTo({top:0,behavior:"smooth"})}><Logo size={36}/><span>QuickCart</span><span className="dev-brand"><span>by</span> AD3N1X</span></button><div className="landing-nav-links"><button onClick={()=>scroll("features")}>Features</button><button onClick={()=>scroll("how")}>How it works</button><button onClick={()=>scroll("faq")}>FAQ</button></div><div className="landing-nav-actions"><button className="ghost-button" onClick={()=>onAuth("login")}>Sign in</button><button className="primary-button" onClick={()=>onAuth("signup")}>Get started</button></div></nav>
  <section className="landing-hero"><div className="landing-copy"><span className="eyebrow">SOCIAL COMMERCE, SIMPLIFIED</span><h1>Turn your WhatsApp audience into a real storefront.</h1><p>Build a mobile-first store, manage products and orders, and send checkout straight to WhatsApp.</p><div className="landing-actions"><button className="primary-button big" onClick={()=>onAuth("signup")}>Create my store <ChevronLeft size={17} style={{transform:"rotate(180deg)"}}/></button><button className="ghost-button big" onClick={()=>scroll("features")}>Explore features</button></div>{canInstall&&<button className="landing-install" onClick={onInstall}><Download size={16}/> Install QuickCart</button>}<div className="landing-proof"><span><Check size={14}/> Mobile-first</span><span><Check size={14}/> WhatsApp checkout</span><span><Check size={14}/> Free to start</span></div></div><div className="landing-preview"><div className="preview-window"><div className="preview-bar"><i/><i/><i/></div><div className="preview-shell"><aside><div className="preview-brand"><Logo size={29}/><strong>QuickCart</strong></div>{["Overview","Products","Orders","Analytics"].map(x=><span key={x} className={x==="Overview"?"active":""}>{x}</span>)}</aside><div className="preview-main"><span className="eyebrow">STORE DASHBOARD</span><h3>Good to see you.</h3><p>Manage your storefront and turn social traffic into orders.</p><div className="preview-stats"><div><small>Revenue</small><strong>₦128,500</strong></div><div><small>Orders</small><strong>42</strong></div><div><small>Products</small><strong>18</strong></div></div><div className="preview-order"><b>Recent orders</b><span>View all</span><div><strong>Amaka</strong><span>₦18,000</span></div><div><strong>David</strong><span>₦24,500</span></div></div></div></div></div></div></section>
  <section className="landing-section" id="features"><div className="section-heading"><span className="eyebrow">BUILT FOR SELLERS</span><h2>Everything you need to sell simply.</h2><p>One workspace from product listing to customer handoff.</p></div><div className="feature-grid">{[["Storefronts","Create a branded store and share one memorable link.",Store],["Products","Manage price, stock, variants and images.",Package],["Orders","Track orders from new to delivered.",ShoppingBag],["Analytics","See revenue, orders and product performance.",TrendingUp],["Discounts","Create promotional codes on eligible plans.",Tag],["Settings","Control branding, theme, delivery and payment details.",Settings]].map(([t,d,I])=><article key={t}><div className="feature-icon"><I size={18}/></div><h3>{t}</h3><p>{d}</p></article>)}</div></section>
  <section className="landing-section" id="how"><div className="section-heading"><span className="eyebrow">HOW IT WORKS</span><h2>From idea to checkout in three steps.</h2></div><div className="steps-grid">{[["01","Create your account","Sign up and verify your email."],["02","Add your products","Set prices, stock and details."],["03","Share and sell","Send your store link to customers."]].map(([n,t,d])=><article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}</div></section>
  <section className="landing-cta"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Give your social audience somewhere better to buy.</h2></div><button className="primary-button big" onClick={()=>onAuth("signup")}>Start selling</button></section>
  <section className="landing-section" id="faq"><div className="section-heading"><span className="eyebrow">FAQ</span><h2>Common questions.</h2></div><div className="faq-grid">{[["Do I need a website?","No. QuickCart gives you a shareable storefront."],["Can I edit products later?","Yes. Add, edit, delete, activate and restock products."],["Does it work on mobile?","Yes. The dashboard and storefront are mobile-first."],["Can I use dark mode?","Yes. Store settings include light, dark and high-contrast modes."],["How does checkout work?","Customers create an order and continue directly to WhatsApp."]].map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
  <footer className="landing-footer"><span><Logo size={30}/> QuickCart</span><small>Simple commerce for businesses that already have an audience.</small><small className="dev-credit">Designed &amp; developed by <strong>AD3N1X</strong></small></footer>
 </main>
}

function Auth({mode,onMode,onSubmit,form,setForm,error,loading}){
 const signup=mode==="signup";
 return <main className="auth-page"><div className="auth-shell"><section className="auth-card"><div className="auth-brand"><Logo size={42}/><div><span className="eyebrow">QUICKCART</span><h1>{signup?"Create your account":"Welcome back"}</h1><p>{signup?"Build your store and start sharing your link.":"Sign in to manage your store."}</p></div></div><div className="auth-tabs"><button className={signup?"active":""} onClick={()=>onMode("signup")}>Sign up</button><button className={!signup?"active":""} onClick={()=>onMode("login")}>Sign in</button></div><form className="stack" onSubmit={onSubmit}>{signup&&<Field label="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name" placeholder="Your full name"/>}<Field label="Email address" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" placeholder="you@example.com"/><Password value={form.password} onChange={v=>setForm({...form,password:v})}/>{signup&&<Password label="Confirm password" value={form.confirmPassword} onChange={v=>setForm({...form,confirmPassword:v})}/>} {error&&<div className="form-error">{error}</div>}<button className="primary-button big full" disabled={loading}>{loading?"Working…":signup?"Create account":"Sign in"} <LogIn size={17}/></button></form><p className="auth-switch">{signup?"Already have an account?":"New to QuickCart?"} <button onClick={()=>onMode(signup?"login":"signup")}>{signup?"Sign in":"Create one"}</button></p></section></div></main>
}

function CustomerAuth({mode,slug,onMode,onSuccess}){
 const signup=mode==="signup",[form,setForm]=useState({name:"",email:"",password:"",confirmPassword:""}),[error,setError]=useState(""),[loading,setLoading]=useState(false),[otpOpen,setOtpOpen]=useState(false),[otp,setOtp]=useState(""),[otpError,setOtpError]=useState(""),[otpMessage,setOtpMessage]=useState(""),[otpLoading,setOtpLoading]=useState(false),[cooldown,setCooldown]=useState(0);
 useEffect(()=>{if(cooldown<=0)return;const t=setInterval(()=>setCooldown(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t)},[cooldown]);
 const submit=async e=>{e.preventDefault();if(loading)return;setError("");const email=emailOf(form.email),password=String(form.password||"");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setError("Enter a valid email address.");if(!password)return setError("Enter your password.");if(signup){if(!form.name.trim())return setError("Enter your name.");if(password.length<6)return setError("Password must be at least 6 characters.");if(password!==form.confirmPassword)return setError("Passwords do not match.")}setLoading(true);try{const d=await api(signup?"/api/customer/auth/signup":"/api/customer/auth/login",{method:"POST",body:body(signup?{name:form.name.trim(),email,password}:{email,password})});if(signup){setOtpMessage(d.message||"Enter the 6-digit code sent to your email.");setOtpError("");setOtp("");setOtpOpen(true)}else{localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");localStorage.setItem("quickcart_customer_token",d.token);localStorage.setItem("quickcart_customer",JSON.stringify(d.customer));onSuccess?.(d.customer)}}catch(e){if(e.code==="CUSTOMER_EMAIL_NOT_VERIFIED"){setOtpMessage("Your email needs verification.");setOtpError("");setOtpOpen(true)}else setError(e.message||"Unable to continue.")}finally{setLoading(false)}};
 const verify=async e=>{e.preventDefault();setOtpLoading(true);setOtpError("");try{const d=await api("/api/customer/auth/verify-otp",{method:"POST",body:body({email:emailOf(form.email),otp})});localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");localStorage.setItem("quickcart_customer_token",d.token);localStorage.setItem("quickcart_customer",JSON.stringify(d.customer));setOtpOpen(false);onSuccess?.(d.customer)}catch(e){setOtpError(e.message||"Invalid code.")}finally{setOtpLoading(false)}};
 const resend=async()=>{if(otpLoading||cooldown)return;setOtpLoading(true);setOtpError("");try{const d=await api("/api/customer/auth/resend-otp",{method:"POST",body:body({email:emailOf(form.email)})});setOtpMessage(d.message||"A new code has been sent.");setCooldown(Number(d.cooldownSeconds)||60)}catch(e){setOtpError(e.message||"Could not resend code.")}finally{setOtpLoading(false)}};
 return <main className="customer-auth-page"><div className="customer-auth-shell"><button className="customer-auth-back" type="button" onClick={()=>go("/store/"+encodeURIComponent(slug))}><ChevronLeft size={16}/> Back to store</button><section className="customer-auth-card"><div className="customer-auth-brand"><Logo size={46}/><div><span className="eyebrow">CUSTOMER ACCOUNT</span><h1>{signup?"Create your account":"Welcome back"}</h1><p>{signup?"Save your details, track orders and checkout faster.":"Sign in to continue shopping and track your orders."}</p></div></div><div className="auth-tabs"><button type="button" className={signup?"active":""} onClick={()=>onMode("signup")}>Create account</button><button type="button" className={!signup?"active":""} onClick={()=>onMode("login")}>Sign in</button></div><form className="stack" onSubmit={submit}>{signup&&<Field label="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name" placeholder="Your full name"/>}<Field label="Email address" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" placeholder="you@example.com"/><Password value={form.password} onChange={v=>setForm({...form,password:v})}/>{signup&&<Password label="Confirm password" value={form.confirmPassword} onChange={v=>setForm({...form,confirmPassword:v})}/>} {error&&<div className="form-error">{error}</div>}<button className="primary-button big full" disabled={loading}>{loading?"Please wait…":signup?"Create customer account":"Sign in"} <LogIn size={17}/></button></form><p className="auth-switch">{signup?"Already have an account?":"New here?"} <button type="button" onClick={()=>onMode(signup?"login":"signup")}>{signup?"Sign in":"Create an account"}</button></p><small className="customer-auth-note">Customer accounts are separate from seller accounts.</small></section></div>{otpOpen&&<Modal title="Verify your email" subtitle={"Enter the 6-digit code sent to "+form.email} onClose={()=>setOtpOpen(false)}><form className="stack" onSubmit={verify}><Field label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}/>{otpMessage&&<div className="form-success">{otpMessage}</div>}{otpError&&<div className="form-error">{otpError}</div>}<button className="primary-button big" disabled={otpLoading||otp.length!==6}>{otpLoading?"Verifying…":"Verify email"} <Check size={16}/></button><button type="button" className="ghost-button" disabled={otpLoading||cooldown>0} onClick={resend}>{cooldown?"Resend in "+cooldown+"s":"Resend code"}</button></form></Modal>}</main>
}

function ReceiptScanner(){
 const[file,setFile]=useState(null),[source,setSource]=useState("upload"),[preview,setPreview]=useState(""),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false);
 const [receipt,setReceipt]=useState({merchant:"",receiptNo:"",date:"",total:""});
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const chooseFile=e=>{const next=e.target.files?.[0];if(!next)return;setFile(next);setSaved(false);setPreview(URL.createObjectURL(next))};
 const saveReceipt=async()=>{setSaving(true);setSaved(false);try{const key="quickcart_saved_receipts";const current=JSON.parse(localStorage.getItem(key)||"[]");current.unshift({...receipt,source,fileName:file?.name||"",savedAt:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(current.slice(0,100)));setSaved(true)}catch{}finally{setSaving(false)}};
 return <div className="receipts-page"><div className="page-head"><div><span className="eyebrow">RECEIPTS</span><h1>Receipt Scanner</h1><p>Upload a receipt image for quick review, or enter a physical receipt manually. Your receipt records stay on this device until you connect them to a store workflow.</p></div></div><section className="receipt-scanner-grid"><div className="panel receipt-scanner-panel"><div className="segmented receipt-source-tabs"><button className={source==="upload"?"active":""} onClick={()=>setSource("upload")}>Upload Receipt</button><button className={source==="physical"?"active":""} onClick={()=>setSource("physical")}>Physical Receipt</button></div>{source==="upload"?<><label className="receipt-upload-zone"><input type="file" accept="image/*" onChange={chooseFile}/><Upload size={28}/><strong>{file?file.name:"Choose Receipt Image"}</strong><span>JPG, PNG, WEBP or a clear photo of the receipt.</span></label>{preview&&<div className="receipt-preview"><img src={preview} alt="Receipt preview"/></div>}</>:<div className="receipt-physical-note"><FileText size={28}/><strong>Enter A Physical Receipt</strong><span>Use the fields below to record the details from a paper receipt.</span></div>}</div><div className="panel receipt-details-panel"><div className="panel-head"><div><span className="eyebrow">RECEIPT DETAILS</span><h2>Review And Save</h2></div></div><div className="receipt-detail-fields"><Field label="Merchant" value={receipt.merchant} onChange={e=>setReceipt({...receipt,merchant:e.target.value})} placeholder="Merchant name"/><Field label="Receipt Number" value={receipt.receiptNo} onChange={e=>setReceipt({...receipt,receiptNo:e.target.value})} placeholder="Receipt number"/><Field label="Date" type="date" value={receipt.date} onChange={e=>setReceipt({...receipt,date:e.target.value})}/><Field label="Total" inputMode="decimal" value={receipt.total} onChange={e=>setReceipt({...receipt,total:e.target.value})} placeholder="0.00"/></div><div className="receipt-scanner-actions"><button className="primary-button" type="button" disabled={saving||(!file&&source==="upload")} onClick={saveReceipt}>{saving?"Saving…":saved?"Receipt Saved":"Save Receipt"}<Save size={16}/></button>{saved&&<span className="form-success">Saved On This Device</span>}</div><p className="muted receipt-scanner-foot">For the most reliable result, take a clear, well-lit photo with the full receipt visible.</p></div></section></div>}

function DashboardShell({user,store,stores,view,plan,onSignOut,onSelectStore,onNewStore,children}){
 const[mobile,setMobile]=useState(false),[storeMenu,setStoreMenu]=useState(false),storeSwitchRef=useRef(null);
 useEffect(()=>{if(!mobile)return;const oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";const close=e=>{if(e.key==="Escape")setMobile(false)};addEventListener("keydown",close);return()=>{document.body.style.overflow=oldOverflow;removeEventListener("keydown",close)}},[mobile]);
 useEffect(()=>{if(!storeMenu)return;const close=e=>{if(storeSwitchRef.current&&!storeSwitchRef.current.contains(e.target))setStoreMenu(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[storeMenu]);
 const items=[["Workspace",[["dashboard","Overview",BarChart3],["products","Products",Package],["orders","Orders",ShoppingBag],["receipts","Receipts",FileText],["customers","Customers",Users]]],["Insights",[["analytics","Analytics",TrendingUp],["discounts","Discounts",Tag]]],["Account",[["settings","Store settings",Settings],["premium","Plans",Crown]]]];
 return <div className="app-shell"><header className="app-topbar"><div className="topbar-inner"><button className="menu-button" onClick={()=>setMobile(true)} aria-label="Open menu"><Menu size={20}/></button><button className="dashboard-brand" onClick={()=>go("/app/overview")}><Logo size={34}/><span>QuickCart</span><small className="dev-mark">AD3N1X</small></button><Account user={user} onSignOut={onSignOut}/></div></header>{mobile&&<button className="mobile-nav-backdrop" onClick={()=>setMobile(false)} aria-label="Close menu"/>}<aside className={"app-sidebar"+(mobile?" open":"")}><div className="sidebar-top"><button type="button" className="sidebar-close" onClick={()=>setMobile(false)} aria-label="Close Sidebar" title="Close Sidebar"><X size={19}/></button><div className="store-switch" ref={storeSwitchRef}><button onClick={()=>setStoreMenu(v=>!v)}><span><Store size={16}/></span><b>{store.storeName}</b><small>/{store.slug}</small><ChevronDown size={15}/></button>{storeMenu&&<div className="store-switch-menu">{stores.map(s=><button key={s.id} className={s.id===store.id?"active":""} onClick={()=>{onSelectStore(s.id);setStoreMenu(false);setMobile(false)}}><Store size={14}/>{s.storeName}</button>)}<button onClick={()=>{setStoreMenu(false);onNewStore()}}><Plus size={14}/> New store</button></div>}</div></div><nav className="app-nav">{items.map(([section,list])=><div key={section}><span>{section}</span>{list.map(([id,label,I])=><button key={id} className={view===id?"active":""} onClick={()=>{go("/app/"+(id==="dashboard"?"overview":id));setMobile(false)}}><I size={17}/><em>{label}</em>{id==="premium"&&plan!=="Free"&&<small>{plan}</small>}</button>)}</div>)}</nav></aside><main className="app-content"><div className="content-inner">{children}</div></main></div>
}
function Account({user,onSignOut}){const[open,setOpen]=useState(false),[avatar,setAvatar]=useState(()=>{try{return localStorage.getItem("quickcart_profile_pic:"+emailOf(user?.email))||""}catch{return""}}),accountRef=useRef(null);useEffect(()=>{if(!open)return;const close=e=>{if(accountRef.current&&!accountRef.current.contains(e.target))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open]);const changeAvatar=async e=>{try{const file=e.target.files?.[0];if(!file)return;const data=await imageData(file);setAvatar(data);localStorage.setItem("quickcart_profile_pic:"+emailOf(user?.email),data)}catch(err){alert(err.message||"Could not update profile picture.")}finally{e.target.value=""}};return <div className="account-wrap" ref={accountRef}><button className="account-button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><span className="account-avatar">{avatar?<img src={avatar} alt="Profile"/>:<UserRound size={15}/>}</span><b>Account</b><ChevronDown size={14}/></button>{open&&<div className="account-menu"><div className="account-menu-head"><div className="account-profile"><span className="account-avatar account-avatar-large">{avatar?<img src={avatar} alt="Profile"/>:<UserRound size={18}/>}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div><button type="button" className="account-close" onClick={()=>setOpen(false)} aria-label="Close account menu"><X size={16}/></button></div><label className="profile-upload"><input type="file" accept="image/*" onChange={changeAvatar}/><Upload size={14}/><span>{avatar?"Change profile picture":"Add profile picture"}</span></label><button onClick={()=>{go("/app/settings");setOpen(false)}}><Settings size={15}/> Store settings</button><button onClick={()=>{go("/app/premium");setOpen(false)}}><Crown size={15}/> Plans</button><button onClick={()=>{setOpen(false);onSignOut()}}><LogOut size={15}/> Sign out</button></div>}</div>}

function StoreSetup({loading,onCreate,onClose}){
 const[n,setN]=useState("My Store"),[s,setS]=useState("");
 return <Modal title="Create your store" subtitle="You can edit the details later." onClose={onClose}><form className="stack" onSubmit={e=>{e.preventDefault();onCreate(n,s||n)}}><Field label="Store name" value={n} onChange={e=>setN(e.target.value)} placeholder="My Store"/><Field label="Store URL slug" value={s} onChange={e=>setS(slugify(e.target.value))} placeholder="my-store"/><div className="form-note">Store URL: <strong>/store/{slugify(s||n)||"my-store"}</strong></div><button className="primary-button big full" disabled={loading||!n.trim()}>{loading?"Creating…":"Create store"} <Store size={17}/></button></form></Modal>
}

async function imageData(file){
 if(!file)return "";
 if(!String(file.type).startsWith("image/"))throw new Error("Please choose an image file.");
 return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.78))};img.onerror=()=>reject(new Error("Could not read the image."));img.src=String(r.result||"")};r.onerror=()=>reject(new Error("Could not read the image."));r.readAsDataURL(file)})
}

function ProductModal({product,onClose,onSave,busy}){
 const[f,setF]=useState({name:product?.name||"",price:product?.price??"",description:product?.description||"",emoji:product?.emoji||"🛍️",stock:product?.stock??"",imageUrl:product?.imageUrl||"",variants:Array.isArray(product?.variants)?product.variants.join(", "):product?.variants||"",active:product?.active!==false}),[err,setErr]=useState("");
 const save=async e=>{e.preventDefault();setErr("");if(!f.name.trim())return setErr("Enter a product name.");try{await onSave({...f,name:f.name.trim(),price:Number(f.price)||0,stock:Math.max(0,Number(f.stock)||0),variants:String(f.variants).split(",").map(x=>x.trim()).filter(Boolean)})}catch(x){setErr(x.message||"Could not save product.")}};
 return <Modal className="product-modal" title={product?"Edit product":"Add product"} subtitle={product?"Update your product details.":"Add a product customers can find in your store."} onClose={onClose}><form className="product-form" onSubmit={save}>
  <div className="product-form-section"><div className="product-section-heading"><span className="product-section-icon"><Package size={16}/></span><div><strong>Product details</strong><small>Name, price and stock</small></div></div><div className="form-grid-2"><Field label="Product name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="e.g. Classic Sneakers"/><Field label="Price (NGN)" type="number" min="0" value={f.price} onChange={e=>setF({...f,price:e.target.value})} placeholder="0"/><Field label="Stock" type="number" min="0" value={f.stock} onChange={e=>setF({...f,stock:e.target.value})} placeholder="0"/><Field label="Emoji" value={f.emoji} onChange={e=>setF({...f,emoji:e.target.value.slice(0,4)})} placeholder="🛍️"/></div></div>
  <div className="product-form-section"><div className="product-section-heading"><span className="product-section-icon"><Edit3 size={16}/></span><div><strong>Description & options</strong><small>Help customers understand the product</small></div></div><label className="qc-field"><span>Description</span><textarea value={f.description} rows="3" onChange={e=>setF({...f,description:e.target.value})} placeholder="Describe the product briefly…"/></label><Field label="Variants" value={f.variants} onChange={e=>setF({...f,variants:e.target.value})} placeholder="Small, Medium, Large"/></div>
  <div className="product-form-section"><div className="product-section-heading"><span className="product-section-icon"><Upload size={16}/></span><div><strong>Product image</strong><small>Use a clear image customers can recognize</small></div></div><label className="product-upload"><input type="file" accept="image/*" onChange={async e=>{try{setF({...f,imageUrl:await imageData(e.target.files?.[0])})}catch(x){setErr(x.message)}}}/><span className="product-upload-content"><span className="product-upload-icon"><Upload size={18}/></span><b>{f.imageUrl?"Replace image":"Browse file"}</b><small>{f.imageUrl?"Choose another product image":"JPG, PNG or other image files"}</small></span></label>{f.imageUrl&&<div className="product-image-preview-wrap"><img className="product-image-preview" src={f.imageUrl} alt="Product preview"/><span>Image preview</span></div>}</div>
  <label className="product-visibility"><span><span className="check-row"><input type="checkbox" checked={f.active} onChange={e=>setF({...f,active:e.target.checked})}/><b>Show on storefront</b></span><small>Customers can see and order this product.</small></span></label>
  {err&&<div className="form-error">{err}</div>}
  <div className="modal-actions product-modal-actions"><button className="ghost-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Saving…":"Save product"} <Save size={16}/></button></div>
 </form></Modal>
}
function FeaturePromo({icon:Icon,title,text,button="Explore plans"}){return <section className="feature-promo"><div className="feature-promo-icon"><Icon size={18}/></div><div className="feature-promo-copy"><span className="eyebrow">QUICKCART FEATURE</span><h3>{title}</h3><p>{text}</p></div><button className="ghost-button" onClick={()=>go("/app/premium")}>{button}<Crown size={15}/></button></section>}

function Overview({user,store,products,orders,onAdd,onShare,onStore,onAnalytics}){
 const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0),pending=orders.filter(o=>["new","confirmed","processing"].includes(o.status)).length;
 return <div><div className="page-head"><div><span className="eyebrow">STORE DASHBOARD</span><h1>Good to see you, {user.name||"seller"}.</h1><p>Manage your storefront and turn social traffic into orders.</p></div></div><div className="quick-action-grid"><button onClick={onAdd}><Plus size={17}/><span>Add product</span></button><button onClick={onStore}><ExternalLink size={17}/><span>View store</span></button><button onClick={onShare}><Share2 size={17}/><span>Share store</span></button><button onClick={onAnalytics}><TrendingUp size={17}/><span>Analytics</span></button></div><div className="stats-grid"><div><small>Revenue</small><strong>{fmt(revenue)}</strong><span>Recorded orders</span></div><div><small>Orders</small><strong>{orders.length}</strong><span>All statuses</span></div><div><small>Pending</small><strong>{pending}</strong><span>Needs attention</span></div><div><small>Products</small><strong>{products.length}</strong><span>Catalog items</span></div></div><div className="dashboard-grid-2"><section className="panel"><div className="panel-head"><div><span className="eyebrow">STORE</span><h2>{store.storeName}</h2></div><span className="live-dot"><i/>Live</span></div><p>{store.tagline||"Your storefront is ready to share."}</p><div className="store-link-card"><code>{window.location.origin+BASE}/store/{store.slug}</code><button className="ghost-button" onClick={onShare}><Copy size={15}/> Copy</button></div></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">RECENT ORDERS</span><h2>Latest activity</h2></div></div>{orders.length?<div className="mini-list">{orders.slice(0,5).map(o=><div className="mini-row" key={o.id}><span><b>{o.customerName||"Customer"}</b><small>{o.status}</small></span><strong>{fmt(o.total)}</strong></div>)}</div>:<Empty title="No orders yet" text="Your first customer order will appear here."/>}</section></div></div>
}

function Products({products,onAdd,onEdit,onDelete}){
 const[q,setQ]=useState(""),query=q.trim().toLowerCase(),list=products.filter(p=>!query||String(p.name||"").toLowerCase().includes(query));
 return <div className="products-page"><div className="page-head"><div><span className="eyebrow">CATALOG</span><h1>Products</h1><p>Manage price, stock, images and availability.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16}/> Add product</button></div><div className="toolbar"><label className="search-box" aria-label="Search products"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products" aria-label="Search products"/>{q&&<button type="button" className="search-clear" onClick={()=>setQ("")} aria-label="Clear product search"><X size={15}/></button>}</label><span className="search-count">{query?`${list.length} result${list.length===1?"":"s"}`:`${products.length} product${products.length===1?"":"s"}`}</span></div><div className="product-grid">{list.length?list.map(p=><article className="product-card-new" key={p.id}><div className="product-card-art">{p.imageUrl?<img src={p.imageUrl} alt={p.name}/>:<span>{p.emoji||"🛍️"}</span>}</div><div className="product-card-body"><div className="product-card-top"><div><h3>{p.name}</h3><p>{p.description||"No description yet."}</p></div><span className={Number(p.stock)>0?"stock-badge":"stock-badge out"}>{Number(p.stock)>0?String(p.stock)+" in stock":"Sold out"}</span></div><strong className="product-price">{fmt(p.price)}</strong>{p.variants?.length>0&&<small>Variants: {p.variants.join(", ")}</small>}<div className="product-actions"><button className="ghost-button" onClick={()=>onEdit(p)}><Edit3 size={15}/> Edit</button><button className="danger-button" onClick={()=>onDelete(p.id)}><Trash2 size={15}/> Delete</button></div></div></article>):<Empty title="No products found" text="Add your first product to start selling." />}</div><FeaturePromo icon={Crown} title="Give your catalog more power." text="Unlock premium storefront tools and richer ways to present your products." /></div>
}

function Orders({orders,onStatus,onReceipt,onDelete}){
 const[filter,setFilter]=useState("all"),[q,setQ]=useState("");
 const query=q.trim().toLowerCase();
 const statuses=["all","new","confirmed","processing","ready","shipped","delivered","cancelled"];
 const filtered=orders.filter(o=>{
   const matchesStatus=filter==="all"||o.status===filter;
   const hay=[o.customerName,o.customerPhone,o.id].map(v=>String(v||"").toLowerCase()).join(" ");
   return matchesStatus&&(!query||hay.includes(query));
 });
 const counts=Object.fromEntries(statuses.map(s=>[s,s==="all"?orders.length:orders.filter(o=>o.status===s).length]));
 const needsAttention=orders.filter(o=>["new","confirmed","processing"].includes(o.status)).length;
 const readyOrShipped=orders.filter(o=>["ready","shipped"].includes(o.status)).length;
 const completed=orders.filter(o=>["delivered","picked_up"].includes(o.status)).length;
 return <div className="orders-page">
  <div className="page-head orders-page-head"><div><span className="eyebrow">FULFILMENT</span><h1>Orders</h1><p>Review customer orders, update fulfilment status, and keep every order moving.</p></div></div>
  <section className="orders-summary">
   <div><span>All Orders</span><strong>{orders.length}</strong></div>
   <div><span>Needs Attention</span><strong>{needsAttention}</strong></div>
   <div><span>Ready / Shipped</span><strong>{readyOrShipped}</strong></div>
   <div><span>Completed</span><strong>{completed}</strong></div>
  </section>
  <section className="panel orders-toolbar">
   <div className="orders-toolbar-top">
    <label className="search-box orders-search" aria-label="Search orders"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search Customer, Phone Or Order ID…" aria-label="Search customer, phone or order ID"/>{q&&<button type="button" className="search-clear" onClick={()=>setQ("")} aria-label="Clear Order Search"><X size={15}/></button>}</label>
    <span className="search-count">{filtered.length} Shown</span>
   </div>
   <div className="segmented orders-filters">{statuses.map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}>{s==="all"?"All":s.replaceAll("_"," ")} <span>{counts[s]}</span></button>)}</div>
  </section>
  <section className="panel orders-list">
   <div className="panel-head orders-list-head"><div><span className="eyebrow">ORDER QUEUE</span><h2>{filter==="all"?"All Customer Orders":filter.replaceAll("_"," ")+" Orders"}</h2><p className="muted">Update status as you prepare, hand over, or complete each order.</p></div><span className="orders-total">{filtered.length} {filtered.length===1?"Order":"Orders"}</span></div>
   {filtered.length?<div className="orders-cards">{filtered.map(o=>{
     const itemCount=o.items?.reduce((n,i)=>n+Number(i.quantity||0),0)||0;
     const date=o.createdAt?new Date(o.createdAt).toLocaleString():"—";
     const status=String(o.status||"new").replaceAll("_"," ");
     return <article className="order-card" key={o.id}>
       <div className="order-card-main">
        <div className="order-customer"><div className="order-avatar">{String(o.customerName||"C").trim().charAt(0).toUpperCase()}</div><div><strong>{o.customerName||"Customer"}</strong><span>{o.customerEmail||"No customer email"}</span><span>{o.customerPhone||"No Phone Number"}</span></div></div>
        <div className="order-total"><small>{itemCount} Item{itemCount===1?"":"s"}</small><strong>{fmt(o.total)}</strong></div>
       </div>
       <div className="order-card-meta"><span><b>Order</b> #{String(o.id).slice(0,10)}</span><span><b>Type</b> {o.fulfillment==="pickup"?"Pickup":"Delivery"}</span><span><b>Placed</b> {date}</span><span><b>Status</b> {status}</span></div>
       <div className="order-card-actions"><label><span>Status</span><select value={o.status} onChange={e=>onStatus(o.id,e.target.value)}>{statuses.slice(1).map(s=><option key={s} value={s}>{s}</option>)}</select></label><button className="ghost-button" onClick={()=>onReceipt?.(o)}><FileText size={15}/> View Receipt</button><button className="danger-button" onClick={()=>onDelete?.(o.id)}><Trash2 size={15}/> Delete</button></div>
     </article>
   })}</div>:<Empty title={q?"No Orders Found":"No Matching Orders"} text={q?"Try Another Customer Name, Phone Number, Or Order ID.":"Orders Appear Here After Customers Check Out."}/>}
  </section>
  <FeaturePromo icon={TrendingUp} title="Turn Orders Into Better Decisions." text="Upgrade For Deeper Business Insights And A Clearer View Of Store Performance." />
 </div>
}
function Customers({orders}){const list=useMemo(()=>{const m=new Map();orders.forEach(o=>{const email=String(o.customerEmail||"").trim().toLowerCase();if(!email)return;const r=m.get(email)||{email,name:o.customerName||"Customer",phone:o.customerPhone||"",orders:0,spend:0};r.orders++;r.spend+=Number(o.total||0);if(!r.phone&&o.customerPhone)r.phone=o.customerPhone;m.set(email,r)});return [...m.values()].sort((a,b)=>b.spend-a.spend)},[orders]);return <div><div className="page-head"><div><span className="eyebrow">RELATIONSHIPS</span><h1>Customers</h1><p>Each customer record is grouped by verified email address.</p></div></div><section className="panel table-card">{list.length?<div className="table-wrap"><table><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Spend</th></tr></thead><tbody>{list.map(c=><tr key={c.email}><td><b>{c.name}</b></td><td>{c.email}</td><td>{c.phone||"—"}</td><td>{c.orders}</td><td>{fmt(c.spend)}</td></tr>)}</tbody></table></div>:<Empty title="No customers yet" text="Customers will appear as orders arrive."/>}</section><FeaturePromo icon={Users} title="Know your customers better." text="Customer history and repeat purchases are grouped by email, even if their phone number changes." /></div>}
function Analytics({orders,products,plan}){const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0),avg=orders.length?revenue/orders.length:0;const status=orders.reduce((a,o)=>(a[o.status]=(a[o.status]||0)+1,a),{});const tops={};orders.forEach(o=>(o.items||[]).forEach(i=>tops[i.name]=(tops[i.name]||0)+Number(i.quantity||0)));return <div className="analytics-page"><div className="page-head"><div><span className="eyebrow">INSIGHTS</span><h1>Analytics</h1><p>Useful numbers from your orders and catalog.</p></div></div><div className="stats-grid"><div><small>Revenue</small><strong>{fmt(revenue)}</strong></div><div><small>Average order</small><strong>{fmt(avg)}</strong></div><div><small>Products</small><strong>{products.length}</strong></div><div><small>Delivered</small><strong>{status.delivered||0}</strong></div></div><div className="dashboard-grid-2"><section className="panel"><div className="panel-head"><div><span className="eyebrow">ORDER FLOW</span><h2>Statuses</h2></div></div><div className="metric-list">{Object.entries(status).map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}{!orders.length&&<p className="muted">No orders yet.</p>}</div></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">TOP PRODUCTS</span><h2>Units sold</h2></div></div><div className="metric-list">{Object.entries(tops).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}{!Object.keys(tops).length&&<p className="muted">No product sales yet.</p>}</div></section></div>{plan==="Free"&&<section className="panel analytics-upgrade"><div><span className="eyebrow">ADVANCED ANALYTICS</span><h2>Go deeper with your store data.</h2><p>Unlock richer performance insights and advanced analytics with Premium or Business.</p></div><button className="primary-button" onClick={()=>go("/app/premium")}><Crown size={16}/> View plans</button></section>}{plan==="Premium"&&<section className="panel"><div className="panel-head"><div><span className="eyebrow">ADVANCED ANALYTICS</span><h2>Performance overview</h2></div></div><div className="stats-grid"><div><small>Average order</small><strong>{fmt(avg)}</strong></div><div><small>Delivery orders</small><strong>{orders.filter(o=>o.fulfillment==="delivery").length}</strong></div><div><small>Customers</small><strong>{new Set(orders.map(o=>o.customerPhone||o.customerEmail||o.customerName).filter(Boolean)).size}</strong></div><div><small>Completion rate</small><strong>{orders.length?Math.round((orders.filter(o=>["delivered","ready"].includes(o.status)).length/orders.length)*100):0}%</strong></div></div></section>}{plan==="Business"&&<section className="panel"><div className="panel-head"><div><span className="eyebrow">BUSINESS ANALYTICS</span><h2>Business performance</h2></div></div><div className="stats-grid"><div><small>Revenue</small><strong>{fmt(revenue)}</strong></div><div><small>Orders</small><strong>{orders.length}</strong></div><div><small>Customers</small><strong>{new Set(orders.map(o=>o.customerPhone||o.customerEmail||o.customerName).filter(Boolean)).size}</strong></div><div><small>Delivery share</small><strong>{orders.length?Math.round((orders.filter(o=>o.fulfillment==="delivery").length/orders.length)*100):0}%</strong></div></div></section>}</div>}

function SettingsPage({store,onSave,onDelete}){const presets=[["Forest","forestgreen"],["Ocean","royalblue"],["Indigo","indigo"],["Coral","coral"],["Teal","teal"],["Midnight","midnightblue"]];const[d,setD]=useState({...store});const[color,setColor]=useState(localStorage.getItem("quickcart_ui_color:"+store.id)||store.primaryColor||"#12392d");const[mode,setMode]=useState(localStorage.getItem("quickcart_theme_mode:"+store.id)||"light");const[saving,setSaving]=useState(false);const setM=v=>{setMode(v);localStorage.setItem("quickcart_theme_mode:"+store.id,v);dispatchEvent(new Event("qc-theme"))};const setC=v=>{setColor(v);localStorage.setItem("quickcart_ui_color:"+store.id,v);dispatchEvent(new Event("qc-theme"))};return <div><div className="page-head"><div><span className="eyebrow">ACCOUNT</span><h1>Store settings</h1><p>Brand your store and manage delivery and payment details.</p></div><button className="primary-button" disabled={saving} onClick={async()=>{setSaving(true);try{await onSave({...d,primaryColor:d.primaryColor||"#12392d"})}finally{setSaving(false)}}}><Save size={16}/>{saving?"Saving…":"Save changes"}</button>{onDelete&&<button type="button" className="ghost-button" style={{marginLeft:8}} onClick={onDelete} disabled={saving}><Trash2 size={16}/> Delete store</button>}</div><FeaturePromo icon={Crown} title="Make your store stand out." text="Unlock more branding and storefront tools as your business grows." /><div className="settings-grid"><section className="panel"><div className="panel-head"><div><span className="eyebrow">STORE DETAILS</span><h2>Basics</h2></div></div><div className="form-grid-2"><Field label="Store name" value={d.storeName||""} onChange={e=>setD({...d,storeName:e.target.value})}/><Field label="Store slug" value={d.slug||""} onChange={e=>setD({...d,slug:slugify(e.target.value)})}/><Field label="Tagline" value={d.tagline||""} onChange={e=>setD({...d,tagline:e.target.value})}/><PhoneField label="WhatsApp number" value={d.vendorPhone||""} onChange={v=>setD({...d,vendorPhone:v})}/><div className="choice-block delivery-setting"><b>Delivery</b><p className="muted">Turn this on only if you offer customer delivery.</p><div className="choice-grid"><button type="button" className={d.deliveryEnabled!==false?"choice active":"choice"} onClick={()=>setD({...d,deliveryEnabled:true})}><Truck size={15}/> Delivery on</button><button type="button" className={d.deliveryEnabled===false?"choice active":"choice"} onClick={()=>setD({...d,deliveryEnabled:false})}><Store size={15}/> Pickup only</button></div></div><Field label="Delivery fee" type="number" min="0" disabled={d.deliveryEnabled===false} value={d.deliveryEnabled===false?0:(d.deliveryFee??0)} onChange={e=>setD({...d,deliveryFee:e.target.value})}/><Field label="Payment / bank details" value={d.paymentDetails||""} onChange={e=>setD({...d,paymentDetails:e.target.value})}/><Field label="Payment QR image URL" value={d.paymentQrUrl||""} onChange={e=>setD({...d,paymentQrUrl:e.target.value})}/></div></section><section className="panel"><div className="panel-head"><div><span className="eyebrow">APPEARANCE</span><h2>Interface</h2></div></div><div className="choice-grid"><button className={mode==="light"?"choice active":"choice"} onClick={()=>setM("light")}>Light</button><button className={mode==="dark"?"choice active":"choice"} onClick={()=>setM("dark")}>Dark</button><button className={mode==="contrast"?"choice active":"choice"} onClick={()=>setM("contrast")}>High contrast</button></div><div className="palette-grid">{presets.map(([n,c])=><button key={n} className="palette-swatch" style={{"--swatch":c}} onClick={()=>setC(c)}><i/><b>{n}</b></button>)}</div><Field label="Custom color" value={color} onChange={e=>setC(e.target.value)} /><div className="color-preview" style={{background:color}}><strong>{color}</strong><span>Live preview</span></div></section></div></div>}

function Discounts({plan,discounts,form,setForm,onCreate,onDelete}){if(!["Premium","Business"].includes(plan))return <div><div className="page-head"><div><span className="eyebrow">PROMOTIONS</span><h1>Discounts</h1><p>Create discount codes after upgrading.</p></div></div><section className="panel upgrade-panel"><Crown size={25}/><h2>Discounts are a paid feature</h2><p>Upgrade to Premium or Business to unlock promotions.</p><button className="primary-button" onClick={()=>go("/app/premium")}>View plans <Crown size={16}/></button></section></div>;return <div><div className="page-head"><div><span className="eyebrow">PROMOTIONS</span><h1>Discounts</h1><p>Create simple promotional codes.</p></div></div><section className="panel"><div className="form-grid-4"><Field label="Code" value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="SAVE10"/><label className="qc-field"><span>Type</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="percent">Percent</option><option value="fixed">Fixed</option></select></label><Field label="Value" type="number" min="1" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/><Field label="Expires" type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})}/></div><button className="primary-button" onClick={onCreate}><Plus size={16}/> Create discount</button></section><section className="panel table-card">{discounts.length?<div className="table-wrap"><table><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Expires</th><th/></tr></thead><tbody>{discounts.map(d=><tr key={d.id}><td><b>{d.code}</b></td><td>{d.type}</td><td>{d.type==="percent"?d.value+"%":fmt(d.value)}</td><td>{d.expiresAt?new Date(d.expiresAt).toLocaleDateString():"Never"}</td><td><button className="danger-button" onClick={()=>onDelete(d.id)}><Trash2 size={15}/> Delete</button></td></tr>)}</tbody></table></div>:<Empty title="No discounts yet" text="Create your first code above."/>}</section></div>}

function Premium({plan,payment,paymentError,paymentLoading,start,refresh,cancel}){const [showPayment,setShowPayment]=useState(!!payment);useEffect(()=>{if(payment)setShowPayment(true)},[payment]);const account=payment?.accountNumber||"";const copyAccount=async()=>{if(!account)return;try{await navigator.clipboard.writeText(account)}catch{}};const plans=[["Free",0],["Premium",4999],["Business",9999]], [selected,setSelected]=useState(""); const choose=async n=>{if(paymentLoading)return;setSelected(n);try{await start(n)}finally{setSelected("")}};const shortRef=v=>{const s=String(v||"—");return s==="—"?"—":s.slice(0,5).toUpperCase()};return <div><div className="page-head"><div><span className="eyebrow">PLANS</span><h1>Choose what your store needs.</h1><p>Start simple and upgrade when your workflow grows.</p></div></div><div className="plan-grid">{plans.map(([n,p])=><article className={"plan-card-new"+(plan===n?" active":"")} key={n}><span>{n==="Free"?"STARTER":n==="Premium"?"MOST POPULAR":"GROWING TEAM"}</span><h2>{n}</h2><div className="plan-price">{fmt(p)}<small>{n==="Premium"?"/month":n==="Business"?"/year":""}</small></div><div className="plan-features">{(n==="Free"?["Branded storefront","Products and orders","WhatsApp checkout","Basic analytics"]:n==="Premium"?["Everything in Free","Advanced analytics","Discounts and promotions","Priority storefront tools"]:["Everything in Premium","Multiple storefronts","Business analytics","Priority support"]).map(x=><div key={x}><Check size={15}/>{x}</div>)}</div>{n!=="Free"&&plan!==n&&<button className="primary-button" disabled={paymentLoading} onClick={()=>choose(n)}>{paymentLoading&&selected===n?"Preparing…":"Choose "+n}<Crown size={16}/></button>}</article>)}</div>{payment&&showPayment&&<div className="payment-modal-backdrop" role="presentation"><section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title"><button className="payment-modal-close" type="button" onClick={()=>setShowPayment(false)} aria-label="Close payment details"><X size={18}/></button><span className="eyebrow">PAYMENT READY</span><h2 id="payment-title">Complete your {payment.plan} payment</h2><p>Transfer exactly <strong>{fmt(payment.amount)}</strong> to the account below.</p><div className="payment-account payment-account-focus"><small>ACCOUNT NUMBER</small><strong>{account||"—"}</strong>{account&&<button type="button" className="primary-button payment-copy" onClick={copyAccount}><Copy size={14}/> Copy account number</button>}</div><div className="payment-details-grid"><div><small>Bank code</small><strong>{payment.bankCode||"—"}</strong></div><div><small>Reference</small><strong title={payment.reference||payment.transactionId||payment.orderId||"—"}>{shortRef(payment.reference||payment.transactionId||payment.orderId)}</strong></div></div><div className="modal-actions"><button className="primary-button" onClick={refresh}>Refresh payment status</button><button className="ghost-button" onClick={()=>setShowPayment(false)}>Close</button>{plan!=="Free"&&<button className="danger-button" onClick={cancel}>Cancel plan</button>}</div>{paymentError&&<div className="form-error">{paymentError}</div>}</section></div>}</div>}
function ShareModal({url,onClose}){const[s,setS]=useState("");const copy=async()=>{try{await navigator.clipboard.writeText(url);setS("Link copied.")}catch{setS("Copy failed.")}};return <Modal title="Share your store" subtitle="Use this link anywhere customers can find you." onClose={onClose}><div className="share-preview"><span>Storefront link</span><code>{url}</code></div><div className="modal-actions"><button className="ghost-button" onClick={copy}><Copy size={16}/> Copy link</button><button className="primary-button" onClick={()=>{if(navigator.share)navigator.share({title:"My QuickCart store",url});else copy()}}><Share2 size={16}/> Share</button></div>{s&&<div className="form-success">{s}</div>}</Modal>}

function CustomerReceiptScanner({value,onChange}){
 const[open,setOpen]=useState(false),[preview,setPreview]=useState(""),[text,setText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview]);
 const parse=t=>{
  const lines=t.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const money=/[₦N]\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
  const totalLine=lines.find(x=>/total|amount due|grand total|balance due/i.test(x)&&money.test(x));
  const taxLine=lines.find(x=>/tax|vat|v\.a\.t/i.test(x)&&money.test(x));
  const date=(t.match(/\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})\b/)||[])[1]||"";
  const receiptNo=(lines.find(x=>/receipt|invoice|ref|order\s*(no|#)/i.test(x))||"").replace(/^.*?(?:receipt|invoice|ref|order\s*(?:no|#)?)[\s:#-]*/i,"").trim();
  const first=lines.find(x=>/[A-Za-z]{3,}/.test(x)&&!/(receipt|invoice|date|total|tax|vat|cash|change|phone|address)/i.test(x))||lines[0]||"";
  const amount=v=>(v.match(money)||[])[1]||"";
  onChange({merchant:first,date,total:amount(totalLine||""),tax:amount(taxLine||""),receiptNo});
 };
 const scan=async file=>{
  if(!file)return;
  if(!file.type.startsWith("image/")){setError("Choose a receipt image file.");return}
  if(file.size>10*1024*1024){setError("Please choose an image smaller than 10 MB.");return}
  setError("");setText("");setOpen(true);setPreview(URL.createObjectURL(file));setBusy(true);
  let worker;
  try{
   const{createWorker}=await import("tesseract.js");
   worker=await createWorker("eng");
   const result=await worker.recognize(file);
   const raw=result.data.text||"";
   setText(raw);
   parse(raw);
   if(!raw.trim())setError("No readable text was found. Try a clearer, well-lit photo or enter the details manually.");
  }catch(e){setError("Could not read this receipt. Try a clearer image or enter the details manually.")}
  finally{if(worker)try{await worker.terminate()}catch{}setBusy(false)}
 };
 const hasData=Boolean(value.merchant||value.date||value.total||value.tax||value.receiptNo);
 return <details className="checkout-receipt" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary><span><b>Attach payment receipt</b><small>Optional · upload a physical receipt for reference</small></span><span>{hasData?"Added":"Optional"}</span></summary><div className="checkout-receipt-body"><div className="receipt-drop"><input id="customer-receipt-file" type="file" accept="image/*" capture="environment" onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value="";scan(file)}}/><label htmlFor="customer-receipt-file"><Upload size={18}/><strong>{busy?"Reading receipt…":"Scan or upload receipt"}</strong><span>Use your camera or choose an image. Maximum 10 MB.</span></label></div>{preview&&<img className="receipt-preview" src={preview} alt="Receipt preview"/>}{error&&<div className="form-error" role="status">{error}</div>}{hasData&&<div className="form-grid-2"><Field label="Merchant" value={value.merchant} onChange={e=>onChange({...value,merchant:e.target.value})}/><Field label="Date" value={value.date} onChange={e=>onChange({...value,date:e.target.value})}/><Field label="Amount" value={value.total} onChange={e=>onChange({...value,total:e.target.value})}/><Field label="Tax / VAT" value={value.tax} onChange={e=>onChange({...value,tax:e.target.value})}/><Field label="Receipt / reference" value={value.receiptNo} onChange={e=>onChange({...value,receiptNo:e.target.value})}/></div>}{text&&<details className="receipt-raw"><summary>View extracted text</summary><textarea rows="5" value={text} onChange={e=>setText(e.target.value)}/></details>}</div></details>
}
function saveReceiptImage(order){
 if(!order)return;
 const width=1400,pad=90,line=58,items=Array.isArray(order.items)?order.items:[];
 const height=Math.max(720,430+items.length*line);
 const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");if(!ctx)return;
 ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);
 ctx.fillStyle="#15221c";ctx.font="700 52px Arial";ctx.fillText(String(order.storeName||"QuickCart Store"),pad,82);
 ctx.font="600 30px Arial";ctx.fillStyle="#68736e";ctx.fillText("CUSTOMER RECEIPT",pad,132);
 ctx.fillStyle="#15221c";ctx.font="500 25px Arial";ctx.fillText("Order #"+String(order.id||"").slice(0,12),pad,210);
 ctx.fillText(order.createdAt?new Date(order.createdAt).toLocaleString():"—",pad,248);
 let y=310;
 items.forEach(x=>{ctx.font="600 30px Arial";ctx.fillText((x.quantity||1)+"× "+String(x.name||"Item").slice(0,55),pad,y);ctx.textAlign="right";ctx.fillText(fmt(Number(x.price||0)*Number(x.quantity||1)),width-pad,y);ctx.textAlign="left";y+=line});
 ctx.strokeStyle="#15221c";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pad,y+14);ctx.lineTo(width-pad,y+14);ctx.stroke();
 ctx.font="700 40px Arial";ctx.fillText("TOTAL",pad,y+76);ctx.textAlign="right";ctx.fillText(fmt(order.total),width-pad,y+76);ctx.textAlign="left";
 ctx.font="500 24px Arial";ctx.fillStyle="#68736e";ctx.fillText("Powered by QuickCart",pad,y+135);
 const link=document.createElement("a");link.download="quickcart-receipt-"+String(order.id||"receipt").slice(0,12)+".png";link.href=canvas.toDataURL("image/png");link.click();
}
function CustomerReceiptCard({order}){
 const print=()=>printReceiptDocument(order,{storeName:order?.storeName,tagline:"Customer receipt"});
 if(!order)return null;
 return <details open className="customer-receipt-card"><summary><FileText size={15}/> Receipt <span>#{String(order.id).slice(0,10)}</span></summary><div className="customer-receipt-paper"><div className="receipt-brand"><Logo size={30}/><div><strong>{order.storeName||"QuickCart Store"}</strong><small>Customer receipt</small></div></div><div className="receipt-meta"><span>Order #{String(order.id).slice(0,12)}</span><span>{order.createdAt?new Date(order.createdAt).toLocaleString():"—"}</span></div>{order.items?.map((x,i)=><div className="receipt-line" key={i}><span>{x.quantity||1}× {x.name}</span><strong>{fmt(Number(x.price||0)*Number(x.quantity||1))}</strong></div>)}<div className="receipt-total"><span>Total</span><strong>{fmt(order.total)}</strong></div>{order.receiptData&&(order.receiptData.merchant||order.receiptData.total||order.receiptData.receiptNo)&&<div className="receipt-foot">Payment receipt: {order.receiptData.merchant||"Uploaded"}{order.receiptData.total?" · "+order.receiptData.total:""}{order.receiptData.receiptNo?" · Ref "+order.receiptData.receiptNo:""}</div>}<div className="receipt-actions"><button className="primary-button" type="button" onClick={print}><Download size={15}/> Save PDF / Print</button><button className="ghost-button" type="button" onClick={()=>saveReceiptImage(order)}><ImageIcon size={15}/> Save image</button></div></div></details>}
function CustomerOrderStatus({orders,onRefresh,onWhatsAppSent,onModifyOrder}){
 const[busy,setBusy]=useState(""),[busyAction,setBusyAction]=useState(""),[msg,setMsg]=useState(""),[refreshing,setRefreshing]=useState(false),[lastChecked,setLastChecked]=useState(null);
 const confirm=async order=>{setBusy(order.id);setBusyAction("confirm");setMsg("");try{const token=localStorage.getItem("qc_order_token:"+order.id);if(!token)throw new Error("This device no longer has the secure order token. Please use the same browser used to place the order.");const d=await api("/api/orders/"+order.id+"/customer-confirm",{method:"POST",body:body({confirmationToken:token})});setMsg(d.status==="picked_up"?"Pickup confirmed successfully.":"Delivery confirmed successfully.");setLastChecked(new Date());onRefresh?.()}catch(e){setMsg(e.message||"Could not confirm the order.")}finally{setBusy("");setBusyAction("")}};
 const modify=async(order,change)=>{if(busy===order.id)return;setBusy(order.id);setBusyAction("update");setMsg("");try{const result=await onModifyOrder?.(order,change);if(!result?.order?.id)throw new Error("The server did not confirm this order update. Refresh tracking and try again.");setMsg(result.cancelled?"Order cancelled. Product stock and tracking have been updated.":"Order updated. Product stock and tracking have been updated.");setLastChecked(new Date());}catch(e){setMsg(e.message||"Could not update this order. Please try again.");}finally{setBusy("");setBusyAction("")}};
 const refresh=async()=>{if(!onRefresh)return;setRefreshing(true);setMsg("");try{await onRefresh();setLastChecked(new Date());setMsg("Order status updated.")}catch{setMsg("Could not update the order status. Check your connection and try again.")}finally{setRefreshing(false)}};
 if(!orders.length)return null;
 return <section id="customer-order-tracking" className="panel customer-order-status">
  <div className="panel-head customer-order-status-head"><div><div className="customer-status-title-row"><span className="eyebrow">ORDER TRACKING</span><span className="customer-live-indicator"><i/>LIVE</span></div><h2>Track Your Orders</h2><p className="muted">Order status refreshes automatically while you wait. No separate cart or manual tracking checks needed.</p></div><div className="customer-status-head-actions"><span className="customer-last-checked">{lastChecked?"Updated "+lastChecked.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"Auto-updating"}</span><button className="ghost-button customer-status-refresh" type="button" onClick={refresh} disabled={refreshing}>{refreshing?"Checking…":"Refresh"} <span aria-hidden="true">↻</span></button></div></div>
  <div className="customer-order-list">
   {orders.map(o=>{
    const sent=o.whatsappSent===true,isPickup=o.fulfillment==="pickup",ready=isPickup&&o.status==="ready",done=["picked_up","delivered"].includes(o.status),preparing=isPickup&&["new","confirmed","processing"].includes(o.status);
    const stage=done?3:(ready?2:(sent?1:0));
    const label=done?(isPickup?"Pickup Completed":"Delivery Completed"):!sent?"WhatsApp Checkout Pending":isPickup?(ready?"Ready For Pickup":"Preparing Your Order"):o.status==="shipped"?"Out For Delivery":"Preparing Your Order";
    const actionable=(!sent&&Boolean(onWhatsAppSent))||ready||(!isPickup&&o.status==="shipped");
    const action=!sent?"I Sent It On WhatsApp":ready?"Confirm Pickup":o.status==="shipped"?"Confirm Delivery":"";
    const message=isPickup?(done?"Pickup completed. Thanks for confirming your order.":ready?"Your order is ready. Collect it from the store, then confirm your pickup.":"Your order is being prepared. We’ll update this card automatically when the seller marks it ready."):(done?"Your delivery is complete.":o.status==="shipped"?"Your order is out for delivery.":"Your order is being prepared.");
    return <article className={"customer-order-status-card "+(ready?"is-ready ":"")+(done?"is-complete ":"")+"status-stage-"+stage} key={o.id}>
      <div className="customer-order-top"><div><span className="customer-order-type">{isPickup?"PICKUP":"DELIVERY"}</span><strong>#{String(o.id).slice(0,8)}</strong><span>{fmt(o.total)} · {o.items?.length||0} line items</span></div><span className={"customer-status-pill stage-"+stage}>{label}</span></div>
      <div className="customer-status-track" aria-label={isPickup?"Pickup progress":"Delivery progress"}>
       <div className={stage>=1?"active":""}><span>1</span><small>Order Sent</small></div><i className={stage>=1?"active":""}/><div className={stage>=2?"active":""}><span>2</span><small>{isPickup?"Ready":"Out For Delivery"}</small></div><i className={stage>=2?"active":""}/><div className={stage>=3?"active":""}><span>3</span><small>{isPickup?"Picked Up":"Delivered"}</small></div>
      </div>
      <div className="customer-order-message"><strong>{label}</strong><span>{message}</span></div>
      {["new","confirmed"].includes(o.status)&&<div className="customer-order-edit-controls"><div><strong>Need to change this order?</strong><span>You can reduce quantities or cancel before the seller starts processing it.</span></div><div className="customer-order-edit-items">{(o.items||[]).map(item=><div className="customer-order-edit-item" key={item.id}><span>{item.name}</span><div className="order-quantity-control"><button type="button" aria-label={"Decrease "+item.name} disabled={busy===o.id||Number(item.quantity)<=1} onClick={()=>modify(o,{action:"reduce",itemId:item.id})}>−</button><strong>{item.quantity}</strong><button type="button" aria-label={"Increase "+item.name} disabled={busy===o.id} onClick={()=>modify(o,{action:"increase",itemId:item.id})}>+</button></div></div>)}</div><button className="ghost-button customer-cancel-order" type="button" disabled={busy===o.id} onClick={()=>{if(window.confirm("Cancel this order? The item quantities will be returned to store stock."))modify(o,{action:"cancel"})}}>Cancel order</button></div>}
      {isPickup&&ready&&<div className="customer-pickup-ready-note"><strong>Ready For Pickup</strong><span>Order #{String(o.id).slice(0,8)} is ready. Collect it from the store, then confirm your pickup below.</span></div>}
      {isPickup&&preparing&&!done&&<div className="customer-pickup-wait-note"><span className="customer-pickup-dot" aria-hidden="true"/><span>We’re waiting for the seller to mark this order ready. This status will update automatically.</span></div>}
      <div className="customer-order-actions">
       {done?<strong className="customer-confirmed">Confirmed ✓</strong>:action&&actionable?<button className={"primary-button "+(ready?"pickup-confirm-button":"")} disabled={busy===o.id} onClick={()=>!sent?onWhatsAppSent?.(o.id):confirm(o)}>{busy===o.id?(busyAction==="update"?"Updating…":"Confirming…"):action}</button>:<span className="customer-order-passive-status"><i/>{isPickup?"Preparing Your Order":"Preparing Your Order"}</span>}
       <CustomerReceiptCard order={o}/>
      </div>
    </article>
   })}
  </div>
  {msg&&<div className="form-success customer-status-message" role="status">{msg}</div>}
 </section>
}
function PublicStore({data,customer,onLogin,onStoreRefresh}){
 const[q,setQ]=useState(""),[cart,setCart]=useState({}),[cartOwner,setCartOwner]=useState(""),[customerForm,setCustomerForm]=useState({name:customer?.name||"",phone:"",address:""}),[ful,setFul]=useState("pickup"),[pay,setPay]=useState("pay_on_delivery"),[code,setCode]=useState(""),[disc,setDisc]=useState(null),[receiptData,setReceiptData]=useState({merchant:"",date:"",total:"",tax:"",receiptNo:""}),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[orderEditBusy,setOrderEditBusy]=useState(""),[customerOrders,setCustomerOrders]=useState([]),[customerOrdersHydrated,setCustomerOrdersHydrated]=useState(false),[focusCartAfterAdd,setFocusCartAfterAdd]=useState(false);

 useEffect(()=>{if(customer?.name)setCustomerForm(v=>({...v,name:customer.name}));},[customer?.id,customer?.name]);
 useEffect(()=>{const storeId=data?.store?.id,email=emailOf(customer?.email);if(!storeId){setCart({});setCartOwner("");return}const owner=storeId+":"+(email||"guest");try{const saved=JSON.parse(localStorage.getItem("qc_cart:"+owner)||"{}");const guest=email?JSON.parse(localStorage.getItem("qc_cart:"+storeId+":guest")||"{}"):{};const safeSaved=saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};const safeGuest=guest&&typeof guest==="object"&&!Array.isArray(guest)?guest:{};const merged={...safeSaved};if(email)for(const [id,qty] of Object.entries(safeGuest))merged[id]=(Math.max(0,Number(merged[id])||0)+Math.max(0,Number(qty)||0));setCart(email?merged:safeSaved);setCartOwner(owner)}catch{setCart({});setCartOwner(owner)}},[data?.store?.id,customer?.email]);
 useEffect(()=>{const storeId=data?.store?.id,email=emailOf(customer?.email),owner=storeId+":"+(email||"guest");if(!storeId||cartOwner!==owner)return;try{localStorage.setItem("qc_cart:"+owner,JSON.stringify(cart));if(email)localStorage.removeItem("qc_cart:"+storeId+":guest")}catch{}},[data?.store?.id,customer?.email,cart,cartOwner]);

 useEffect(()=>{
   if(!data?.store)return;
   setFul(prev=>prev||"pickup");
 },[data?.store?.id,data?.store?.deliveryEnabled]);

 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   if(!storeId||!email){setCustomerOrders([]);setCustomerOrdersHydrated(false);return}
   let cancelled=false;
   setCustomerOrdersHydrated(false);
   const loadCustomerOrders=async()=>{
     try{
       const d=await api("/api/customer/orders",{headers:{Authorization:"Bearer "+(localStorage.getItem("quickcart_customer_token")||"")}});
       if(cancelled)return;
       const remote=Array.isArray(d.orders)?d.orders.filter(o=>o.storeId===storeId):[];
       let cached=[];
       try{const saved=JSON.parse(localStorage.getItem("qc_customer_orders:"+storeId+":"+email)||"[]");cached=Array.isArray(saved)?saved:[]}catch{}
       const cachedById=new Map(cached.map(o=>[String(o.id),o]));
       setCustomerOrders(remote.map(o=>({...o,whatsappSent:cachedById.get(String(o.id))?.whatsappSent===true,storeName:data?.store?.storeName||"Store"})).slice(0,10));
     }catch{
       if(cancelled)return;
       try{const saved=JSON.parse(localStorage.getItem("qc_customer_orders:"+storeId+":"+email)||"[]");setCustomerOrders(Array.isArray(saved)?saved.slice(0,10):[])}catch{setCustomerOrders([])}
     }finally{if(!cancelled)setCustomerOrdersHydrated(true)}
   };
   loadCustomerOrders();
   return()=>{cancelled=true};
 },[data?.store?.id,customer?.email]);

 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   if(!storeId||!email||!customerOrdersHydrated)return;
   try{localStorage.setItem("qc_customer_orders:"+storeId+":"+email,JSON.stringify(customerOrders.slice(0,10)))}catch{}
 },[data?.store?.id,customer?.email,customerOrdersHydrated,customerOrders]);

 const s=data?.store||null,p=Array.isArray(data?.products)?data.products:[],deliveryEnabled=s?s.deliveryEnabled!==false:false;
 const visible=p.filter(x=>!q||String(x.name||"").toLowerCase().includes(q.trim().toLowerCase()));
 const editableOrderLines=customerOrders.filter(o=>["new","confirmed"].includes(o.status)).flatMap(o=>(o.items||[]).map(item=>({...item,orderId:o.id,orderStatus:o.status})));
 const items=p.filter(x=>cart[x.id]).map(x=>({...x,quantity:Math.min(Number(x.stock)||0,Math.max(0,Number(cart[x.id])||0))})).filter(x=>x.quantity>0);
 const subtotal=items.reduce((a,x)=>a+Number(x.price||0)*x.quantity,0);
 const delivery=ful==="delivery"&&deliveryEnabled?Number(s?.deliveryFee||0):0;
 const discount=Number(disc?.amount||0);
 const total=Math.max(0,subtotal+delivery-discount);
 const ready=Boolean(customer&&items.length&&ful&&customerForm.name.trim()&&customerForm.phone.trim()&&(ful==="pickup"||customerForm.address.trim())&&s?.vendorPhone);

 useEffect(()=>{
   // Do not prune a restored cart while storefront products are still loading.
   // An undefined products payload is a loading state, not an empty catalog.
   if(!data?.store||!Array.isArray(data?.products))return;
   setCart(prev=>{
     const next={};
     let changed=false;
     for(const x of p){
       const wanted=Number(prev[x.id]||0);
       const stock=Math.max(0,Number(x.stock)||0);
       const qty=Math.min(wanted,stock);
       if(qty>0)next[x.id]=qty;
       if(qty!==wanted)changed=true;
     }
     if(Object.keys(prev).length!==Object.keys(next).length)changed=true;
     return changed?next:prev;
   });
 },[data?.store?.id,p.map(x=>x.id+":"+x.stock).join("|")]);

 useEffect(()=>{if(!focusCartAfterAdd||!items.length)return;setFocusCartAfterAdd(false);requestAnimationFrame(()=>document.getElementById("public-checkout")?.scrollIntoView({behavior:"smooth",block:"start"}))},[focusCartAfterAdd,items.length]);

 useEffect(()=>{
   if(!data?.store?.id||!customerOrders.length)return;
   const refresh=async()=>{
     const updates=await Promise.all(customerOrders.map(async o=>{
       try{
         const token=localStorage.getItem("qc_order_token:"+o.id);
         if(!token)return o;
         const d=await api("/api/orders/"+o.id+"/customer-status",{method:"POST",body:body({confirmationToken:token})});
         return {...o,status:d.status||o.status,updatedAt:d.updatedAt||o.updatedAt};
       }catch{return o}
     }));
     setCustomerOrders(updates);
   };
   const timer=window.setInterval(refresh,10000);
   return()=>window.clearInterval(timer);
 },[data?.store?.id,customerOrders.map(o=>o.id).join("|")]);

 if(!s)return <main className="public-store-page"><Loading label="Loading store…"/></main>;

 const updateCart=(id,next)=>{
   const adding=Number(next)>Number(cart[id]||0);
   if(adding&&items.length===0)setFocusCartAfterAdd(true)
   setCart(prev=>{
     const value=Math.max(0,Number(next)||0);
     const product=p.find(x=>x.id===id);
     const stock=Math.max(0,Number(product?.stock)||0);
     const qty=Math.min(value,stock);
     const nextCart={...prev};
     if(qty)nextCart[id]=qty;else delete nextCart[id];
     return nextCart;
   });
   setDisc(null);
   setMsg("");
 };

 const apply=async()=>{
   setMsg("");setDisc(null);
   const normalized=code.trim().toUpperCase();
   if(!normalized)return;
   if(!items.length){setMsg("Add an item before applying a discount.");return}
   try{
     const result=await api("/api/discounts/validate",{method:"POST",body:body({storeId:s.id,code:normalized,subtotal})});
     setDisc(result);
   }catch(e){setMsg(e.message||"Invalid discount.")}
 };

 const checkout=async()=>{if(busy)return;
   if(!customer){onLogin?.("login");return;}
   if(!ready||busy)return;const checkoutLockKey="quickcart_checkout_lock:"+String(s.id);if(sessionStorage.getItem(checkoutLockKey)==="1")return;sessionStorage.setItem(checkoutLockKey,"1");
   setBusy(true);setMsg("");
   let whatsappWindow=null;
   try{
     // Open synchronously from the button click so mobile browsers do not block WhatsApp later.
     whatsappWindow=window.open("about:blank","_blank");
     if(whatsappWindow)whatsappWindow.opener=null;
     const clientOrderKey="quickcart_checkout_client_id:"+String(s.id);const checkoutFingerprint=JSON.stringify({storeId:s.id,customerEmail:emailOf(customer?.email),customerName:customerForm.name.trim(),customerPhone:customerForm.phone.trim(),address:ful==="delivery"?customerForm.address.trim():"Pickup from store",fulfillment:ful,paymentMethod:pay,discountCode:disc?.code||code.trim(),receiptData,items:items.map(x=>({id:x.id,quantity:x.quantity})).sort((a,b)=>String(a.id).localeCompare(String(b.id)))});let savedCheckout=null;try{savedCheckout=JSON.parse(localStorage.getItem(clientOrderKey)||"null")}catch{}let clientOrderId=savedCheckout&&typeof savedCheckout==="object"&&savedCheckout.fingerprint===checkoutFingerprint?savedCheckout.id:"";if(!clientOrderId){clientOrderId=globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():"qc-"+Date.now()+"-"+Math.random().toString(36).slice(2);}localStorage.setItem(clientOrderKey,JSON.stringify({id:clientOrderId,fingerprint:checkoutFingerprint}));
     const order=await api("/api/orders",{
       method:"POST",
       headers:{Authorization:"Bearer "+(localStorage.getItem("quickcart_customer_token")||"")},
       body:body({
         storeId:s.id,
         clientOrderId,
         customerName:customerForm.name.trim(),
         customerPhone:customerForm.phone.trim(),
         customerEmail:customer?.email||"",
         address:ful==="delivery"?customerForm.address.trim():"Pickup from store",
         fulfillment:ful,
         paymentMethod:pay,
         discountCode:disc?.code||code.trim(),
         receiptData,
         items:items.map(x=>({id:x.id,quantity:x.quantity}))
       })
     });
     localStorage.setItem("qc_order_token:"+order.orderId,order.confirmationToken);
     const savedOrder={
       id:order.orderId,
       whatsappSent:false,
       storeName:s.storeName,
       storeId:s.id,
       fulfillment:ful,
       total:Number(order.total??total),
       status:"new",
       createdAt:new Date().toISOString(),
       customerName:customerForm.name.trim(),
       customerEmail:customer?.email||"",
       customerPhone:customerForm.phone.trim(),
       address:ful==="delivery"?customerForm.address.trim():"Pickup from store",
       paymentMethod:pay,
       items:items.map(x=>({id:x.id,name:x.name,price:x.price,quantity:x.quantity})),
       receiptData
     };
     setCustomerOrders(xs=>[savedOrder,...xs.filter(x=>x.id!==savedOrder.id)].slice(0,10));

     const receiptLines=(receiptData.merchant||receiptData.total||receiptData.receiptNo)
       ?["","PAYMENT RECEIPT",
         receiptData.merchant?"Merchant: "+receiptData.merchant:"",
         receiptData.date?"Date: "+receiptData.date:"",
         receiptData.total?"Receipt amount: "+receiptData.total:"",
         receiptData.tax?"Tax/VAT: "+receiptData.tax:"",
         receiptData.receiptNo?"Receipt/reference: "+receiptData.receiptNo:""
       ].filter(Boolean):[];
     const text=[
       "🛍️ NEW ORDER — "+s.storeName,"",
       "Customer: "+customerForm.name,
       "Phone: "+customerForm.phone,
       "Email: "+emailOf(customer?.email),
       "Fulfillment: "+(ful==="delivery"?"Delivery":"Pickup"),
       ful==="delivery"?"Address: "+customerForm.address:"Address: Pickup from store",
       "Payment: "+(pay==="bank_transfer"?"Bank transfer":"Pay on delivery"),
       "",
       ...items.map(x=>x.quantity+"x "+x.name+" — "+fmt(x.price*x.quantity)),
       "",
       "TOTAL: "+fmt(Number(order.total??total)),
       "Order ID: "+order.orderId,
       ...receiptLines
     ].join("\n");
     let phoneDigits=String(s.vendorPhone||"").replace(/\D/g,"");
     // WhatsApp requires an international number without a plus sign or local trunk zero.
     // Normalize common Nigerian local formats while preserving existing country codes.
     if(phoneDigits.startsWith("00"))phoneDigits=phoneDigits.slice(2);
     if(phoneDigits.startsWith("0"))phoneDigits="234"+phoneDigits.slice(1);
     else if(phoneDigits.length===10)phoneDigits="234"+phoneDigits;
     if(phoneDigits.length<10||phoneDigits.length>15){
       throw new Error("This store’s WhatsApp number looks invalid. Ask the seller to add a full number with country code in Store settings.");
     }
     const encodedText=encodeURIComponent(text);
     // Use WhatsApp's official click-to-chat URL. It works with WhatsApp Business
     // and regular WhatsApp, and lets the device/browser choose the installed app.
     // Avoid whatsapp:// deep links because they can target the wrong WhatsApp app
     // or fail on some Android browsers.
     const whatsappUrl="https://api.whatsapp.com/send?phone="+phoneDigits+"&text="+encodedText;
     if(whatsappWindow&&!whatsappWindow.closed){
       whatsappWindow.location.replace(whatsappUrl);
     }else{
       window.location.assign(whatsappUrl);
     }
     localStorage.removeItem(clientOrderKey);
      setMsg("Order created. WhatsApp checkout opened.");
     setCart({});
     setDisc(null);
     setCode("");
     setReceiptData({merchant:"",date:"",total:"",tax:"",receiptNo:""});
     requestAnimationFrame(()=>document.getElementById("customer-order-tracking")?.scrollIntoView({behavior:"smooth",block:"start"}));
   }catch(e){
     if(whatsappWindow&&!whatsappWindow.closed)whatsappWindow.close();
     setMsg(e.message||"Could not create the order.");
   }finally{sessionStorage.removeItem("quickcart_checkout_lock:"+String(s.id));setBusy(false)}
 };

 const modifyCustomerOrder=async(order,change)=>{
    const token=localStorage.getItem("qc_order_token:"+order.id);
    const customerToken=localStorage.getItem("quickcart_customer_token");
    if(!token&&!customerToken)throw new Error("Please sign in to your customer account to change this order.");
    const result=await api("/api/orders/"+encodeURIComponent(order.id)+"/customer-update",{method:"POST",headers:customerToken?{Authorization:"Bearer "+customerToken}:{},body:body({...(token?{confirmationToken:token}:{}),...change})});
    const updated=result.order;
    if(updated)setCustomerOrders(xs=>xs.map(o=>o.id===updated.id?{...o,...updated,storeName:s.storeName}:o));
    // Surface a refreshed stock count on the product cards immediately after a successful server update.
    try{const fresh=await api("/api/storefront/"+encodeURIComponent(s.slug));onStoreRefresh?.(fresh)}catch{}
    try{
      const freshOrders=await api("/api/customer/orders",{headers:{Authorization:"Bearer "+(localStorage.getItem("quickcart_customer_token")||"")}});
      if(Array.isArray(freshOrders.orders))setCustomerOrders(current=>freshOrders.orders.filter(o=>o.storeId===s.id).map(o=>({...o,whatsappSent:current.find(c=>c.id===o.id)?.whatsappSent===true,storeName:s.storeName})).slice(0,10));
    }catch{}
    return {cancelled:!!result.cancelled,order:updated};
  };
 const modifyProductCardOrder=async(order,change)=>{
   if(!order||busy||orderEditBusy)return;
   setOrderEditBusy(order.id);setMsg("");
   try{
     const result=await modifyCustomerOrder(order,change);
     if(!result?.order?.id)throw new Error("The server did not confirm this order update. Refresh and try again.");
     setMsg(result.cancelled?"Order cancelled. Product stock and tracking have been updated.":"Order updated. Product stock and tracking have been updated.");
   }catch(e){setMsg(e.message||"Could not update the order. Please refresh and try again.");}
   finally{setOrderEditBusy("")}
 };

 const refreshOrders=async()=>{
   const updates=await Promise.all(customerOrders.map(async o=>{
     try{
       const token=localStorage.getItem("qc_order_token:"+o.id);
       if(!token)return o;
       const d=await api("/api/orders/"+o.id+"/customer-status",{method:"POST",body:body({confirmationToken:token})});
       return {...o,status:d.status||o.status,updatedAt:d.updatedAt||o.updatedAt};
     }catch{return o}
   }));
   setCustomerOrders(updates);
 };
 return <main className="public-store-page">
  <header className="public-store-nav">
    <div className="public-brand">
      <Logo size={40}/>
      <div><b>{s.storeName}</b><small>{s.tagline||"Shop directly from this store"}</small></div>
    </div>
    <div className="public-nav-actions">{customer?<><span className="public-customer-name"><UserRound size={14}/> {customer.name}</span><button className="public-nav-link" type="button" onClick={()=>{localStorage.removeItem("quickcart_customer_token");localStorage.removeItem("quickcart_customer");window.location.reload()}}>Sign out</button></>:<button className="public-nav-link public-signin-link" type="button" onClick={()=>onLogin?.("login")}>Sign in</button>}<span className="public-store-badge">QuickCart storefront</span></div>
  </header>
  <section className="public-store-hero">
    <div className="public-store-hero-copy">
      <span className="eyebrow">OFFICIAL STOREFRONT</span>
      <h1>{s.storeName}</h1>
      <p>{s.tagline||"Browse products and place your order directly."}</p>
    </div>
    <div className="public-search">
      <Search size={17}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products by name…" aria-label="Search products"/>
      {q&&<button type="button" className="public-search-clear" onClick={()=>setQ("")} aria-label="Clear search">×</button>}
    </div>
  </section>
  <div className="public-store-grid">
   <section className="public-catalog">
    {msg&&<div className={/could not|cannot|invalid|unable|failed|error/i.test(msg)?"form-error public-store-feedback":"form-success public-store-feedback"} role="status" aria-live="polite">{msg}</div>}
    <div className="public-catalog-head">
      <div><span className="eyebrow">STORE PRODUCTS</span><h2>Choose your products</h2><p>{visible.length} {visible.length===1?"product":"products"} available{q?" · matching “"+q+"”":""}.</p></div>

    </div>
    {visible.length?<div className="public-product-grid">{visible.map(x=>{
      const stock=Math.max(0,Number(x.stock)||0),qty=Number(cart[x.id]||0);
      return <article className="public-product-card" key={x.id}>
       <div className="public-product-art">
        {x.imageUrl?<img src={x.imageUrl} alt={x.name}/>:<span>{x.emoji||"🛍️"}</span>}
        {stock<=0&&<span className="public-stock-pill">Sold out</span>}
        {stock>0&&stock<=5&&<span className="public-stock-pill">Only {stock} left</span>}
       </div>
       <div className="product-info">
        <h3>{x.name}</h3><p>{x.description||"Available from this store."}</p>
        <strong className="product-price">{fmt(x.price)}</strong>
        {(()=>{const lines=editableOrderLines.filter(item=>String(item.id)===String(x.id));return lines.length?<div className="product-order-edit">{lines.map(line=><div className="product-order-edit-line" key={line.orderId+":"+line.id}><span>Order #{String(line.orderId).slice(0,8)}</span><div className="order-quantity-control"><button type="button" aria-label={"Decrease "+x.name} disabled={busy||Boolean(orderEditBusy)||Number(line.quantity)<=1} onClick={()=>modifyProductCardOrder(customerOrders.find(o=>o.id===line.orderId),{action:"reduce",itemId:line.id})}>−</button><strong>{line.quantity}</strong><button type="button" aria-label={"Increase "+x.name} disabled={busy||Boolean(orderEditBusy)} onClick={()=>modifyProductCardOrder(customerOrders.find(o=>o.id===line.orderId),{action:"increase",itemId:line.id})}>+</button></div>{orderEditBusy===line.orderId&&<span className="order-edit-pending">Updating…</span>}</div>)}</div>:null})()}
       </div>
       <div className={"public-product-actions"+(qty>0?" has-quantity":"")}>
        {qty>0&&<div className="public-qty-control" aria-label={"Quantity of "+x.name}>
          <button type="button" onClick={()=>updateCart(x.id,qty-1)} aria-label={"Remove one "+x.name}>−</button>
          <strong>{qty}</strong>
          <button type="button" onClick={()=>updateCart(x.id,qty+1)} disabled={qty>=stock} aria-label={"Add one "+x.name}>+</button>
        </div>}
        <button className="primary-button" disabled={stock<=0||qty>=stock} onClick={()=>updateCart(x.id,qty+1)}>{stock>0?(qty?"Add another":"Add to order"):"Sold out"} {stock>0&&<Plus size={15}/>}</button>
       </div>
      </article>
    })}</div>:<Empty title="No products found" text={q?"Nothing matched “"+q+"”. Try a different search.":"This store has no products available yet."}/>}
   </section>
   {(items.length>0||customerOrders.length>0)&&<div className="public-cart-tracking-stack">
   {items.length>0&&(<section id="public-checkout" className="panel public-checkout">
    <div className="checkout-heading"><span className="eyebrow">ORDER SUMMARY</span><h2>{customer?"Complete your order":"Sign in to checkout"}</h2><p className="muted">{customer?"One checkout, then continue to WhatsApp.":"Create or sign in to your customer account before checkout."}</p></div>
    {!customer?<div className="customer-checkout-gate"><div className="customer-checkout-gate-icon"><UserRound size={22}/></div><strong>Your order is saved.</strong><span>Sign in to checkout and keep your order history and tracking together.</span><button className="primary-button big full" type="button" onClick={()=>onLogin?.("login")}>Sign in to checkout <LogIn size={17}/></button><button className="ghost-button full" type="button" onClick={()=>onLogin?.("signup")}>Create customer account</button></div>:<>
      {items.map(x=><div className="checkout-line" key={x.id}><span><b>{x.quantity}×</b> {x.name}</span><div><button type="button" aria-label={"Remove one "+x.name} onClick={()=>updateCart(x.id,x.quantity-1)}>−</button><strong>{fmt(x.price*x.quantity)}</strong><button type="button" aria-label={"Add one "+x.name} disabled={x.quantity>=Number(x.stock||0)} onClick={()=>updateCart(x.id,x.quantity+1)}>+</button></div></div>)}
      <div className="choice-block"><b>How would you like to receive your order?</b><div className="choice-grid">{deliveryEnabled&&<button type="button" className={ful==="delivery"?"choice active":"choice"} onClick={()=>setFul("delivery")}><Truck size={15}/> Delivery</button>}<button type="button" className={ful==="pickup"?"choice active":"choice"} onClick={()=>setFul("pickup")}><Store size={15}/> Pickup</button></div>{!deliveryEnabled&&<p className="muted">This seller offers pickup only.</p>}</div>
      <Field label="Your name" value={customerForm.name} onChange={e=>setCustomerForm({...customerForm,name:e.target.value})} placeholder="Full name" autoComplete="name"/>
      <Field label="Order email" type="email" value={customer?.email||""} readOnly autoComplete="email"/>
      <PhoneField label="Phone" value={customerForm.phone} onChange={v=>setCustomerForm({...customerForm,phone:v})} required/>
      {ful==="delivery"&&<Field label="Delivery address" value={customerForm.address} onChange={e=>setCustomerForm({...customerForm,address:e.target.value})} placeholder="Full address" autoComplete="street-address"/>}
      <div className="choice-block"><b>Payment</b><div className="choice-grid"><button type="button" className={pay==="pay_on_delivery"?"choice active":"choice"} onClick={()=>setPay("pay_on_delivery")}>Pay on delivery</button><button type="button" className={pay==="bank_transfer"?"choice active":"choice"} onClick={()=>setPay("bank_transfer")}>Bank transfer</button></div>{pay==="bank_transfer"&&<div className="payment-box">{s.paymentQrUrl&&<img src={s.paymentQrUrl} alt="Payment QR"/>}<strong>Transfer details</strong><span>{s.paymentDetails||"Seller has not added transfer instructions yet."}</span></div>}</div>
      <div className="discount-row"><input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setDisc(null)}} placeholder="Discount code" aria-label="Discount code"/><button type="button" className="ghost-button" disabled={!code.trim()||!items.length} onClick={apply}>Apply</button></div>
      {msg&&<div className={msg.startsWith("Order")?"form-success":"form-error"} role="status">{msg}</div>}
      <CustomerReceiptScanner value={receiptData} onChange={setReceiptData}/>
      <div className="checkout-total"><span>Total</span><strong>{fmt(total)}</strong></div>
      <button className="primary-button big full" disabled={!ready||busy} onClick={checkout}>{busy?"Creating order…":"Continue on WhatsApp"} <MessageCircle size={18}/></button>
      {!s.vendorPhone&&<p className="form-error">This store has not added a WhatsApp number yet.</p>}
    </>}
   </section>)}
   {customerOrders.length>0&&<div className="customer-tracking-wrap"><CustomerOrderStatus orders={customerOrders} onRefresh={refreshOrders} onModifyOrder={modifyCustomerOrder} onWhatsAppSent={id=>setCustomerOrders(xs=>xs.map(o=>o.id===id?{...o,whatsappSent:true}:o))}/></div>}
   </div>}</div>
 </main>
}

function OrderReceiptModal({order,store,onClose}){if(!order)return null;return <Modal title="Order receipt" onClose={onClose}><div><strong>{store?.storeName||"QuickCart Store"}</strong><p>Receipt #{String(order.id||"").slice(0,12)}</p><p>{order.customerName||"Customer"}</p><p>Total: {fmt(order.total)}</p></div><div className="modal-actions"><button className="primary-button" type="button" onClick={()=>printReceiptDocument(order,store)}><FileText size={17}/> Print receipt</button><button className="ghost-button" type="button" onClick={onClose}>Close</button></div></Modal>}

export default function App(){
 const route=useRoute();
 useEffect(()=>{try{localStorage.setItem("qc_order_reset_v1","done")}catch{}},[]);const[boot,setBoot]=useState(true),[user,setUser]=useState(null),[stores,setStores]=useState([]),[store,setStore]=useState(null),[products,setProducts]=useState([]),[orders,setOrders]=useState([]),[plan,setPlan]=useState({plan:"Free"}),[discounts,setDiscounts]=useState([]),[notice,setNotice]=useState(null),[busy,setBusy]=useState(false),[setup,setSetup]=useState(false),[productModal,setProductModal]=useState(null),[share,setShare]=useState(false),[otpOpen,setOtpOpen]=useState(false),[otp,setOtp]=useState(""),[otpEmail,setOtpEmail]=useState(""),[otpError,setOtpError]=useState(""),[otpMessage,setOtpMessage]=useState(""),[otpLoading,setOtpLoading]=useState(false),[otpCooldown,setOtpCooldown]=useState(0),[receiptOrder,setReceiptOrder]=useState(null),[auth,setAuth]=useState({name:"",email:"",password:"",confirmPassword:""}),[authError,setAuthError]=useState(""),[authLoading,setAuthLoading]=useState(false),[payment,setPayment]=useState(null),[paymentError,setPaymentError]=useState(""),[paymentLoading,setPaymentLoading]=useState(false),[discountForm,setDiscountForm]=useState({code:"",type:"percent",value:10,expiresAt:""}),[install,setInstall]=useState(null),[customerSession,setCustomerSession]=useState(()=>{try{return JSON.parse(localStorage.getItem("quickcart_customer")||"null")}catch{return null}});
 const publicStore=route.type==="store"||route.type==="store-auth";const shareUrl=store?window.location.origin+BASE+"/store/"+store.slug:"";
 const load=async(clear=true)=>{const token=localStorage.getItem("quickcart_token");if(!token)return false;try{const me=await api("/api/me");const ss=me.stores||(me.store?[me.store]:[]);setUser(me.user);setStores(ss);let id=localStorage.getItem("quickcart_store_id");if(!id&&ss[0]?.id){id=ss[0].id;localStorage.setItem("quickcart_store_id",id)}const active=ss.find(x=>x.id===id)||me.store||null;setStore(active);if(!active){setProducts([]);setOrders([]);return true}const rs=await Promise.allSettled([api("/api/products"),api("/api/orders"),api("/api/plan")]);setProducts(rs[0].status==="fulfilled"?rs[0].value.products||[]:[]);setOrders(rs[1].status==="fulfilled"?rs[1].value.orders||[]:[]);const p=rs[2].status==="fulfilled"?rs[2].value:{plan:"Free"};setPlan(p);if(["Premium","Business"].includes(p.plan))try{setDiscounts((await api("/api/discounts")).discounts||[])}catch{setDiscounts([])}else setDiscounts([]);return true}catch(e){if(clear&&(e.status===401||e.status===404)){localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");setUser(null);setStore(null)}return false}};
 useEffect(()=>{(async()=>{if(!publicStore)await load(false);setBoot(false)})()},[publicStore]);
 useEffect(()=>{if(route.type==="store"||route.type==="store-auth"){api("/api/storefront/"+encodeURIComponent(route.slug)).then(d=>{try{localStorage.setItem("qc_public_/api/storefront/"+encodeURIComponent(route.slug),JSON.stringify({data:d}))}catch{}}).catch(()=>{})}},[route.type,route.slug]);
 const[publicData,setPublicData]=useState(null),[publicError,setPublicError]=useState("");useEffect(()=>{if(route.type!=="store"&&route.type!=="store-auth"){setPublicData(null);setPublicError("");return}let on=true;setPublicData(null);setPublicError("");api("/api/storefront/"+encodeURIComponent(route.slug)).then(d=>{if(on)setPublicData(d)}).catch(e=>{if(on)setPublicError(e.message||"This storefront could not be loaded.")});return()=>{on=false}},[route.type,route.slug]);
 useEffect(()=>{
   if(route.type!=="store"&&route.type!=="store-auth"){
     document.title="QuickCart — Social commerce made simple";
     const desc="QuickCart helps small businesses create an online store, share one link, and take customer orders.";
     let m=document.querySelector('meta[name="description"]');if(m)m.setAttribute("content",desc);
     return;
   }
   const s=publicData?.store||publicData?.storefront||{};
   const name=String(s.name||s.storeName||route.slug.replace(/-/g," ")).trim();
   const desc=String(s.tagline||("Shop "+name+" online with QuickCart.")).trim().slice(0,160);
   document.title=name+" — Online Store | QuickCart";
   let m=document.querySelector('meta[name="description"]');
   if(!m){m=document.createElement("meta");m.name="description";document.head.appendChild(m)}
   m.setAttribute("content",desc);
   let canonical=document.querySelector('link[rel="canonical"]');
   if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}
   canonical.href=window.location.href.split("?")[0];
   let ld=document.getElementById("quickcart-store-jsonld");
   if(!ld){ld=document.createElement("script");ld.id="quickcart-store-jsonld";ld.type="application/ld+json";document.head.appendChild(ld)}
   ld.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Store","name":name,"url":window.location.href.split("?")[0],"description":desc});
 },[route.type,route.slug,publicData]);
 useEffect(()=>{if(route.type==="app"&&!boot&&!user&&!customerSession)go("/auth/login",true);if(route.type==="auth"&&!boot&&!user){}else if(route.type==="auth"&&!boot&&user)go("/app/overview",true)},[route.type,boot,user,customerSession]);
 useEffect(()=>{if(route.type!=="app"||!(customerSession||localStorage.getItem("quickcart_customer_token")))return;localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");setUser(null);setStore(null);setStores([]);setProducts([]);setOrders([]);go("/",true)},[route.type,customerSession]);
 useEffect(()=>{if(!store)return;const apply=()=>{const c=localStorage.getItem("quickcart_ui_color:"+store.id)||store.primaryColor||"#12392d";document.documentElement.style.setProperty("--accent",c);document.documentElement.style.setProperty("--accent-2",c);document.documentElement.dataset.theme=localStorage.getItem("quickcart_theme_mode:"+store.id)||"light"};apply();addEventListener("qc-theme",apply);return()=>removeEventListener("qc-theme",apply)},[store?.id,store?.primaryColor]);
 useEffect(()=>{const f=e=>{e.preventDefault();setInstall(e)};addEventListener("beforeinstallprompt",f);return()=>removeEventListener("beforeinstallprompt",f)},[]);
 useEffect(()=>{if(otpCooldown<=0)return;const t=setInterval(()=>setOtpCooldown(v=>Math.max(0,v-1)),1000);return()=>clearInterval(t)},[otpCooldown]);
 useEffect(()=>{if(!user)return;const start=Number(localStorage.getItem("quickcart_login_at"))||Date.now();localStorage.setItem("quickcart_login_at",String(start));let last=Date.now();const touch=()=>last=Date.now();const t=setInterval(()=>{const now=Date.now();if(now-last>=1800000||now-start>=28800000){localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");setUser(null);setStore(null);go("/auth/login",true)}},15000);["mousedown","keydown","touchstart","scroll"].forEach(x=>addEventListener(x,touch,{passive:true}));return()=>{clearInterval(t);["mousedown","keydown","touchstart","scroll"].forEach(x=>removeEventListener(x,touch))}},[user]);
 const error=e=>setNotice({title:"Something needs attention",message:e.message||"Please try again."});
 const authMode=route.type==="auth"?route.mode:"login";
 const submit=async e=>{e.preventDefault();if(authLoading)return;setAuthError("");const email=emailOf(auth.email),password=String(auth.password||"");if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setAuthError("Enter a valid email address.");if(!password)return setAuthError("Enter your password.");if(authMode==="signup"){if(!auth.name.trim())return setAuthError("Enter your name.");if(password.length<6)return setAuthError("Password must be at least 6 characters.");if(password!==auth.confirmPassword)return setAuthError("Passwords do not match.")}setAuthLoading(true);try{const d=await api(authMode==="signup"?"/api/auth/signup":"/api/auth/login",{method:"POST",body:body(authMode==="signup"?{name:auth.name.trim(),email,password}:{email,password})});if(authMode==="signup"){setOtpEmail(d.email||email);setOtp("");setOtpError("");setOtpMessage(d.message||"Enter the code from your email.");setOtpOpen(true)}else{localStorage.removeItem("quickcart_customer_token");localStorage.removeItem("quickcart_customer");setCustomerSession(null);localStorage.setItem("quickcart_token",d.token);localStorage.setItem("quickcart_login_at",String(Date.now()));if(!await load(false))throw new Error("Your account could not be loaded.");go("/app/overview",true)}}catch(e){if(e.code==="EMAIL_NOT_VERIFIED"){setOtpEmail(email);setOtpOpen(true);setOtpMessage("Your email needs verification.");setOtpError("")}else setAuthError(e.message||"Unable to sign in.")}finally{setAuthLoading(false)}};
 const verify=async e=>{e.preventDefault();setOtpLoading(true);setOtpError("");try{const d=await api("/api/auth/verify-otp",{method:"POST",body:body({email:otpEmail,otp})});localStorage.removeItem("quickcart_customer_token");localStorage.removeItem("quickcart_customer");setCustomerSession(null);localStorage.setItem("quickcart_token",d.token);localStorage.setItem("quickcart_login_at",String(Date.now()));if(!await load(false))throw new Error("Your account could not be loaded.");setOtpOpen(false);go("/app/overview",true)}catch(e){setOtpError(e.message||"Invalid code.")}finally{setOtpLoading(false)}};
 const resend=async()=>{if(otpLoading||otpCooldown)return;setOtpLoading(true);setOtpError("");try{const d=await api("/api/auth/resend-otp",{method:"POST",body:body({email:otpEmail})});setOtpMessage(d.message||"A new code has been sent.");setOtpCooldown(Number(d.cooldownSeconds)||60)}catch(e){setOtpError(e.message||"Could not resend code.");if(e.retryAfterSeconds)setOtpCooldown(e.retryAfterSeconds)}finally{setOtpLoading(false)}};
 const signout=()=>{localStorage.removeItem("quickcart_token");localStorage.removeItem("quickcart_store_id");localStorage.removeItem("quickcart_login_at");setUser(null);setStore(null);go("/auth/login",true)};
 const createStore=async(name,slug)=>{setBusy(true);try{const d=await api("/api/store",{method:"POST",body:body({storeName:name,slug:slug||name,tagline:"Shop with us",vendorPhone:"",deliveryFee:0,deliveryEnabled:false,primaryColor:"#12392d"})});localStorage.setItem("quickcart_store_id",d.store.id);setSetup(false);await load(false);go("/app/overview",true)}catch(e){error(e)}finally{setBusy(false)}};
 const saveProduct=async p=>{setBusy(true);try{const d=productModal?.id?await api("/api/products/"+productModal.id,{method:"PUT",body:body(p)}):await api("/api/products",{method:"POST",body:body(p)});setProducts(xs=>productModal?.id?xs.map(x=>x.id===productModal.id?d.product:x):[d.product,...xs]);setProductModal(null);setNotice({title:"Product saved",message:"Your catalog has been updated."})}catch(e){throw e}finally{setBusy(false)}};
 const delProduct=async id=>{if(!confirm("Delete this product?"))return;try{await api("/api/products/"+id,{method:"DELETE"});setProducts(xs=>xs.filter(x=>x.id!==id))}catch(e){error(e)}};
 const setOrder=async(id,status)=>{try{const d=await api("/api/orders/"+id+"/status",{method:"PUT",body:body({status})});setOrders(xs=>xs.map(x=>x.id===id?{...x,status:d.status}:x))}catch(e){error(e)}};
 const deleteOrder=async id=>{const order=orders.find(x=>x.id===id);if(!order)return;if(!window.confirm("Delete this order permanently? This cannot be undone."))return;setBusy(true);try{await api("/api/orders/"+id,{method:"DELETE"});setOrders(xs=>xs.filter(x=>x.id!==id));setReceiptOrder(x=>x?.id===id?null:x);setNotice({title:"Order deleted",message:"The order was permanently removed from your store."})}catch(e){error(e)}finally{setBusy(false)}};
 const saveStore=async patch=>{try{const d=await api("/api/store",{method:"PUT",body:body(patch)});setStore(d.store);setStores(xs=>xs.map(x=>x.id===d.store.id?d.store:x));setNotice({title:"Settings saved",message:"Your store changes are live."})}catch(e){error(e)}};
 const deleteStore=async()=>{if(!store)return;const name=store.storeName||"this store";if(!window.confirm('Delete "'+name+'"? This permanently removes the store, its products, orders and discounts.'))return;setBusy(true);try{await api("/api/store",{method:"DELETE",body:body({storeId:store.id})});const remaining=stores.filter(x=>x.id!==store.id);setStores(remaining);setProducts([]);setOrders([]);setDiscounts([]);if(remaining.length){localStorage.setItem("quickcart_store_id",remaining[0].id);await load(false);go("/app/overview",true)}else{localStorage.removeItem("quickcart_store_id");setStore(null);go("/app/overview",true)}setNotice({title:"Store deleted",message:'"'+name+'" has been deleted.'})}catch(e){error(e)}finally{setBusy(false)}};
 const selectStore=async id=>{localStorage.setItem("quickcart_store_id",id);setBusy(true);try{await load(false)}finally{setBusy(false)}};
 const startPlan=async p=>{setPaymentLoading(true);setPaymentError("");try{setPayment(await api("/api/payments/alatpay/plan",{method:"POST",body:body({plan:p})}))}catch(e){setPaymentError(e.message||"Unable to start payment.")}finally{setPaymentLoading(false)}};
 const refreshPlan=async()=>{try{setPlan(await api("/api/plan"))}catch(e){error(e)}};
 const cancelPlan=async()=>{try{await api("/api/plan/cancel",{method:"POST"});setPlan({plan:"Free"});setPayment(null)}catch(e){error(e)}};
 const createDiscount=async()=>{try{const d=await api("/api/discounts",{method:"POST",body:body(discountForm)});setDiscounts(xs=>[d.discount,...xs]);setDiscountForm({code:"",type:"percent",value:10,expiresAt:""})}catch(e){error(e)}};
 const deleteDiscount=async id=>{try{await api("/api/discounts/"+id,{method:"DELETE"});setDiscounts(xs=>xs.filter(x=>x.id!==id))}catch(e){error(e)}};
 if(boot)return <Loading/>;
  // Customer credentials must never render seller workspace routes, even for one render before effects run.
  if((route.type==="app"||route.type==="auth")&&(customerSession||localStorage.getItem("quickcart_customer_token")))return <Landing onAuth={m=>go("/auth/"+m)} canInstall={Boolean(install)} onInstall={async()=>{try{await install?.prompt();await install?.userChoice}catch{}setInstall(null)}}/>;
 if(route.type==="store-auth"||((route.type==="store")&&!customerSession))return <CustomerAuth mode={route.type==="store-auth"?route.mode:"login"} slug={route.slug} onMode={m=>go("/store/"+encodeURIComponent(route.slug)+"/auth/"+m)} onSuccess={c=>{setCustomerSession(c);go("/store/"+encodeURIComponent(route.slug),true)}}/>;
 if(route.type==="store")return publicError?<main className="public-store-page"><div className="public-store-error"><Logo size={48}/><h1>Storefront unavailable</h1><p>{publicError}</p><button className="primary-button" onClick={()=>window.location.reload()}>Try again</button></div></main>:<><PublicStore data={publicData} customer={customerSession} onStoreRefresh={setPublicData} onLogin={m=>go("/store/"+encodeURIComponent(route.slug)+"/auth/"+m)}/><Notice value={notice} onClose={()=>setNotice(null)}/></>;
 if(route.type==="auth")return <><Auth mode={authMode} onMode={m=>{setAuthError("");go("/auth/"+m)}} onSubmit={submit} form={auth} setForm={setAuth} error={authError} loading={authLoading}/>{otpOpen&&<Modal title="Verify your email" subtitle={"Enter the 6-digit code sent to "+otpEmail} onClose={()=>setOtpOpen(false)}><form className="stack" onSubmit={verify}><Field label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}/>{otpMessage&&<div className="form-success">{otpMessage}</div>}{otpError&&<div className="form-error">{otpError}</div>}<button className="primary-button big" disabled={otpLoading||otp.length!==6}>{otpLoading?"Verifying…":"Verify email"} <Check size={16}/></button><button type="button" className="ghost-button" disabled={otpLoading||otpCooldown>0} onClick={resend}>{otpCooldown?"Resend in "+otpCooldown+"s":"Resend code"}</button></form></Modal>}{/* AUTH */}</>;
 if(!user)return <Landing onAuth={m=>go("/auth/"+m)} canInstall={Boolean(install)} onInstall={async()=>{try{await install?.prompt();await install?.userChoice}catch{}setInstall(null)}}/>;
 if(!store)return <><div className="empty-app"><Logo size={50}/><h1>Create your first store.</h1><p>Set up your storefront before adding products and orders.</p><button className="primary-button big" onClick={()=>setSetup(true)}><Store size={17}/> Create store</button></div>{setup&&<StoreSetup loading={busy} onCreate={createStore} onClose={()=>setSetup(false)}/>}</>;
 const page=route.view==="products"?<Products products={products} onAdd={()=>setProductModal({})} onEdit={x=>setProductModal(x)} onDelete={delProduct}/>:route.view==="orders"?<Orders orders={orders} onStatus={setOrder} onReceipt={setReceiptOrder} onDelete={deleteOrder}/>:route.view==="receipts"?<ReceiptScanner/>:route.view==="customers"?<Customers orders={orders}/>:route.view==="analytics"?<Analytics orders={orders} products={products} plan={plan.plan}/>:route.view==="discounts"?<Discounts plan={plan.plan} discounts={discounts} form={discountForm} setForm={setDiscountForm} onCreate={createDiscount} onDelete={deleteDiscount}/>:route.view==="settings"?<SettingsPage store={store} onSave={saveStore} onDelete={deleteStore}/>:route.view==="premium"?<Premium plan={plan.plan} payment={payment} paymentError={paymentError} paymentLoading={paymentLoading} start={startPlan} refresh={refreshPlan} cancel={cancelPlan}/>:<Overview user={user} store={store} products={products} orders={orders} onAdd={()=>setProductModal({})} onShare={()=>setShare(true)} onStore={()=>go("/store/"+encodeURIComponent(store.slug))} onAnalytics={()=>go("/app/analytics")}/>;
 return <><DashboardShell user={user} store={store} stores={stores} view={route.view} plan={plan.plan} onSignOut={signout} onSelectStore={selectStore} onNewStore={()=>setSetup(true)}>{busy&&<div className="top-loading-line"/>}{page}</DashboardShell>{receiptOrder&&<OrderReceiptModal order={receiptOrder} store={store} onClose={()=>setReceiptOrder(null)}/>} {setup&&<StoreSetup loading={busy} onCreate={createStore} onClose={()=>setSetup(false)}/>} {productModal&&<ProductModal product={productModal.id?productModal:null} onClose={()=>setProductModal(null)} onSave={saveProduct} busy={busy}/>} {share&&<ShareModal url={shareUrl} onClose={()=>setShare(false)}/>}<Notice value={notice} onClose={()=>setNotice(null)}/></>;
}
