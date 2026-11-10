import React,{useEffect,useState} from "react";
import { api } from "../../lib/api.js";
import { Logo,Loading } from "../../components/common/SharedUI.jsx";
import { go } from "../../lib/navigation.js";
import { Users,Store,Package,ShoppingBag,RefreshCw,LogOut,ShieldCheck,ArrowUpRight } from "lucide-react";
import "../../styles/admin.css";

const money=value=>new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(Number(value||0));
const date=value=>value?new Date(value).toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"}):"—";

export default function AdminDashboard({onSignOut}) {
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");try{const overview=await api("/api/admin/overview");setData(overview)}catch(e){setError(e.message||"Unable to load admin data.");if(e.status===401){localStorage.removeItem("quickcart_admin_token");go("/admin/login",true)}}finally{setLoading(false)}};
 useEffect(()=>{if(!localStorage.getItem("quickcart_admin_token")){go("/admin/login",true);return}load()},[]);
 if(loading&&!data)return <Loading/>;
 if(error&&!data)return <main className="admin-gate"><div className="admin-gate-card"><Logo size={42}/><ShieldCheck size={28}/><h1>Admin access unavailable</h1><p>{error}</p><button onClick={load}>Try again</button><button className="admin-text-button" onClick={()=>go("/admin/login")}>Return to admin sign in</button></div></main>;
 const cards=[["Buyers",data.metrics.buyers,Users],["Sellers",data.metrics.sellers,Users],["Stores",data.metrics.stores,Store],["Products",data.metrics.products,Package],["Orders",data.metrics.orders,ShoppingBag]];
 return <main className="admin-page">
  <header className="admin-header"><div className="admin-brand"><Logo size={36}/><span>QuickCart <small>ADMIN</small></span></div><div className="admin-header-actions"><span><ShieldCheck size={15}/> Private admin session</span><button onClick={load} aria-label="Refresh overview"><RefreshCw size={16}/> Refresh</button><button onClick={onSignOut}><LogOut size={16}/> Sign out</button></div></header>
  <section className="admin-welcome"><div><span className="admin-eyebrow">PLATFORM OPERATIONS</span><h1>Good to see you, {data.admin.name||"Admin"}.</h1><p>Monitor QuickCart marketplace activity from one place.</p></div><span className="admin-secure-label"><i/> Restricted workspace</span></section>
  {error&&data&&<p className="admin-access-message" role="alert">{error}</p>}<section className="admin-metrics">{cards.map(([label,value,Icon])=><article key={label}><span><Icon size={18}/>{label}</span><strong>{Number(value||0).toLocaleString("en-NG")}</strong><small>All-time platform total</small></article>)}</section>
  <section className="admin-columns"><article className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">MARKETPLACE</span><h2>Recently created stores</h2></div><Store size={19}/></div>{data.recentStores.length?data.recentStores.map(store=><div className="admin-list-row" key={store.id}><span className="admin-list-icon"><Store size={16}/></span><span className="admin-row-main"><b>{store.name}</b><small>{store.owner.name} · {store.owner.email||"No owner email"}</small></span><span className="admin-row-date">{date(store.createdAt)}</span></div>):<p className="admin-empty">No stores have been created yet.</p>}</article>
   <article className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">TRANSACTIONS</span><h2>Recent orders</h2></div><ShoppingBag size={19}/></div>{data.recentOrders.length?data.recentOrders.map(order=><div className="admin-list-row" key={order.id}><span className="admin-list-icon"><ShoppingBag size={16}/></span><span className="admin-row-main"><b>{money(order.total)}</b><small>{String(order.status).replace(/_/g," ")} · {order.fulfillment}</small></span><span className="admin-row-date">{date(order.createdAt)}</span></div>):<p className="admin-empty">No orders have been placed yet.</p>}</article></section>
  <footer className="admin-footer">Private administrator session · {data.admin.email}. <button onClick={()=>go("/app/overview")}>Open seller workspace <ArrowUpRight size={14}/></button></footer>
 </main>;
}
