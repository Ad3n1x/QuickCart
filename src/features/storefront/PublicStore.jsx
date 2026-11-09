import React,{useEffect,useMemo,useRef,useState} from "react";
import "../../styles/storefront-polish.css";
import { BarChart3,Check,ChevronDown,ChevronLeft,Copy,Crown,Download,Edit3,ExternalLink,Eye,EyeOff,FileText,LogIn,LogOut,Menu,MessageCircle,Package,Plus,Save,Search,Settings,Share2,ShoppingBag,Store,Tag,Trash2,TrendingUp,Truck,Upload,UserRound,Users,X,Image as ImageIcon } from "lucide-react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { fmt } from "../../lib/format.js";
import { emailOf } from "../../lib/identity.js";
import { orderDisplayTotal,dedupeCustomerOrders } from "../../lib/order-utils.js";
import { printReceiptDocument } from "../../lib/receipt.js";
import { Logo,Field,Loading,Empty,Notice,Modal } from "../../components/common/SharedUI.jsx";
import PhoneField from "../../components/forms/PhoneField.jsx";

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
export function saveReceiptImage(order){
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
 ctx.font="700 40px Arial";ctx.fillText("TOTAL",pad,y+76);ctx.textAlign="right";ctx.fillText(fmt(orderDisplayTotal(order)),width-pad,y+76);ctx.textAlign="left";
 ctx.font="500 24px Arial";ctx.fillStyle="#68736e";ctx.fillText("Powered by QuickCart",pad,y+135);
 const link=document.createElement("a");link.download="quickcart-receipt-"+String(order.id||"receipt").slice(0,12)+".png";link.href=canvas.toDataURL("image/png");link.click();
}
function CustomerReceiptCard({order}){
 const print=()=>printReceiptDocument(order,{storeName:order?.storeName,tagline:"Customer receipt"});
 if(!order)return null;
 return <details open className="customer-receipt-card"><summary><FileText size={15}/> Receipt <span>#{String(order.id).slice(0,10)}</span></summary><div className="customer-receipt-paper"><div className="receipt-brand"><Logo size={30}/><div><strong>{order.storeName||"QuickCart Store"}</strong><small>Customer receipt</small></div></div><div className="receipt-meta"><span>Order #{String(order.id).slice(0,12)}</span><span>{order.createdAt?new Date(order.createdAt).toLocaleString():"—"}</span></div>{order.items?.map((x,i)=><div className="receipt-line" key={i}><span>{x.quantity||1}× {x.name}</span><strong>{fmt(Number(x.price||0)*Number(x.quantity||1))}</strong></div>)}<div className="receipt-total"><span>Total</span><strong>{fmt(orderDisplayTotal(order))}</strong></div>{order.receiptData&&(order.receiptData.merchant||order.receiptData.total||order.receiptData.receiptNo)&&<div className="receipt-foot">Payment receipt: {order.receiptData.merchant||"Uploaded"}{order.receiptData.total?" · "+order.receiptData.total:""}{order.receiptData.receiptNo?" · Ref "+order.receiptData.receiptNo:""}</div>}<div className="receipt-actions"><button className="primary-button" type="button" onClick={print}><Download size={15}/> Save PDF / Print</button><button className="ghost-button" type="button" onClick={()=>saveReceiptImage(order)}><ImageIcon size={15}/> Save image</button></div></div></details>}
function CustomerOrderStatus({orders,onRefresh,onWhatsAppSent,onModifyOrder,onDismissOrder}){
 const[busy,setBusy]=useState(""),[busyAction,setBusyAction]=useState(""),[msg,setMsg]=useState(""),[refreshing,setRefreshing]=useState(false),[lastChecked,setLastChecked]=useState(null);
 useEffect(()=>{if(!msg)return;const timer=window.setTimeout(()=>setMsg(""),120000);return()=>window.clearTimeout(timer)},[msg]);
 const confirm=async order=>{setBusy(order.id);setBusyAction("confirm");setMsg("");try{const token=localStorage.getItem("qc_order_token:"+order.id);if(!token)throw new Error("This device no longer has the secure order token. Please use the same browser used to place the order.");const d=await api("/api/orders/"+order.id+"/customer-confirm",{method:"POST",body:body({confirmationToken:token})});setMsg(d.status==="picked_up"?"Pickup confirmed successfully.":"Delivery confirmed successfully.");setLastChecked(new Date());onRefresh?.()}catch(e){setMsg(e.message||"Could not confirm the order.")}finally{setBusy("");setBusyAction("")}};
  const markWhatsAppSent=async order=>{if(busy===order.id)return;setBusy(order.id);setBusyAction("sent");setMsg("");try{const token=localStorage.getItem("qc_order_token:"+order.id);if(!token)throw new Error("The secure order token is missing. Open the order on the device and browser used to place it.");const d=await api("/api/orders/"+encodeURIComponent(order.id)+"/customer-whatsapp-sent",{method:"POST",body:body({confirmationToken:token})});if(d.whatsappSent!==true)throw new Error("The server did not save the WhatsApp confirmation. Please try again.");onWhatsAppSent?.(order.id,d);setMsg("WhatsApp confirmation saved. Your order tracking is updated.");setLastChecked(new Date());}catch(e){setMsg(e.message||"Could not save the WhatsApp confirmation. Please try again.");}finally{setBusy("");setBusyAction("")}};
 const modify=async(order,change)=>{if(busy===order.id)return;setBusy(order.id);setBusyAction("update");setMsg("");try{const result=await onModifyOrder?.(order,change);if(!result?.order?.id)throw new Error("The server did not confirm this order update. Refresh tracking and try again.");setMsg(result.cancelled?"Order cancelled. Stock has been restored and tracking has been removed.":"Order updated. Product stock and tracking have been updated.");setLastChecked(new Date());}catch(e){setMsg(e.message||"Could not update this order. Please try again.");}finally{setBusy("");setBusyAction("")}};
 const refresh=async()=>{if(!onRefresh)return;setRefreshing(true);setMsg("");try{await onRefresh();setLastChecked(new Date());setMsg("Order status updated.")}catch{setMsg("Could not update the order status. Check your connection and try again.")}finally{setRefreshing(false)}};
 const activeTrackingOrders=orders.filter(o=>o.status!=="cancelled"&&!(o.fulfillment==="pickup"&&o.status==="picked_up"));
 if(!activeTrackingOrders.length)return null;
 return <section id="customer-order-tracking" className="panel customer-order-status customer-tracking-auto">
  <div className="panel-head customer-order-status-head"><div><div className="customer-status-title-row"><span className="eyebrow">ORDER TRACKING</span><span className="customer-live-indicator"><i/>LIVE</span></div><h2>My Orders & Updates</h2><p className="muted">Your order history, cancellation status and delivery updates stay together here. This page refreshes automatically.</p></div><div className="customer-status-head-actions"><span className="customer-last-checked">{lastChecked?"Updated "+lastChecked.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"Auto-updating"}</span><button className="ghost-button customer-status-refresh" type="button" onClick={refresh} disabled={refreshing}>{refreshing?"Checking…":"Refresh"} <span aria-hidden="true">↻</span></button></div></div>
  {orders.some(o=>o?.guestCheckout)&&<div className="form-note guest-tracking-notice">You’re tracking as a guest. Refreshing this page will not remove your tracking. Your order details are saved in this browser on this device; clearing site data, using private browsing, or switching devices/browsers may make them unavailable. Sign in before ordering if you want orders linked to your customer account.</div>}
  <div className="customer-order-list">
   {activeTrackingOrders.map(o=>{
    const sent=o.whatsappSent===true,isPickup=o.fulfillment==="pickup",cancelled=o.status==="cancelled",ready=isPickup&&o.status==="ready",done=["picked_up","delivered"].includes(o.status),preparing=isPickup&&["new","confirmed","processing"].includes(o.status);
    const stage=done?3:(ready?2:(sent?1:0));
    const label=cancelled?"Cancelled":done?(isPickup?"Pickup completed":"Delivered"):!sent?"WhatsApp checkout pending":isPickup?(ready?"Ready for pickup":"Being prepared"):o.status==="shipped"?"Out for delivery":o.status==="confirmed"?"Order confirmed":"Being prepared";
    const actionable=(!sent&&Boolean(onWhatsAppSent))||ready||(!isPickup&&o.status==="shipped");
    const action=!sent?"I Sent It On WhatsApp":ready?"Confirm Pickup":o.status==="shipped"?"Confirm Delivery":"";
    const message=cancelled?"This order was cancelled and will not proceed.":isPickup?(done?"Pickup is complete. This order has been removed from active tracking.":ready?"Your order is ready to collect. Confirm pickup after you have collected it.":"The seller is preparing your order. This status refreshes automatically."):(done?"Your delivery is complete.":o.status==="shipped"?"Your order is on its way. Confirm delivery when it arrives.":o.status==="confirmed"?"The seller has confirmed your order.":"The seller is preparing your order.");
    return <article className={"customer-order-status-card "+(ready?"is-ready ":"")+(done?"is-complete ":"")+"status-stage-"+stage} key={o.id}>
      <div className="customer-order-top"><div><span className="customer-order-type">{isPickup?"PICKUP":"DELIVERY"}</span><strong>#{String(o.id).slice(0,8)}</strong><span>{fmt(orderDisplayTotal(o))} · {o.items?.length||0} line items</span></div><div className="customer-order-top-actions"><span className={"customer-status-pill stage-"+stage}>{label}</span>{!done&&<button className="customer-dismiss-tracking" type="button" onClick={()=>{if(window.confirm("Remove order #"+String(o.id).slice(0,8)+" from your tracking view? This only hides it on this device. It will not cancel the order or delete the seller’s order record."))onDismissOrder?.(o)}} aria-label={"Remove order #"+String(o.id).slice(0,8)+" from tracking"} title="Remove from tracking"><span className="customer-dismiss-icon" aria-hidden="true">×</span><span className="customer-dismiss-label">Remove tracking</span><span className="customer-dismiss-hint">Hide this order</span></button>}</div></div>
      <div className="customer-status-track" aria-label={isPickup?"Pickup progress":"Delivery progress"}>
       <div className={stage>=1?"active":""}><span>1</span><small>Order Sent</small></div><i className={stage>=1?"active":""}/><div className={stage>=2?"active":""}><span>2</span><small>{isPickup?"Ready":"Out For Delivery"}</small></div><i className={stage>=2?"active":""}/><div className={stage>=3?"active":""}><span>3</span><small>{isPickup?"Picked Up":"Delivered"}</small></div>
      </div>
      <div className="customer-order-message"><strong>{label}</strong><span>{message}</span></div>
      {["new","confirmed"].includes(o.status)&&<div className="customer-order-edit-controls"><div><strong>Need to change this order?</strong><span>You can reduce quantities or cancel before the seller starts processing it.</span></div><div className="customer-order-edit-items">{(o.items||[]).map(item=><div className="customer-order-edit-item" key={item.id}><span>{item.name}</span><div className="order-quantity-control"><button type="button" aria-label={"Decrease "+item.name} disabled={busy===o.id||Number(item.quantity)<=1} onClick={()=>modify(o,{action:"reduce",itemId:item.id})}>−</button><strong>{item.quantity}</strong><button type="button" aria-label={"Increase "+item.name} disabled={busy===o.id} onClick={()=>modify(o,{action:"increase",itemId:item.id})}>+</button></div></div>)}</div><button className="ghost-button customer-cancel-order" type="button" disabled={busy===o.id} onClick={()=>{if(window.confirm("Cancel this order? The item quantities will be returned to store stock."))modify(o,{action:"cancel"})}}>Cancel order</button></div>}
      {isPickup&&ready&&<div className="customer-pickup-ready-note"><strong>Ready For Pickup</strong><span>Order #{String(o.id).slice(0,8)} is ready. Collect it from the store, then confirm your pickup below.</span></div>}
      {isPickup&&preparing&&!done&&<div className="customer-pickup-wait-note"><span className="customer-pickup-dot" aria-hidden="true"/><span>We’re waiting for the seller to mark this order ready. This status will update automatically.</span></div>}
      <div className="customer-order-actions">
       {cancelled?<strong className="customer-confirmed">Cancelled</strong>:done?<strong className="customer-confirmed">Confirmed ✓</strong>:action&&actionable?<button className={"primary-button "+(ready?"pickup-confirm-button":"")} disabled={busy===o.id} onClick={()=>!sent?markWhatsAppSent(o):confirm(o)}>{busy===o.id?(busyAction==="update"?"Updating…":busyAction==="sent"?"Saving…":"Confirming…"):action}</button>:<span className="customer-order-passive-status"><i/>{isPickup?"Preparing Your Order":"Preparing Your Order"}</span>}
       <CustomerReceiptCard order={o}/>
      </div>
    </article>
   })}
  </div>
  {msg&&<div className="form-success customer-status-message" role="status">{msg}</div>}
 </section>
}
function PublicStore({data,customer,onLogin,onStoreRefresh,onSignOut}){
 const[q,setQ]=useState(""),[activeCategory,setActiveCategory]=useState("All"),[sortBy,setSortBy]=useState("featured"),[cart,setCart]=useState({}),[cartOwner,setCartOwner]=useState(""),[customerForm,setCustomerForm]=useState({name:customer?.name||"",phone:"",address:""}),[ful,setFul]=useState("pickup"),[pay,setPay]=useState("pay_on_delivery"),[code,setCode]=useState(""),[disc,setDisc]=useState(null),[receiptData,setReceiptData]=useState({merchant:"",date:"",total:"",tax:"",receiptNo:""}),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false),[orderEditBusy,setOrderEditBusy]=useState(""),[customerOrders,setCustomerOrders]=useState([]),[customerOrdersHydrated,setCustomerOrdersHydrated]=useState(false),[focusCartAfterAdd,setFocusCartAfterAdd]=useState(false),[trackingVisible,setTrackingVisible]=useState(false),[expandedProductImage,setExpandedProductImage]=useState(null),[whatsAppFallback,setWhatsAppFallback]=useState(null);
 useEffect(()=>{if(!msg)return;const timer=window.setTimeout(()=>setMsg(""),120000);return()=>window.clearTimeout(timer)},[msg]);

 useEffect(()=>{if(customer?.name)setCustomerForm(v=>({...v,name:customer.name}));},[customer?.id,customer?.name]);
 useEffect(()=>{const storeId=data?.store?.id;if(!storeId)return;try{const saved=JSON.parse(localStorage.getItem("qc_whatsapp_fallback:"+storeId)||"null");if(saved&&saved.orderId&&saved.phone&&saved.text&&saved.url)setWhatsAppFallback(saved)}catch{}},[data?.store?.id]);
 useEffect(()=>{const storeId=data?.store?.id,email=emailOf(customer?.email);if(!storeId){setCart({});setCartOwner("");return}const owner=storeId+":"+(email||"guest");try{const saved=JSON.parse(localStorage.getItem("qc_cart:"+owner)||"{}");const guest=email?JSON.parse(localStorage.getItem("qc_cart:"+storeId+":guest")||"{}"):{};const safeSaved=saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};const safeGuest=guest&&typeof guest==="object"&&!Array.isArray(guest)?guest:{};const merged={...safeSaved};if(email)for(const [id,qty] of Object.entries(safeGuest))merged[id]=(Math.max(0,Number(merged[id])||0)+Math.max(0,Number(qty)||0));setCart(email?merged:safeSaved);setCartOwner(owner)}catch{setCart({});setCartOwner(owner)}},[data?.store?.id,customer?.email]);
 useEffect(()=>{const storeId=data?.store?.id,email=emailOf(customer?.email),owner=storeId+":"+(email||"guest");if(!storeId||cartOwner!==owner)return;try{localStorage.setItem("qc_cart:"+owner,JSON.stringify(cart));if(email)localStorage.removeItem("qc_cart:"+storeId+":guest")}catch{}},[data?.store?.id,customer?.email,cart,cartOwner]);

 useEffect(()=>{
   if(!data?.store)return;
   setFul(prev=>prev||"pickup");
 },[data?.store?.id,data?.store?.deliveryEnabled]);

 // Restore the customer order hub after reload/login, not only immediately after checkout.
 useEffect(()=>{if(customerOrdersHydrated&&customerOrders.length)setTrackingVisible(true)},[customerOrdersHydrated,customerOrders.length]);

 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   if(!storeId||!email||!customerOrdersHydrated)return;
   let stopped=false,requesting=false;
   const syncOrders=async()=>{
     if(stopped||requesting||document.visibilityState==="hidden")return;
     const token=localStorage.getItem("quickcart_customer_token");
     if(!token)return;
     requesting=true;
     try{
       const result=await api("/api/customer/orders",{headers:{Authorization:"Bearer "+token}});
       if(stopped||!Array.isArray(result.orders))return;
       setCustomerOrders(current=>{
         const currentById=new Map(current.map(order=>[String(order.id),order]));
         return dedupeCustomerOrders(result.orders
           .filter(order=>String(order.storeId)===String(storeId))
           .map(order=>({...order,whatsappSent:order.whatsappSent===true||currentById.get(String(order.id))?.whatsappSent===true||localStorage.getItem("qc_whatsapp_sent:"+String(order.id))==="1",storeName:data?.store?.storeName||"Store"}))
         ).slice(0,10);
       });
     }catch{
       // Keep the last confirmed server snapshot visible while offline; retry on focus/interval.
     }finally{requesting=false}
   };
   const onVisible=()=>{if(document.visibilityState==="visible")syncOrders()};
   addEventListener("focus",onVisible);
   document.addEventListener("visibilitychange",onVisible);
   const interval=setInterval(syncOrders,25000);
   return()=>{stopped=true;clearInterval(interval);removeEventListener("focus",onVisible);document.removeEventListener("visibilitychange",onVisible)};
 },[data?.store?.id,customer?.email,customerOrdersHydrated]);
 
 // Guest orders cannot use the signed-in customer order-history endpoint.
 // Poll each guest order through its own confirmation token so seller status
 // changes reach the same device without requiring a manual refresh.
 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   if(!storeId||email||!customerOrdersHydrated)return;
   let stopped=false,requesting=false;
   const syncGuestOrders=async()=>{
     if(stopped||requesting||document.visibilityState==="hidden")return;
     const guestOrders=customerOrders.filter(order=>String(order?.storeId)===String(storeId)&&(order?.guestCheckout||!order?.customerEmail));
     if(!guestOrders.length)return;
     requesting=true;
     try{
       const results=await Promise.all(guestOrders.map(async order=>{
         const token=localStorage.getItem("qc_order_token:"+order.id);
         if(!token)return null;
         try{
           const result=await api("/api/orders/"+encodeURIComponent(order.id)+"/customer-status",{method:"POST",body:body({confirmationToken:token})});
           return {id:String(order.id),status:result.status,whatsappSent:result.whatsappSent===true,updatedAt:result.updatedAt};
         }catch{return null}
       }));
       if(stopped)return;
       const byId=new Map(results.filter(Boolean).map(result=>[result.id,result]));
       if(!byId.size)return;
       setCustomerOrders(current=>{
         let changed=false;
         const next=current.map(order=>{
           const update=byId.get(String(order.id));
           if(!update||!update.status)return order;
           const whatsappSent=update.whatsappSent===true||order.whatsappSent===true;
           if(update.status===order.status&&whatsappSent===(order.whatsappSent===true))return order;
           changed=true;
           return {...order,status:update.status,whatsappSent,updatedAt:update.updatedAt||order.updatedAt};
         });
         return changed?dedupeCustomerOrders(next):current;
       });
     }finally{requesting=false}
   };
   const onVisible=()=>{if(document.visibilityState==="visible")syncGuestOrders()};
   syncGuestOrders();
   const interval=setInterval(syncGuestOrders,12000);
   addEventListener("focus",onVisible);
   document.addEventListener("visibilitychange",onVisible);
   return()=>{stopped=true;clearInterval(interval);removeEventListener("focus",onVisible);document.removeEventListener("visibilitychange",onVisible)};
 },[data?.store?.id,customer?.email,customerOrdersHydrated,customerOrders]);

 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   // Clear the previous storefront's tracking immediately; never flash another store's orders.
   setCustomerOrders([]);
   if(!storeId){setCustomerOrdersHydrated(false);return}
   if(!email){
     let cancelled=false;setCustomerOrdersHydrated(false);
     try{const saved=JSON.parse(localStorage.getItem("qc_guest_orders:"+storeId)||"[]");if(!cancelled)setCustomerOrders(dedupeCustomerOrders(Array.isArray(saved)?saved.filter(o=>o&&String(o.storeId)===String(storeId)):[]).slice(0,10));}
     catch{if(!cancelled)setCustomerOrders([])}
     if(!cancelled)setCustomerOrdersHydrated(true);
     return()=>{cancelled=true};
   }
   let cancelled=false;
   setCustomerOrdersHydrated(false);
   const loadCustomerOrders=async()=>{
     try{
       const d=await api("/api/customer/orders",{headers:{Authorization:"Bearer "+(localStorage.getItem("quickcart_customer_token")||"")}});
       if(cancelled)return;
       const remote=Array.isArray(d.orders)?d.orders.filter(o=>String(o.storeId)===String(storeId)): [];
       let cached=[];
       try{const saved=JSON.parse(localStorage.getItem("qc_customer_orders:"+storeId+":"+email)||"[]");cached=Array.isArray(saved)?saved.filter(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(storeId)):[]}catch{}
       const cachedById=new Map(cached.map(o=>[String(o.id),o]));
       setCustomerOrders(dedupeCustomerOrders(remote.map(o=>({...o,whatsappSent:o.whatsappSent===true||cachedById.get(String(o.id))?.whatsappSent===true||localStorage.getItem("qc_whatsapp_sent:"+String(o.id))==="1",storeName:data?.store?.storeName||"Store"})).slice(0,10)));
     }catch{
       if(cancelled)return;
       try{
         const saved=JSON.parse(localStorage.getItem("qc_customer_orders:"+storeId+":"+email)||"[]");
         const matching=Array.isArray(saved)?saved.filter(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(storeId)): [];
         setCustomerOrders(dedupeCustomerOrders(matching).slice(0,10));
       }catch{setCustomerOrders([])}
     }finally{if(!cancelled)setCustomerOrdersHydrated(true)}
   };
   loadCustomerOrders();
   return()=>{cancelled=true};
 },[data?.store?.id,customer?.email]);

 useEffect(()=>{
   const storeId=data?.store?.id,email=emailOf(customer?.email);
   if(!storeId||!customerOrdersHydrated)return;
   try{
     if(email)localStorage.setItem("qc_customer_orders:"+storeId+":"+email,JSON.stringify(customerOrders.slice(0,10)));
     else localStorage.setItem("qc_guest_orders:"+storeId,JSON.stringify(customerOrders.filter(o=>o?.guestCheckout||!o?.customerEmail).slice(0,10)));
   }catch{}
 },[data?.store?.id,customer?.email,customerOrdersHydrated,customerOrders]);

 const s=data?.store||null,p=Array.isArray(data?.products)?data.products:[],deliveryEnabled=s?s.deliveryEnabled!==false:false;
 const categoryOf=product=>String(product.category||product.categoryName||product.type||"General").trim()||"General";
 const categories=["All",...Array.from(new Set(p.map(categoryOf))).sort((a,b)=>a.localeCompare(b))];
 const visible=p.filter(x=>(activeCategory==="All"||categoryOf(x)===activeCategory)&&(!q||String(x.name||"").toLowerCase().includes(q.trim().toLowerCase()))).sort((a,b)=>sortBy==="price-low"?Number(a.price||0)-Number(b.price||0):sortBy==="price-high"?Number(b.price||0)-Number(a.price||0):sortBy==="name"?String(a.name||"").localeCompare(String(b.name||"")):0);
 const editableOrderLines=customerOrders.filter(o=>["new","confirmed"].includes(o.status)).flatMap(o=>(o.items||[]).map(item=>({...item,orderId:o.id,orderStatus:o.status})));
 const items=p.filter(x=>cart[x.id]).map(x=>({...x,quantity:Math.min(Number(x.stock)||0,Math.max(0,Number(cart[x.id])||0))})).filter(x=>x.quantity>0);
 const subtotal=items.reduce((a,x)=>a+Number(x.price||0)*x.quantity,0);
 const delivery=ful==="delivery"&&deliveryEnabled?Number(s?.deliveryFee||0):0;
 const discount=Number(disc?.amount||0);
 const total=Math.max(0,subtotal+delivery-discount);
 const hasCheckoutItems=items.length>0;
 const cartCount=items.reduce((sum,item)=>sum+item.quantity,0);
 const ready=Boolean(hasCheckoutItems&&ful&&customerForm.name.trim()&&customerForm.phone.trim()&&(ful==="pickup"||customerForm.address.trim())&&s?.vendorPhone);

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
     setCustomerOrders(dedupeCustomerOrders(updates));
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
   if(!ready||busy)return;const checkoutLockKey="quickcart_checkout_lock:"+String(s.id);if(sessionStorage.getItem(checkoutLockKey)==="1")return;sessionStorage.setItem(checkoutLockKey,"1");
   setBusy(true);setMsg("");
   let whatsappWindow=null;
   try{
     // Validate the seller WhatsApp destination before creating an order, so a bad
     // store number cannot leave customers with an order they cannot send to the seller.
     let phoneDigits=String(s.vendorPhone||"").replace(/\D/g,"");
     if(phoneDigits.startsWith("00"))phoneDigits=phoneDigits.slice(2);
     if(phoneDigits.startsWith("0"))phoneDigits="234"+phoneDigits.slice(1);
     else if(phoneDigits.length===10)phoneDigits="234"+phoneDigits;
     if(phoneDigits.length<10||phoneDigits.length>15){
       throw new Error("This store’s WhatsApp number looks invalid. Ask the seller to add a full number with country code in Store settings.");
     }
     // Open synchronously from the button click so mobile browsers do not block WhatsApp later.
     whatsappWindow=window.open("about:blank","_blank");
     if(whatsappWindow)whatsappWindow.opener=null;
     const clientOrderKey="quickcart_checkout_client_id:"+String(s.id);const checkoutFingerprint=JSON.stringify({storeId:s.id,customerEmail:emailOf(customer?.email),customerName:customerForm.name.trim(),customerPhone:customerForm.phone.trim(),address:ful==="delivery"?customerForm.address.trim():"Pickup from store",fulfillment:ful,paymentMethod:pay,discountCode:disc?.code||code.trim(),receiptData,items:items.map(x=>({id:x.id,quantity:x.quantity})).sort((a,b)=>String(a.id).localeCompare(String(b.id)))});let savedCheckout=null;try{savedCheckout=JSON.parse(localStorage.getItem(clientOrderKey)||"null")}catch{}let clientOrderId=savedCheckout&&typeof savedCheckout==="object"&&savedCheckout.fingerprint===checkoutFingerprint?savedCheckout.id:"";if(!clientOrderId){clientOrderId=globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():"qc-"+Date.now()+"-"+Math.random().toString(36).slice(2);}localStorage.setItem(clientOrderKey,JSON.stringify({id:clientOrderId,fingerprint:checkoutFingerprint}));
     const order=await api("/api/orders",{
       method:"POST",
       headers:{Authorization:localStorage.getItem("quickcart_customer_token")?"Bearer "+localStorage.getItem("quickcart_customer_token"):""},
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
       guestCheckout:!customer,
       whatsappSent:false,
       storeName:s.storeName,
       storeId:s.id,
       fulfillment:ful,
       total:Number(order.total??total),
       status:"new",
       createdAt:new Date().toISOString(),
       items:items.map(x=>({id:x.id,name:x.name,price:x.price,quantity:x.quantity}))
     };
     setCustomerOrders(xs=>dedupeCustomerOrders([savedOrder,...xs]).slice(0,10));
     setTrackingVisible(true);

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
     const encodedText=encodeURIComponent(text);
     // Use the short official wa.me click-to-chat URL for WhatsApp and WhatsApp Business.
     // The browser/device chooses the available WhatsApp app or web experience.
     const whatsappUrl="https://wa.me/"+phoneDigits+"?text="+encodedText;
     const fallback={orderId:order.orderId,phone:"+"+phoneDigits,text,url:whatsappUrl};
     setWhatsAppFallback(fallback);
     try{localStorage.setItem("qc_whatsapp_fallback:"+s.id,JSON.stringify(fallback))}catch{}
     if(whatsappWindow&&!whatsappWindow.closed){
       whatsappWindow.location.replace(whatsappUrl);
     }else{
       window.location.assign(whatsappUrl);
     }
     localStorage.removeItem(clientOrderKey);
      // Successful checkout continues directly to WhatsApp; do not show a success toast.
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
    if(updated)setCustomerOrders(xs=>dedupeCustomerOrders(xs.map(o=>o.id===updated.id?{...o,...updated,storeName:s.storeName}:o)));
    // Surface a refreshed stock count on the product cards immediately after a successful server update.
    try{const fresh=await api("/api/storefront/"+encodeURIComponent(s.slug));onStoreRefresh?.(fresh)}catch{}
    try{
      const freshOrders=await api("/api/customer/orders",{headers:{Authorization:"Bearer "+(localStorage.getItem("quickcart_customer_token")||"")}});
      if(Array.isArray(freshOrders.orders))setCustomerOrders(current=>dedupeCustomerOrders(freshOrders.orders.filter(o=>String(o.storeId)===String(s.id)).map(o=>({...o,whatsappSent:current.find(c=>String(c.id)===String(o.id))?.whatsappSent===true,storeName:s.storeName})).slice(0,10)));
    }catch{}
    return {cancelled:!!result.cancelled,order:updated};
  };
 const modifyProductCardOrder=async(order,change)=>{
   if(!order||busy||orderEditBusy)return;
   setOrderEditBusy(order.id);setMsg("");
   try{
     const result=await modifyCustomerOrder(order,change);
     if(!result?.order?.id)throw new Error("The server did not confirm this order update. Refresh and try again.");
     setMsg(result.cancelled?"Order cancelled. Stock has been restored and tracking has been removed.":"Order updated. Product stock and tracking have been updated.");
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
   setCustomerOrders(dedupeCustomerOrders(updates));
 };
 return <main className="public-store-page">
  <div className="public-store-announcement">Welcome to {s.storeName} <span>·</span> Shop directly from this store</div>
  <header className="public-store-nav">
    <div className="public-brand">
      <Logo size={40}/>
      <div><b>{s.storeName}</b><small>{s.tagline||"Your online store"}</small></div>
    </div>
    <div className="public-nav-search">
      <Search size={17}/>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products…" aria-label="Search products"/>
      {q&&<button type="button" onClick={()=>setQ("")} aria-label="Clear search">×</button>}
    </div>
    <div className="public-nav-actions">{customer?<><span className="public-customer-name"><UserRound size={14}/> {customer.name}</span><button className="public-nav-link" type="button" onClick={()=>{setTrackingVisible(true);requestAnimationFrame(()=>document.getElementById("customer-order-tracking")?.scrollIntoView({behavior:"smooth",block:"start"}))}}>My Orders {customerOrders.length>0?<b className="customer-orders-count">{customerOrders.filter(o=>!["cancelled","delivered","picked_up"].includes(o.status)).length}</b>:null}</button><button className="public-nav-link" type="button" onClick={onSignOut}>Sign out</button></>:<button className="public-nav-link public-signin-link" type="button" onClick={()=>onLogin?.("login")}>Sign in</button>}<button className="public-cart-button" type="button" disabled={!cartCount} onClick={()=>document.getElementById("public-checkout")?.scrollIntoView({behavior:"smooth",block:"start"})}><ShoppingBag size={17}/><span>Cart</span><b>{cartCount}</b></button></div>
  </header>
  <section className="public-store-hero">
    <div className="public-store-hero-copy">
      <span className="public-store-kicker">THE OFFICIAL STORE</span>
      <h1>Find something <em>you’ll love.</em></h1>
      <p>{s.tagline||"Explore the collection, choose your favourites and order directly from "+s.storeName+"."}</p>
      <div className="public-hero-proof"><span><Package size={15}/> {p.length} products</span><span><Check size={15}/> Direct seller ordering</span></div>
    </div>
    <div className="public-hero-search-card">
      <span>WHAT ARE YOU LOOKING FOR?</span>
      <div className="public-search">
        <Search size={18}/>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products by name…" aria-label="Search products"/>
        {q&&<button type="button" className="public-search-clear" onClick={()=>setQ("")} aria-label="Clear search">×</button>}
      </div>
      <small>Browse the store’s collection and add your picks to the cart.</small>
    </div>
  </section>
  <nav className="public-category-nav" aria-label="Product categories">{categories.map(category=><button key={category} type="button" className={activeCategory===category?"active":""} onClick={()=>setActiveCategory(category)}>{category}</button>)}</nav>
  <div className="public-store-grid">
   <section className="public-catalog">
    {msg&&<div className={/could not|cannot|invalid|unable|failed|error/i.test(msg)?"form-error public-store-feedback":"form-success public-store-feedback"} role="status" aria-live="polite">{msg}</div>}
    <div className="public-catalog-head">
      <div><span className="eyebrow">THE COLLECTION</span><h2>{activeCategory==="All"?"Shop all products":activeCategory}</h2><p>{visible.length} {visible.length===1?"product":"products"} to explore{q?" · matching “"+q+"”":""}.</p></div>
      <div className="public-catalog-tools">
       <label className="public-sort-control"><span>Sort</span><select value={sortBy} onChange={e=>setSortBy(e.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
       {customerOrdersHydrated&&customerOrders.some(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(s?.id)&&o.status!=="cancelled"&&!(o.fulfillment==="pickup"&&o.status==="picked_up")&&!(()=>{try{return JSON.parse(localStorage.getItem("qc_dismissed_tracking:"+String(s?.id)+":"+emailOf(customer?.email))||"[]").map(String).includes(String(o.id))}catch{return false}})())&&<button type="button" className="ghost-button customer-tracking-toggle" aria-expanded={trackingVisible} aria-controls="customer-order-tracking" onClick={()=>setTrackingVisible(v=>!v)}>{trackingVisible?"Hide order tracking":"Track my orders"} <span aria-hidden="true">{trackingVisible?"−":"+"}</span></button>}
      </div>
    </div>
    {visible.length?<div className="public-product-grid">{visible.map(x=>{
      const stock=Math.max(0,Number(x.stock)||0),qty=Number(cart[x.id]||0),images=Array.isArray(x.imageUrls)&&x.imageUrls.length?x.imageUrls:(x.imageUrl?[x.imageUrl]:[]),usePhotos=x.visualType?x.visualType==="photos":images.length>0;
      return <article className="qc-shop-card" key={x.id}>
       <div className="qc-shop-image">
        {usePhotos&&images.length?<button type="button" className="qc-shop-image-preview" onClick={()=>setExpandedProductImage({images,index:0,name:x.name})} aria-label={"View product photos of "+x.name}><img src={images[0]} alt={x.name}/><span className="qc-shop-image-zoom"><Eye size={15}/> View {images.length>1?images.length+" photos":"image"}</span></button>:<span className="qc-shop-emoji" aria-label={x.name}>{x.emoji||"🛍️"}</span>}
        <span className={"public-stock-pill"+(stock<=0?" is-sold-out":"")}>{stock<=0?"Sold out":stock===1?"1 in stock":stock+" in stock"}</span>
       </div>
       <div className="qc-shop-info">
        <h3>{x.name}</h3><p>{x.description||"Available from this store."}</p>
        <strong className="qc-shop-price">{fmt(x.price)}</strong>
       </div>
       <div className="qc-shop-actions">
        {stock>0?<div className="qc-shop-stepper" aria-label={"Quantity of "+x.name}>
          <button type="button" onClick={()=>updateCart(x.id,Math.max(0,qty-1))} disabled={qty<=0} aria-label={"Decrease "+x.name+" quantity"}>−</button>
          <strong aria-live="polite" aria-atomic="true">{qty}</strong>
          <button type="button" onClick={()=>updateCart(x.id,qty+1)} disabled={qty>=stock} aria-label={"Increase "+x.name+" quantity"}>+</button>
        </div>:<span className="public-sold-out" role="status">Sold out</span>}
       </div>
      </article>
    })}</div>:<Empty title="No products found" text={q?"Nothing matched “"+q+"”. Try a different search.":"This store has no products available yet."}/>}
   </section>
   {(hasCheckoutItems||(customerOrdersHydrated&&customerOrders.some(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(s?.id))))&&<div className="public-cart-tracking-stack">
   {hasCheckoutItems&&(<section id="public-checkout" className="panel public-checkout">
    <div className="checkout-heading"><span className="eyebrow">ORDER SUMMARY</span><h2>{customer?"Complete your order":"Checkout as guest"}</h2><p className="muted">{customer?"One checkout, then continue to WhatsApp.":"No account required. Enter your details and send your order directly to the seller."}</p></div>
    {!customer&&<div className="form-note">Guest checkout is available. Refreshing this page will not remove your order tracking. Your tracking is saved only in this browser on this device; clearing site data, using private browsing, or switching devices/browsers may make it unavailable. Sign in to keep orders linked to your customer account.</div>}
    <>
      {items.map(x=><div className="checkout-line" key={x.id}><span><b>{x.quantity}×</b> {x.name}</span><div><button type="button" aria-label={"Decrease "+x.name+" quantity"} onClick={()=>updateCart(x.id,x.quantity-1)}>−</button><strong>{fmt(x.price*x.quantity)}</strong><button type="button" aria-label={"Add one "+x.name} disabled={x.quantity>=Number(x.stock||0)} onClick={()=>updateCart(x.id,x.quantity+1)}>+</button></div></div>)}
      <div className="choice-block"><b>How would you like to receive your order?</b><div className="choice-grid">{deliveryEnabled&&<button type="button" className={ful==="delivery"?"choice active":"choice"} onClick={()=>setFul("delivery")}><Truck size={15}/> Delivery</button>}<button type="button" className={ful==="pickup"?"choice active":"choice"} onClick={()=>setFul("pickup")}><Store size={15}/> Pickup</button></div>{!deliveryEnabled&&<p className="muted">This seller offers pickup only.</p>}</div>
      <Field label="Your name" value={customerForm.name} onChange={e=>setCustomerForm({...customerForm,name:e.target.value})} placeholder="Full name" autoComplete="name"/>
      {customer&&<Field label="Account email" type="email" value={customer.email||""} readOnly autoComplete="email"/>}
      <PhoneField label="Phone" value={customerForm.phone} onChange={v=>setCustomerForm({...customerForm,phone:v})} required/>
      {ful==="delivery"&&<Field label="Delivery address" value={customerForm.address} onChange={e=>setCustomerForm({...customerForm,address:e.target.value})} placeholder="Full address" autoComplete="street-address"/>}
      <div className="choice-block"><b>Payment</b><div className="choice-grid"><button type="button" className={pay==="pay_on_delivery"?"choice active":"choice"} onClick={()=>setPay("pay_on_delivery")}>Pay on delivery</button><button type="button" className={pay==="bank_transfer"?"choice active":"choice"} onClick={()=>setPay("bank_transfer")}>Bank transfer</button></div>{pay==="bank_transfer"&&<div className="payment-box">{s.paymentQrUrl&&<img src={s.paymentQrUrl} alt="Payment QR"/>}<strong>Transfer details</strong><span>{s.paymentDetails||"Seller has not added transfer instructions yet."}</span></div>}</div>
      <div className="discount-row"><input value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setDisc(null)}} placeholder="Discount code" aria-label="Discount code"/><button type="button" className="ghost-button" disabled={!code.trim()||!items.length} onClick={apply}>Apply</button></div>
      {msg&&<div className={msg.startsWith("Order")?"form-success":"form-error"} role="status">{msg}</div>}
      <CustomerReceiptScanner value={receiptData} onChange={setReceiptData}/>
      <div className="checkout-total"><span>Total</span><strong>{fmt(total)}</strong></div>
      <button className="primary-button big full" disabled={!ready||busy} onClick={checkout}>{busy?"Creating order…":"Continue on WhatsApp"} <MessageCircle size={18}/></button>
      {!s.vendorPhone&&<p className="form-error">This store has not added a WhatsApp number yet.</p>}
    </>
   </section>)}
   {whatsAppFallback&&<section className="panel public-checkout" aria-live="polite"><div className="checkout-heading"><span className="eyebrow">WHATSAPP CHECKOUT</span><h2>Having trouble opening WhatsApp?</h2><p className="muted">Your order is already saved. You can still send it manually using the store number and the ready-made message below.</p></div><div className="form-note"><strong>Store WhatsApp number</strong><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:8}}><code>{whatsAppFallback.phone}</code><button className="ghost-button" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(whatsAppFallback.phone);setMsg("Store WhatsApp number copied.")}catch{setMsg("Copy is unavailable in this browser. Select the number and copy it manually.")}}}><Copy size={15}/> Copy number</button></div></div><div className="form-note"><strong>Order message</strong><textarea readOnly rows={9} value={whatsAppFallback.text} style={{width:"100%",marginTop:8}}/><button className="primary-button" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(whatsAppFallback.text);setMsg("Order message copied. Paste it into the store WhatsApp chat.")}catch{setMsg("Copy is unavailable in this browser. Select the message and copy it manually.")}}}><Copy size={15}/> Copy order message</button></div><div className="checkout-actions"><a className="primary-button" href={whatsAppFallback.url} target="_blank" rel="noreferrer">Open WhatsApp again <MessageCircle size={16}/></a><p className="muted">If the app does not open: open WhatsApp yourself, start a chat with the number above, paste the copied message, and send it. Copying does not mark the order as sent.</p></div></section>}
   {trackingVisible&&customerOrdersHydrated&&customerOrders.some(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(s?.id)&&(()=>{try{return !JSON.parse(localStorage.getItem("qc_dismissed_tracking:"+String(s?.id)+":"+emailOf(customer?.email))||"[]").map(String).includes(String(o.id))}catch{return true}})())&&<CustomerOrderStatus orders={customerOrders.filter(o=>o&&o.id!=null&&o.storeId!=null&&String(o.storeId)===String(s?.id)&&(()=>{try{return !JSON.parse(localStorage.getItem("qc_dismissed_tracking:"+String(s?.id)+":"+emailOf(customer?.email))||"[]").map(String).includes(String(o.id))}catch{return true}})())} onRefresh={refreshOrders} onModifyOrder={modifyCustomerOrder} onWhatsAppSent={(id,result)=>{try{localStorage.setItem("qc_whatsapp_sent:"+String(id),"1")}catch{}setCustomerOrders(xs=>dedupeCustomerOrders(xs.map(o=>String(o.id)===String(id)?{...o,whatsappSent:result?.whatsappSent===true,whatsappSentAt:result?.whatsappSentAt||o.whatsappSentAt,updatedAt:result?.updatedAt||o.updatedAt}:o)))}} onDismissOrder={o=>{const key="qc_dismissed_tracking:"+String(s?.id)+":"+emailOf(customer?.email);try{const ids=JSON.parse(localStorage.getItem(key)||"[]");localStorage.setItem(key,JSON.stringify([...new Set([...ids.map(String),String(o.id)])]))}catch{}setCustomerOrders(xs=>xs.filter(x=>String(x.id)!==String(o.id)))}} />}
   </div>}</div>
 </main>
 {expandedProductImage&&<div className="qc-image-lightbox" role="dialog" aria-modal="true" aria-label={"Product photos: "+expandedProductImage.name} onClick={()=>setExpandedProductImage(null)}>
  <div className="qc-image-lightbox-panel qc-product-gallery-lightbox" onClick={event=>event.stopPropagation()}>
   <button type="button" className="qc-image-lightbox-close" onClick={()=>setExpandedProductImage(null)} aria-label="Close enlarged image"><X size={21}/></button>
   <img src={expandedProductImage.images[expandedProductImage.index]} alt={expandedProductImage.name+" image "+(expandedProductImage.index+1)}/>
   <div className="qc-gallery-controls"><button type="button" onClick={()=>setExpandedProductImage(v=>({...v,index:(v.index-1+v.images.length)%v.images.length}))} disabled={expandedProductImage.images.length<2} aria-label="Previous image">‹</button><p>{expandedProductImage.name} · {expandedProductImage.index+1} / {expandedProductImage.images.length}</p><button type="button" onClick={()=>setExpandedProductImage(v=>({...v,index:(v.index+1)%v.images.length}))} disabled={expandedProductImage.images.length<2} aria-label="Next image">›</button></div>
   {expandedProductImage.images.length>1&&<div className="qc-gallery-thumbnails">{expandedProductImage.images.map((url,index)=><button type="button" key={index} className={index===expandedProductImage.index?"active":""} onClick={()=>setExpandedProductImage(v=>({...v,index}))} aria-label={"Show image "+(index+1)}><img src={url} alt=""/></button>)}</div>}
  </div>
 </div>}
}

export default PublicStore;