import { fmt } from "./format.js";
import { orderDisplayTotal } from "./order-utils.js";

export function escapePrintHtml(value){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

export function printReceiptDocument(order,store){
  if(!order)return;
  const popup=window.open("","_blank","width=520,height=760");
  if(!popup){window.alert("Please allow pop-ups to print the receipt.");return}
  const items=Array.isArray(order.items)?order.items:[];
  const rows=items.map(x=>`<div class="row"><span>${escapePrintHtml(x.quantity||1)}× ${escapePrintHtml(x.name||"Item")}</span><b>${escapePrintHtml(fmt(Number(x.price||0)*Number(x.quantity||1)))}</b></div>`).join("");
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapePrintHtml(String(order.id||"").slice(0,12))}</title><style>
  @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#15221c;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}.receipt{width:186mm;max-width:100%;margin:0 auto}.brand{display:flex;gap:9px;align-items:center;padding-bottom:12px;border-bottom:1px dashed #999}.brand strong,.brand small{display:block}.brand small{color:#68736e;font-size:10px;margin-top:2px}.meta,.customer{display:grid;gap:4px;padding:11px 0;border-bottom:1px dashed #999;font-size:10px}.meta{display:flex;justify-content:space-between;gap:8px}.customer strong{font-size:11px}.row{display:flex;justify-content:space-between;gap:10px;padding:6px 0;font-size:10px}.total{display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #15221c;font-size:14px}.foot{text-align:center;padding-top:10px;border-top:1px dashed #999;color:#68736e;font-size:9px;line-height:1.5}
  </style></head><body><main class="receipt"><div class="brand"><div><strong>${escapePrintHtml(store?.storeName||"QuickCart Store")}</strong><small>${escapePrintHtml(store?.tagline||"Thank you for your order")}</small></div></div><div class="meta"><span>Receipt #${escapePrintHtml(String(order.id||"").slice(0,12))}</span><span>${escapePrintHtml(order.createdAt?new Date(order.createdAt).toLocaleString():"—")}</span></div><div class="customer"><strong>${escapePrintHtml(order.customerName||"Customer")}</strong><span>${escapePrintHtml(order.customerPhone||"")}</span><span>${escapePrintHtml(order.address||"—")}</span></div><div>${rows}</div><div class="total"><span>Total</span><b>${escapePrintHtml(fmt(orderDisplayTotal(order)))}</b></div><div class="foot">Payment: ${escapePrintHtml(String(order.paymentMethod||"Pay on delivery").replaceAll("_"," "))}<br>Status: ${escapePrintHtml(order.status||"new")}<br><br>Powered by QuickCart</div></main><script>window.addEventListener("load",()=>{setTimeout(()=>{window.focus();window.print()},120)});window.addEventListener("afterprint",()=>window.close());<\/script></body></html>`;
  popup.document.open();popup.document.write(html);popup.document.close();
}
