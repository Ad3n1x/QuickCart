import React,{useEffect,useMemo,useState} from "react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { fmt } from "../../lib/format.js";
import { Logo } from "../../components/common/SharedUI.jsx";
import "../../styles/marketplace.css";
import { Search,ShoppingBag,Store,ArrowUpRight,Plus,Minus,Trash2,Package,MapPin,LogIn,LogOut,CheckCircle2,LoaderCircle,SlidersHorizontal } from "lucide-react";

const money=value=>fmt(Number(value||0));
const phoneForWhatsApp=value=>{
  let digits=String(value||"").replace(/\D/g,"");
  if(digits.startsWith("00"))digits=digits.slice(2);
  if(digits.startsWith("0"))digits="234"+digits.slice(1);
  else if(digits.length===10)digits="234"+digits;
  return digits.length>=10&&digits.length<=15?digits:"";
};

export default function Marketplace({customer,onLogin,onSignOut}){
 const [catalog,setCatalog]=useState({stores:[],products:[]});
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [query,setQuery]=useState(""),[category,setCategory]=useState("All"),[sort,setSort]=useState("recent");
 const [cart,setCart]=useState({}),[cartOpen,setCartOpen]=useState(false);
 const [buyer,setBuyer]=useState({name:customer?.name||"",phone:customer?.phone||"",address:""});
 const [fulfillment,setFulfillment]=useState({});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[results,setResults]=useState([]);
 const [showStores,setShowStores]=useState(false);

 const load=async()=>{setLoading(true);setError("");try{const data=await api("/api/marketplace");setCatalog({stores:data.stores||[],products:data.products||[]});}catch(e){setError(e.message||"Marketplace could not be loaded.");}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(customer?.name)setBuyer(x=>({...x,name:x.name||customer.name}))},[customer?.name]);
 const categories=useMemo(()=>["All",...Array.from(new Set(catalog.products.map(p=>p.category||"General"))).sort()], [catalog.products]);
 const filtered=useMemo(()=>catalog.products.filter(p=>(category==="All"||(p.category||"General")===category)&&(!query||[p.name,p.description,p.store?.storeName,p.category].join(" ").toLowerCase().includes(query.toLowerCase()))).sort((a,b)=>sort==="low"?Number(a.price)-Number(b.price):sort==="high"?Number(b.price)-Number(a.price):new Date(b.createdAt||0)-new Date(a.createdAt||0)),[catalog.products,category,query,sort]);
 const cartLines=useMemo(()=>Object.entries(cart).map(([id,quantity])=>{const p=catalog.products.find(x=>x.id===id);return p?{...p,quantity:Math.min(Number(quantity)||0,Number(p.stock)||0)}:null}).filter(x=>x&&x.quantity>0),[cart,catalog.products]);
 const groups=useMemo(()=>{const map=new Map();for(const item of cartLines){const key=item.store.id;if(!map.has(key))map.set(key,{store:item.store,items:[]});map.get(key).items.push(item)}return Array.from(map.values())},[cartLines]);
 const cartCount=cartLines.reduce((n,x)=>n+x.quantity,0);
 const setQty=(id,qty)=>setCart(prev=>{const next={...prev};const value=Math.max(0,Number(qty)||0);if(value)next[id]=value;else delete next[id];return next});
 const add=(p)=>{setQty(p.id,Math.min(Number(p.stock)||0,Number(cart[p.id]||0)+1));setMessage("")};
 const total=group=>group.items.reduce((n,x)=>n+Number(x.price||0)*x.quantity,0);
 const setMode=(storeId,value)=>setFulfillment(x=>({...x,[storeId]:value}));

 const checkout=async targetGroup=>{
  if(busy)return;
  if(!buyer.name.trim()||!buyer.phone.trim()){setMessage("Enter your name and a valid Nigerian phone number before checkout.");return}
  if(!/^(?:\+234|234|0)[789][01]\d{8}$/.test(buyer.phone.replace(/[^0-9+]/g,""))){setMessage("Enter a valid Nigerian phone number, e.g. 08012345678.");return}
  const targets=targetGroup?[targetGroup]:groups;
  if(!targets.length)return;
  for(const group of targets){const mode=fulfillment[group.store.id]||"pickup";if(mode==="delivery"&&!buyer.address.trim()){setMessage("Enter a delivery address before checking out.");return}}
  setBusy(true);setMessage("");
  let completed=0;
  try{
   for(const group of targets){
    const mode=fulfillment[group.store.id]||"pickup";
    const fingerprint=JSON.stringify({storeId:group.store.id,customerEmail:customer?.email||"",customerName:buyer.name.trim(),customerPhone:buyer.phone.trim(),address:mode==="delivery"?buyer.address.trim():"Pickup from store",fulfillment:mode,items:group.items.map(x=>({id:x.id,quantity:x.quantity})).sort((a,b)=>String(a.id).localeCompare(String(b.id)))});
    const idempotencyKey="quickcart_marketplace_checkout:"+group.store.id;
    let saved=null;try{saved=JSON.parse(localStorage.getItem(idempotencyKey)||"null")}catch{}
    const clientOrderId=saved&&saved.fingerprint===fingerprint?saved.id:(globalThis.crypto?.randomUUID?.()||("qc-market-"+Date.now()+"-"+Math.random().toString(36).slice(2)));
    localStorage.setItem(idempotencyKey,JSON.stringify({id:clientOrderId,fingerprint}));
    const response=await api("/api/orders",{method:"POST",headers:{Authorization:localStorage.getItem("quickcart_customer_token")?"Bearer "+localStorage.getItem("quickcart_customer_token"):""},body:body({storeId:group.store.id,clientOrderId,customerName:buyer.name.trim(),customerPhone:buyer.phone.trim(),customerEmail:customer?.email||"",address:mode==="delivery"?buyer.address.trim():"Pickup from store",fulfillment:mode,paymentMethod:"seller_direct",items:group.items.map(x=>({id:x.id,quantity:x.quantity}))})});
    localStorage.removeItem(idempotencyKey);
    localStorage.setItem("qc_order_token:"+response.orderId,response.confirmationToken);
    const orderResult={store:group.store,orderId:response.orderId,total:Number(response.total||total(group)),status:"created",url:""};
    if(!customer){
     const guestOrder={id:response.orderId,guestCheckout:true,storeName:group.store.storeName,storeId:group.store.id,fulfillment:mode,total:orderResult.total,status:"new",createdAt:new Date().toISOString(),items:group.items.map(x=>({id:x.id,name:x.name,price:x.price,quantity:x.quantity}))};
     const guestKey="qc_guest_orders:"+group.store.id;let previous=[];try{previous=JSON.parse(localStorage.getItem(guestKey)||"[]")}catch{}
     localStorage.setItem(guestKey,JSON.stringify([guestOrder,...(Array.isArray(previous)?previous:[])].slice(0,10)));
    }
    const phone=phoneForWhatsApp(group.store.vendorPhone);
    if(phone){
     const lines=group.items.map(x=>x.quantity+" × "+x.name+" — "+money(x.price*x.quantity));
     const text=["🛍️ QUICKCART ORDER","Store: "+group.store.storeName,"Customer: "+buyer.name,"Phone: "+buyer.phone,"Fulfilment: "+(mode==="delivery"?"Delivery":"Pickup"),mode==="delivery"?"Address: "+buyer.address:"Pickup from store","Payment: Arrange directly with seller","",...lines,"","TOTAL: "+money(orderResult.total),"Order ID: "+response.orderId].join("\n");
     orderResult.url="https://wa.me/"+phone+"?text="+encodeURIComponent(text);
    }
    setResults(prev=>[orderResult,...prev]);
    setCart(prev=>{const next={...prev};for(const item of group.items)delete next[item.id];return next});
    completed++;
   }
   setMessage(targetGroup?"Order created for "+targetGroup.store.storeName+".":"Orders created for "+completed+" sellers. Open each seller's WhatsApp link to complete the handoff.");
  }catch(e){setMessage((completed?completed+" seller order(s) were created. ":"")+ (e.message||"Checkout could not be completed."));}
  finally{setBusy(false)}
 };

 return <main className="marketplace-page">
  <header className="market-nav"><a className="market-brand" href="/"><Logo size={34}/><span>QuickCart</span><small>MARKETPLACE</small></a><div className="market-nav-actions"><button className="market-cart-button" onClick={()=>setCartOpen(true)}><ShoppingBag size={17}/> Cart <b>{cartCount}</b></button>{customer?<><span className="market-account">{customer.name}</span><button className="market-icon-button" onClick={onSignOut} aria-label="Sign out"><LogOut size={17}/></button></>:<button className="market-signin" onClick={()=>onLogin("login")}><LogIn size={16}/> Sign in</button>}</div></header>
  <section className="market-hero"><div className="market-hero-copy"><span className="market-kicker">ONE MARKETPLACE. MANY LOCAL BUSINESSES.</span><h1>Find your next favourite thing.</h1><p>Explore products from independent sellers, compare options and shop directly with the businesses behind them.</p><div className="market-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, stores or categories..." aria-label="Search marketplace"/>{query&&<button onClick={()=>setQuery("")}>Clear</button>}</div><div className="market-proof"><span><Store size={14}/> {catalog.stores.length} stores</span><span><Package size={14}/> {catalog.products.length} products</span><span><MapPin size={14}/> Independent Nigerian sellers</span></div></div><div className="market-hero-art"><div className="market-art-card market-art-one"><span>DISCOVER</span><strong>Good finds.<br/>Great sellers.</strong><ShoppingBag size={34}/></div><div className="market-art-card market-art-two"><span>SHOP LOCAL</span><strong>Support small<br/>businesses.</strong><Store size={30}/></div></div></section>
  <section className="market-content">
   <div className="market-section-head"><div><span className="market-kicker">THE MARKET</span><h2>Explore products</h2><p>Browse across stores or open a seller's full storefront.</p></div><button className="market-store-toggle" onClick={()=>setShowStores(v=>!v)}><Store size={16}/>{showStores?"Hide stores":"Browse stores"} <ArrowUpRight size={15}/></button></div>
   <div className="market-toolbar"><div className="market-categories">{categories.map(c=><button key={c} className={category===c?"active":""} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="market-sort"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Recently added</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>
   {showStores&&<div className="market-store-grid">{catalog.stores.map(s=><a className="market-store-card" key={s.id} href={"/store/"+encodeURIComponent(s.slug)}><div className="market-store-avatar">{s.logo?<img src={s.logo} alt=""/>:<Store size={22}/>}</div><div><b>{s.storeName}</b><span>{s.tagline||"Independent seller"}</span><small>{s.productCount||0} products</small></div><ArrowUpRight size={16}/></a>)}</div>}
   {loading?<div className="market-empty">Loading the marketplace…</div>:error?<div className="market-empty"><b>Marketplace unavailable</b><p>{error}</p><button onClick={load}>Try again</button></div>:filtered.length?<div className="market-product-grid">{filtered.map(p=><article className="market-product-card" key={p.id}><a className="market-product-visual" href={"/store/"+encodeURIComponent(p.store.slug)}>{p.imageUrl?<img src={p.imageUrl} alt={p.name}/>:<span>{p.emoji||"🛍️"}</span>}</a><div className="market-product-info"><a href={"/store/"+encodeURIComponent(p.store.slug)} className="market-seller-name">{p.store.storeName}<ArrowUpRight size={12}/></a><h3>{p.name}</h3><p>{p.description||"Available from this seller."}</p><div className="market-product-bottom"><strong>{money(p.price)}</strong><span>{p.stock>0?"In stock":"Out of stock"}</span></div><button className="market-add-button" disabled={!p.stock} onClick={()=>add(p)}><Plus size={16}/> Add to cart</button></div></article>)}</div>:<div className="market-empty"><b>No matching products yet</b><p>Try another search or category.</p></div>}
  </section>
  {cartOpen&&<div className="market-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><section className="market-cart-panel"><header><div><span className="market-kicker">YOUR BAG</span><h2>Shopping cart <small>({cartCount})</small></h2></div><button className="market-icon-button" onClick={()=>setCartOpen(false)}>×</button></header>{cartLines.length===0?<div className="market-empty"><ShoppingBag size={30}/><b>Your cart is empty</b><p>Add products from any seller to get started.</p></div>:<><div className="market-buyer-fields"><label>Your name<input value={buyer.name} onChange={e=>setBuyer({...buyer,name:e.target.value})} placeholder="Full name"/></label><label>WhatsApp phone<input value={buyer.phone} onChange={e=>setBuyer({...buyer,phone:e.target.value})} placeholder="08012345678" inputMode="tel"/></label><label>Delivery address (if needed)<input value={buyer.address} onChange={e=>setBuyer({...buyer,address:e.target.value})} placeholder="Street, area, city"/></label></div>{groups.length>1&&<button className="market-checkout-all" disabled={busy} onClick={()=>checkout(null)}>{busy?"Creating seller orders…":"Checkout all sellers"} <ArrowUpRight size={16}/></button>}{groups.map(group=><section className="market-cart-group" key={group.store.id}><header><b>{group.store.storeName}</b><span>{money(total(group))}</span></header>{group.items.map(item=><div className="market-cart-line" key={item.id}><span>{item.name}<small>{money(item.price)} each</small></span><div><button onClick={()=>setQty(item.id,item.quantity-1)} aria-label="Decrease quantity"><Minus size={13}/></button><b>{item.quantity}</b><button onClick={()=>setQty(item.id,item.quantity+1)} disabled={item.quantity>=item.stock} aria-label="Increase quantity"><Plus size={13}/></button><button onClick={()=>setQty(item.id,0)} aria-label="Remove item"><Trash2 size={13}/></button></div></div>)}<label className="market-fulfilment">Fulfilment<select value={fulfillment[group.store.id]||"pickup"} onChange={e=>setMode(group.store.id,e.target.value)}><option value="pickup">Pickup</option>{group.store.deliveryEnabled&&<option value="delivery">Delivery</option>}</select></label><button className="market-checkout-button" disabled={busy} onClick={()=>checkout(group)}>{busy?"Creating order…":"Checkout this seller"} <ArrowUpRight size={16}/></button></section>)}<p className="market-hint">A combined checkout creates a separate order for each seller. Payments and fulfilment are arranged directly with each business.</p>{message&&<div className="market-message" role="status">{message}</div>}{results.length>0&&<div className="market-checkout-results"><b>Seller order links</b>{results.map(x=><article key={x.orderId}><span>{x.store.storeName} · {money(x.total)}</span>{x.url?<a href={x.url} target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowUpRight size={13}/></a>:<small>WhatsApp contact unavailable on this store</small>}</article>)}</div>}</>}</section></div>}
  {results.length>0&&<section className="market-results"><span className="market-kicker">RECENT CHECKOUTS</span><h2>Your seller order links</h2>{results.map(x=><article key={x.orderId}><div><b>{x.store.storeName}</b><span>Order {x.orderId.slice(0,10)} · {money(x.total)}</span></div>{x.url?<a href={x.url} target="_blank" rel="noreferrer">Continue on WhatsApp <ArrowUpRight size={14}/></a>:<span>Contact seller through their store</span>}</article>)}</section>}
  <footer className="market-footer"><Logo size={27}/><span>QuickCart Marketplace</span><small>Discover independent sellers. Shop directly.</small><a href="/">For sellers: create your store</a></footer>
 </main>;
}
