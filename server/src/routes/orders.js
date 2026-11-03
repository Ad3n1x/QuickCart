export function registerOrderRoutes(app,{db,auth,customerAuth,customerTokenFor,now,randomUUID,randomBytes,hashToken,getUserStore,jwt,jwtSecret,emailPattern}) {
app.post('/api/orders',async(req,res)=>{try{
 const database=await db();
 const customerAuthHeader=String(req.headers.authorization||'').trim();
 const hasBearer=customerAuthHeader.toLowerCase().startsWith('bearer ');
 const customerToken=hasBearer?customerAuthHeader.slice(7).trim():'';
 let customerPayload=null;
 if(customerToken){
  try{const payload=jwt.verify(customerToken,jwtSecret);if(payload?.role==='customer'&&payload?.sub&&emailPattern.test(String(payload.email||'')))customerPayload=payload;}catch{}
  if(!customerPayload)return res.status(401).json({error:'Your customer session is invalid. Sign in again or continue as a guest.',code:'INVALID_CUSTOMER_SESSION'});
 }
 const storeId=String(req.body.storeId||'').trim();
 const requested=Array.isArray(req.body.items)?req.body.items:[];
 const clientOrderId=String(req.body.clientOrderId||'').trim();
 const customerName=String(req.body.customerName||'').trim();
 const customerPhone=String(req.body.customerPhone||'').trim();
 const suppliedEmail=String(req.body.customerEmail||'').trim().toLowerCase();
 const customerEmail=customerPayload?String(customerPayload.email||'').trim().toLowerCase():(emailPattern.test(suppliedEmail)?suppliedEmail:'');
 const address=String(req.body.address||'').trim();
 const fulfillment=String(req.body.fulfillment||'pickup');
 const discountCode=String(req.body.discountCode||'').trim().toUpperCase();
 if(!storeId||!customerName||!customerPhone||!requested.length)return res.status(400).json({error:'Store, customer name, phone number and at least one item are required.'});
 if(customerPhone.replace(/\D/g,'').length<7)return res.status(400).json({error:'Enter a valid customer phone number.'});
 if(clientOrderId){
  const existing=await database.collection('orders').findOne({storeId,clientOrderId,customerEmail});
  if(existing){
   const replayToken=hashToken(clientOrderId+String(jwtSecret||''));
   res.status(200).json({orderId:existing.id,subtotal:existing.subtotal,deliveryFee:existing.deliveryFee,discount:existing.discount,total:existing.total,confirmationToken:replayToken,replayed:true});
   return;
  }
 }
 const store=await database.collection('stores').findOne({id:storeId});
 if(!store)return res.status(404).json({error:'Store not found.'});
 const deliveryEnabled=store.deliveryEnabled!==false;
 if(!['pickup','delivery'].includes(fulfillment))return res.status(400).json({error:'Invalid fulfilment option.'});
 if(fulfillment==='delivery'&&!deliveryEnabled)return res.status(400).json({error:'This store does not offer delivery.'});
 if(fulfillment==='delivery'&&!address)return res.status(400).json({error:'Delivery address is required.'});
 const productIds=requested.map(item=>String(item.id||'')).filter(Boolean);
 const products=await database.collection('products').find({storeId,active:true,id:{$in:productIds}}).toArray();
 const byId=new Map(products.map(product=>[product.id,product]));
 const items=[];
 for(const raw of requested){
  const product=byId.get(String(raw.id||'')),quantity=Number(raw.quantity);
  if(!product||!Number.isInteger(quantity)||quantity<1)return res.status(400).json({error:'One of the selected products is no longer available.'});
  if(Number(product.stock)<quantity)return res.status(409).json({error:product.name+' does not have enough stock.'});
  items.push({id:product.id,name:product.name,price:Number(product.price||0),quantity});
 }
 const subtotal=Math.round(items.reduce((sum,item)=>sum+item.price*item.quantity,0)*100)/100;
 const deliveryFee=fulfillment==='delivery'&&deliveryEnabled?Math.max(0,Number(store.deliveryFee||0)):0;
 let discount=0,discountDetails=null;
 if(discountCode){
  const record=await database.collection('discounts').findOne({storeId,code:discountCode,active:true});
  if(!record)return res.status(400).json({error:'Invalid discount code.'});
  if(record.expiresAt&&new Date(record.expiresAt)<=new Date())return res.status(400).json({error:'Discount has expired.'});
  discount=record.type==='percent'?subtotal*(Number(record.value)/100):Math.min(subtotal,Number(record.value)||0);
  discount=Math.round(discount*100)/100;
  discountDetails={code:record.code,type:record.type,value:record.value};
 }
 const total=Math.max(0,Math.round((subtotal+deliveryFee-discount)*100)/100);
 const confirmationToken=clientOrderId?hashToken(clientOrderId+String(jwtSecret||'')):randomBytes(24).toString('hex');
 const order={id:randomUUID(),storeId,clientOrderId:clientOrderId||null,customerId:customerPayload?.sub||null,customerEmail,customerName,customerPhone,address,fulfillment,paymentMethod:String(req.body.paymentMethod||'pay_on_delivery'),items,subtotal,deliveryFee,discount,discountCode:discountDetails?.code||'',discountDetails,total,status:'new',paymentStatus:'pending',receiptData:req.body.receiptData&&typeof req.body.receiptData==='object'?{merchant:String(req.body.receiptData.merchant||''),date:String(req.body.receiptData.date||''),total:String(req.body.receiptData.total||''),tax:String(req.body.receiptData.tax||''),receiptNo:String(req.body.receiptData.receiptNo||'')}:null,customerConfirmationTokenHash:hashToken(confirmationToken),customerConfirmedAt:null,guestCheckout:!customerPayload,createdAt:now()};
 const changed=[];
 try{
  for(const item of items){
   const result=await database.collection('products').updateOne({id:item.id,storeId,active:true,stock:{$gte:item.quantity}},{$inc:{stock:-item.quantity}});
   if(!result.modifiedCount)throw Object.assign(new Error(item.name+' does not have enough stock.'),{status:409});
   changed.push(item);
  }
  await database.collection('orders').insertOne(order);
 }catch(error){
  for(const item of changed)await database.collection('products').updateOne({id:item.id,storeId},{$inc:{stock:item.quantity}});
  if(error?.status===409)return res.status(409).json({error:error.message});
  if(error?.code===11000&&clientOrderId){
   const existing=await database.collection('orders').findOne({storeId,clientOrderId,customerEmail});
   if(existing){res.status(200).json({orderId:existing.id,subtotal:existing.subtotal,deliveryFee:existing.deliveryFee,discount:existing.discount,total:existing.total,confirmationToken:hashToken(clientOrderId+String(jwtSecret||'')),replayed:true});return;}
  }
  throw error;
 }
 if(customerEmail){
  await database.collection('customers').updateOne({storeId,customerEmail},{$set:{storeId,customerId:customerPayload?.sub||null,customerEmail,name:customerName,phone:customerPhone,address,updatedAt:now()},$setOnInsert:{createdAt:now()}},{upsert:true});
 }else{
  await database.collection('customers').updateOne({storeId,phone:customerPhone},{$set:{storeId,name:customerName,phone:customerPhone,address,updatedAt:now()},$setOnInsert:{createdAt:now()}},{upsert:true});
 }
 res.status(201).json({orderId:order.id,subtotal,deliveryFee,discount,total,confirmationToken,guestCheckout:!customerPayload});
}catch(error){console.error(error);res.status(500).json({error:'Unable to create order.'});}});

app.post('/api/orders/:id/customer-update',async(req,res)=>{try{
  const database=await db(),orders=database.collection('orders'),confirmationToken=String(req.body?.confirmationToken||''),action=String(req.body?.action||'');
  const order=await orders.findOne({id:req.params.id});
  if(!order)return res.status(404).json({error:'Order not found.'});
  // Accept the original per-order secret, or a verified customer session for the same email.
  // This lets customers recover after browser storage was cleared without weakening order ownership.
  let authorized=Boolean(confirmationToken&&order.customerConfirmationTokenHash&&hashToken(confirmationToken)===order.customerConfirmationTokenHash);
  if(!authorized){
    const header=String(req.headers.authorization||''),bearer=header.startsWith('Bearer ')?header.slice(7).trim():'';
    if(bearer){
      try{
        const payload=jwt.verify(bearer,jwtSecret);
        authorized=payload?.role==='customer'&&Boolean(payload?.sub)&&String(payload?.email||'').trim().toLowerCase()===String(order.customerEmail||'').trim().toLowerCase();
      }catch{}
    }
  }
  if(!authorized)return res.status(403).json({error:'Please sign in with the customer account used to place this order, or use the original order confirmation token.'});
  if(!['new','confirmed'].includes(order.status))return res.status(409).json({error:'This order can no longer be changed because the seller has started processing it.'});
  const eligible={id:order.id,status:{$in:['new','confirmed']},items:order.items};
  if(action==='cancel'){
    const updatedAt=now(),result=await orders.updateOne(eligible,{$set:{status:'cancelled',updatedAt}});
    if(!result.modifiedCount)return res.status(409).json({error:'This order changed elsewhere. Refresh tracking and try again.'});
    for(const item of order.items||[])await database.collection('products').updateOne({id:item.id,storeId:order.storeId},{$inc:{stock:Math.max(0,Number(item.quantity)||0)}});
    const updated=await orders.findOne({id:order.id});
    return res.json({cancelled:true,order:{id:updated.id,storeId:updated.storeId,items:updated.items,total:updated.total,status:updated.status,fulfillment:updated.fulfillment,updatedAt:updated.updatedAt,createdAt:updated.createdAt,customerName:updated.customerName,customerEmail:updated.customerEmail,customerPhone:updated.customerPhone,address:updated.address,paymentMethod:updated.paymentMethod,receiptData:updated.receiptData}});
  }
  if(!['reduce','increase'].includes(action))return res.status(400).json({error:'Unsupported order change.'});
  const itemId=String(req.body?.itemId||''),item=(order.items||[]).find(x=>String(x.id)===itemId);
  if(!item)return res.status(404).json({error:'That item is not part of this order.'});
  const items=order.items.map(x=>({...x}));
  const target=items.find(x=>String(x.id)===itemId);
  const products=database.collection('products');
  if(action==='reduce'&&Number(target.quantity)<=1)return res.status(400).json({error:'Each item must stay at quantity 1 or more. Cancel the whole order if you no longer need it.'});
  if(action==='increase'){
    const stockResult=await products.updateOne({id:item.id,storeId:order.storeId,stock:{$gt:0}},{$inc:{stock:-1}});
    if(!stockResult.modifiedCount)return res.status(409).json({error:'This item is out of stock. Refresh the store and try again.'});
    target.quantity=Number(target.quantity)+1;
  }else{
    target.quantity=Number(target.quantity)-1;
  }
  const subtotal=items.reduce((sum,x)=>sum+Number(x.price||0)*Number(x.quantity||0),0);
  let discount=0;
  if(order.discountDetails?.type==='percent')discount=Math.round(subtotal*(Number(order.discountDetails.value||0)/100)*100)/100;
  else if(order.discountDetails?.type==='fixed')discount=Math.min(subtotal,Number(order.discountDetails.value||0));
  else discount=Math.min(subtotal,Number(order.discount||0));
  const total=Math.max(0,Math.round((subtotal+Number(order.deliveryFee||0)-discount)*100)/100);
  const updatedAt=now(),result=await orders.updateOne(eligible,{$set:{items,subtotal,discount,total,updatedAt}});
  if(!result.modifiedCount){
    if(action==='increase')await products.updateOne({id:item.id,storeId:order.storeId},{$inc:{stock:1}});
    return res.status(409).json({error:'This order changed elsewhere. Refresh tracking and try again.'});
  }
  if(action==='reduce')await products.updateOne({id:item.id,storeId:order.storeId},{$inc:{stock:1}});
  const updated=await orders.findOne({id:order.id});
  return res.json({cancelled:false,order:{id:updated.id,storeId:updated.storeId,items:updated.items,total:updated.total,subtotal:updated.subtotal,discount:updated.discount,status:updated.status,fulfillment:updated.fulfillment,updatedAt:updated.updatedAt,createdAt:updated.createdAt,customerName:updated.customerName,customerEmail:updated.customerEmail,customerPhone:updated.customerPhone,address:updated.address,paymentMethod:updated.paymentMethod,receiptData:updated.receiptData}});
}catch(error){console.error(error);res.status(500).json({error:'Unable to update this order.'});}});
app.post('/api/orders/:id/customer-confirm',async(req,res)=>{try{const database=await db(),orders=database.collection('orders');const order=await orders.findOne({id:req.params.id});if(!order)return res.status(404).json({error:'Order not found.'});if(!req.body?.confirmationToken||hashToken(String(req.body.confirmationToken))!==order.customerConfirmationTokenHash)return res.status(403).json({error:'Invalid customer confirmation.'});const target=order.fulfillment==='pickup'?'picked_up':'delivered';if(['cancelled','picked_up','delivered'].includes(order.status))return res.status(400).json({error:'This order has already been completed or cancelled.'});if(order.fulfillment==='pickup'&&order.status!=='ready')return res.status(400).json({error:'The seller must mark this pickup as ready before you can confirm it.'});if(order.fulfillment==='delivery'&&order.status!=='shipped')return res.status(400).json({error:'The seller must mark this order as shipped before you can confirm delivery.'});await orders.updateOne({id:order.id},{$set:{status:target,customerConfirmedAt:now(),updatedAt:now()}});res.json({confirmed:true,status:target,updatedAt:now()});}catch(error){console.error(error);res.status(500).json({error:'Unable to confirm the order.'});}});
app.post('/api/orders/:id/customer-status',async(req,res)=>{try{const database=await db(),order=await database.collection('orders').findOne({id:req.params.id});if(!order)return res.status(404).json({error:'Order not found.'});if(!req.body?.confirmationToken||hashToken(String(req.body.confirmationToken))!==order.customerConfirmationTokenHash)return res.status(403).json({error:'Invalid customer confirmation token.'});res.json({orderId:order.id,status:order.status,fulfillment:order.fulfillment,total:order.total,updatedAt:order.updatedAt||order.createdAt});}catch(error){console.error(error);res.status(500).json({error:'Unable to retrieve order status.'});}});

app.get('/api/customer/orders',customerAuth,async(req,res)=>{try{const database=await db(),email=String(req.customer.email||'').trim().toLowerCase();if(!emailPattern.test(email))return res.status(401).json({error:'Customer email is missing from this session.',code:'INVALID_CUSTOMER_EMAIL'});const orders=await database.collection('orders').find({customerEmail:email},{projection:{customerConfirmationTokenHash:0}}).sort({createdAt:-1}).limit(100).toArray();res.json({orders});}catch(error){console.error(error);res.status(500).json({error:'Unable to load customer order history.'});}});
// Seller-created orders: useful for phone, walk-in, Instagram and WhatsApp sales.
app.post('/api/orders/manual',auth,async(req,res)=>{try{
 const database=await db(),store=await getUserStore(database,req);
 if(!store)return res.status(404).json({error:'Store not found.'});
 const customerName=String(req.body.customerName||'').trim(),customerPhone=String(req.body.customerPhone||'').trim(),customerEmail=String(req.body.customerEmail||'').trim().toLowerCase(),address=String(req.body.address||'').trim(),fulfillment=String(req.body.fulfillment||'pickup');
 const rawItems=Array.isArray(req.body.items)?req.body.items:[];
 if(!customerName||!customerPhone||!rawItems.length)return res.status(400).json({error:'Customer name, WhatsApp number and at least one item are required.'});
 if(!['pickup','delivery'].includes(fulfillment))return res.status(400).json({error:'Choose pickup or delivery.'});
 if(fulfillment==='delivery'&&!address)return res.status(400).json({error:'Enter the delivery address.'});
 const items=rawItems.map(x=>({id:String(x.id||''),name:String(x.name||'').trim(),price:Number(x.price),quantity:Number(x.quantity)}));
 if(items.some(x=>!x.name||!Number.isFinite(x.price)||x.price<0||!Number.isInteger(x.quantity)||x.quantity<1))return res.status(400).json({error:'Each item needs a name, valid price and quantity of at least one.'});
 const subtotal=Math.round(items.reduce((sum,x)=>sum+x.price*x.quantity,0)*100)/100;
 const deliveryFee=fulfillment==='delivery'?Math.max(0,Number(store.deliveryFee||0)):0;
 const total=Math.round((subtotal+deliveryFee)*100)/100;
 const order={id:randomUUID(),storeId:store.id,clientOrderId:null,source:'manual',customerId:null,customerEmail,customerName,customerPhone,address:address||'Pickup from store',fulfillment,paymentMethod:String(req.body.paymentMethod||'pay_on_delivery'),items,subtotal,deliveryFee,discount:0,discountCode:'',discountDetails:null,total,status:'new',paymentStatus:'pending',createdAt:now(),updatedAt:now()};
 await database.collection('orders').insertOne(order);
 if(customerEmail&&emailPattern.test(customerEmail))await database.collection('customers').updateOne({storeId:store.id,customerEmail},{$set:{storeId:store.id,customerEmail,name:customerName,phone:customerPhone,address,updatedAt:now()},$setOnInsert:{createdAt:now()}},{upsert:true});
 res.status(201).json({order});
 }catch(error){console.error(error);res.status(500).json({error:'Unable to create manual order.'});}});
app.get('/api/orders',auth,async(req,res)=>{const database=await db(),store=await getUserStore(database,req);if(!store)return res.json({orders:[]});res.json({orders:await database.collection('orders').find({storeId:store.id}).sort({createdAt:-1}).toArray()});});
app.delete('/api/orders/:id',auth,async(req,res)=>{try{const database=await db(),store=await getUserStore(database,req);if(!store)return res.status(404).json({error:'Store not found.'});const result=await database.collection('orders').deleteOne({id:req.params.id,storeId:store.id});if(!result.deletedCount)return res.status(404).json({error:'Order not found.'});res.json({deleted:true,orderId:req.params.id});}catch(error){console.error(error);res.status(500).json({error:'Unable to delete order.'});}});
app.put('/api/orders/:id/status',auth,async(req,res)=>{try{
 const allowed=['new','confirmed','processing','ready','shipped','delivered','cancelled'],status=String(req.body.status||'');
 if(!allowed.includes(status))return res.status(400).json({error:'Invalid order status.'});
 const database=await db(),store=await getUserStore(database,req);
 if(!store)return res.status(404).json({error:'Store not found.'});
 const orders=database.collection('orders'),current=await orders.findOne({id:req.params.id,storeId:store.id});
 if(!current)return res.status(404).json({error:'Order not found.'});
 if(current.status===status)return res.json({status});
 if(current.status==='cancelled')return res.status(409).json({error:'Cancelled orders cannot be reopened. Create a new order instead.'});
 if(status==='cancelled'&&['shipped','delivered','picked_up'].includes(current.status))return res.status(409).json({error:'This order has already been dispatched or completed and cannot be cancelled.'});
 const nextStatuses={new:['confirmed','cancelled'],confirmed:['processing','cancelled'],processing:current.fulfillment==='delivery'?['shipped','cancelled']:['ready','cancelled'],ready:['cancelled'],shipped:['delivered'],delivered:[],picked_up:[],cancelled:[]};
 if(!nextStatuses[current.status]?.includes(status))return res.status(409).json({error:'That status change is not allowed for this order. Refresh the order and choose the next available step.'});
 const result=await orders.updateOne({id:current.id,storeId:store.id,status:current.status},{$set:{status,updatedAt:now()}});
 if(!result.modifiedCount)return res.status(409).json({error:'This order changed elsewhere. Refresh and try again.'});
 if(status==='cancelled'&&!['cancelled','delivered','picked_up'].includes(current.status)){
   for(const item of current.items||[])await database.collection('products').updateOne({id:item.id,storeId:store.id},{$inc:{stock:Math.max(0,Number(item.quantity)||0)}});
 }
 res.json({status});
}catch(error){console.error(error);res.status(500).json({error:'Unable to update order status.'});}});
}
