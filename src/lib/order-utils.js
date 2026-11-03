// Pure order helpers used by customer tracking, receipts and seller views.
export function orderDisplayTotal(order){
  if(!order)return 0;
  const stored=Number(order.total);
  if(Number.isFinite(stored)&&stored>0)return stored;
  const subtotal=Number(order.subtotal);
  if(Number.isFinite(subtotal)&&subtotal>0)return Math.max(0,subtotal+Number(order.deliveryFee||0)-Number(order.discount||0));
  const itemTotal=(Array.isArray(order.items)?order.items:[]).reduce((sum,item)=>sum+Math.max(0,Number(item.price)||0)*Math.max(0,Number(item.quantity)||0),0);
  return itemTotal>0?Math.max(0,itemTotal+Number(order.deliveryFee||0)-Number(order.discount||0)):Math.max(0,Number.isFinite(stored)?stored:0);
}

export function dedupeCustomerOrders(list){
 const seenIds=new Set(),seenClientIds=new Set(),recentFingerprints=new Map();
 return (Array.isArray(list)?list:[]).filter(order=>{
  if(!order||order.id==null)return false;
  // Never render malformed/empty order records as customer orders or receipts.
  if(!Array.isArray(order.items)||order.items.length===0)return false;
  const id=String(order.id);
  if(seenIds.has(id))return false;
  const storeId=String(order.storeId||""),clientOrderId=String(order.clientOrderId||"").trim();
  const clientKey=clientOrderId?storeId+":"+clientOrderId:"";
  if(clientKey&&seenClientIds.has(clientKey))return false;
  const items=(Array.isArray(order.items)?order.items:[]).map(item=>({id:String(item.id??item.productId??item.name??""),quantity:Number(item.quantity)||1})).sort((a,b)=>a.id.localeCompare(b.id)||a.quantity-b.quantity);
  const fingerprint=JSON.stringify({storeId,email:String(order.customerEmail||"").trim().toLowerCase(),fulfillment:order.fulfillment||"pickup",total:Number(order.total)||0,items});
  const created=Date.parse(order.createdAt||order.updatedAt||"");
  const previous=recentFingerprints.get(fingerprint);
  // Hide accidental double submissions created within a few seconds, without merging later repeat purchases.
  if(Number.isFinite(created)&&previous!=null&&Math.abs(created-previous)<=5000)return false;
  seenIds.add(id);
  if(clientKey)seenClientIds.add(clientKey);
  if(Number.isFinite(created))recentFingerprints.set(fingerprint,created);
  return true;
});
}
