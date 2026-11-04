export function registerPaymentRoutes(app,{db,auth,uniquePaymentReference,createAlatPayVirtualAccount,verifyAlatPayTransaction,now,PLAN_CONFIG,planFor,planStoreLimit}) {
/* FREE LAUNCH: paid plan checkout is paused. Original ALATPay subscription route preserved below for later reactivation.
app.post('/api/payments/alatpay/plan',auth,async(req,res)=>{try{const database=await db();const plan=String(req.body.plan||'Premium');const plans={Premium:4999,Business:9999};if(!plans[plan])return res.status(400).json({error:'Invalid plan.'});const user=await database.collection('users').findOne({id:req.user.sub});if(!user)return res.status(404).json({error:'User not found.'});const paymentReference=await uniquePaymentReference(database);const paymentId=randomUUID();const paymentContext={id:paymentId,storeName:'AD3N1X',customerName:user.name||'QuickCart Seller',customerEmail:user.email,customerPhone:String(req.body.phone||''),total:plans[plan]};const payment=await createAlatPayVirtualAccount(paymentContext,paymentReference);await database.collection('users').updateOne({id:req.user.sub},{$set:{pendingPlan:plan,pendingPlanPaymentReference:paymentReference,pendingPlanPaymentId:paymentId,pendingPlanPaymentTransactionId:payment.transactionId||payment.id||'',pendingPlanPaymentStatus:'awaiting_transfer',pendingPlanPaymentExpiresAt:payment.expiredAt||null,pendingPlanPaymentUpdatedAt:now()}});res.status(201).json({plan,paymentId,reference:paymentReference,transactionId:payment.transactionId||payment.id||null,accountNumber:payment.virtualBankAccountNumber||null,bankCode:payment.virtualBankCode||null,amount:payment.amount??plans[plan],currency:payment.currency||'NGN',expiresAt:payment.expiredAt||null,status:payment.status||'pending'});}catch(error){console.error(error);res.status(502).json({error:error.message||'Unable to initialize ALATPay plan payment.'});}});
*/
app.post('/api/payments/alatpay',auth,async(req,res)=>{try{const database=await db(),orderId=String(req.body.orderId||'').trim(),order=await database.collection('orders').findOne({id:orderId});if(!order)return res.status(404).json({error:'Order not found.'});const ownerStore=await database.collection('stores').findOne({id:order.storeId,userId:req.user.sub});if(!ownerStore)return res.status(403).json({error:'You are not allowed to initialize payment for this order.'});if(order.paymentStatus==='paid')return res.status(409).json({error:'This order has already been paid.'});const payment=await createAlatPayVirtualAccount(order);await database.collection('orders').updateOne({id:order.id,storeId:order.storeId},{$set:{paymentProvider:'alatpay',paymentStatus:'awaiting_transfer',paymentTransactionId:payment.transactionId||payment.id||'',paymentReference:payment.orderId||order.id,paymentAccountNumber:payment.virtualBankAccountNumber||'',paymentBankCode:payment.virtualBankCode||'',paymentExpiresAt:payment.expiredAt||null,paymentUpdatedAt:now()}});res.status(201).json({orderId:order.id,transactionId:payment.transactionId||payment.id||null,accountNumber:payment.virtualBankAccountNumber||null,bankCode:payment.virtualBankCode||null,amount:payment.amount??order.total,currency:payment.currency||'NGN',expiresAt:payment.expiredAt||null,status:payment.status||'pending'});}catch(error){console.error(error);res.status(502).json({error:error.message||'Unable to initialize ALATPay payment.'});}});

// Callback payloads are notifications only. Payment state is changed only after a server-to-server ALATPay lookup.
app.post('/api/payments/alatpay/callback',async(req,res)=>{try{
 const database=await db(),payload=req.body||{},data=payload.data||payload;
 const transactionId=String(data.transactionId||data.id||data.nipTransaction?.transactionId||data.virtualAccount?.transactionId||'').trim();
 const callbackOrderId=String(data.orderId||data.virtualAccount?.orderId||'').trim();
 if(!transactionId)return res.status(400).json({received:false,error:'Transaction ID is required.'});
 const orders=database.collection('orders');
 const order=await orders.findOne({paymentProvider:'alatpay',paymentTransactionId:transactionId});
 if(!order)return res.status(202).json({received:true,verified:false});
 const verified=await verifyAlatPayTransaction(transactionId);
 const verifiedOrderId=String(verified.orderId||verified.virtualAccount?.orderId||'').trim();
 const expectedReference=String(order.paymentReference||order.id);
 const verifiedAmount=Number(verified.amount);
 const expectedAmount=Number(order.total);
 const amountSent=verified.amountSent==null?null:Number(verified.amountSent);
 const currency=String(verified.currency||verified.virtualAccount?.currency||'').toUpperCase();
 if(verifiedOrderId!==expectedReference||verifiedOrderId!==order.id&&verifiedOrderId!==expectedReference||
    callbackOrderId&&callbackOrderId!==verifiedOrderId||
    !Number.isFinite(verifiedAmount)||Math.abs(verifiedAmount-expectedAmount)>0.01||
    amountSent!==null&&(!Number.isFinite(amountSent)||Math.abs(amountSent-expectedAmount)>0.01)||
    currency!=='NGN'||verified.isAmountDiscrepant===true){
   console.warn('ALATPay callback rejected: verified transaction does not match the stored order.');
   return res.status(202).json({received:true,verified:false});
 }
 const status=String(verified.status||verified.nipTransaction?.transactionStatus||'').trim().toLowerCase();
 const successful=['success','successful','completed','paid'];
 const unsuccessful=['failed','failure','cancelled','canceled','expired'];
 if(successful.includes(status)){
  await orders.updateOne({id:order.id,storeId:order.storeId,paymentTransactionId:transactionId,paymentStatus:{$ne:'paid'}},{$set:{paymentStatus:'paid',paymentVerifiedAt:now(),paymentUpdatedAt:now(),paymentProviderStatus:status}});
 }else if(unsuccessful.includes(status)){
  await orders.updateOne({id:order.id,storeId:order.storeId,paymentTransactionId:transactionId,paymentStatus:{$ne:'paid'}},{$set:{paymentStatus:status==='expired'?'expired':'failed',paymentUpdatedAt:now(),paymentProviderStatus:status}});
 }
 res.json({received:true,verified:true});
}catch(error){console.error('ALATPay callback verification failed:',error?.message||error);res.status(502).json({received:false,error:'Unable to verify ALATPay transaction. Please retry.'});}});

// Monetization and promotion APIs
app.get('/api/plan',auth,async(req,res)=>{try{const database=await db(),user=await database.collection('users').findOne({id:req.user.sub});if(!user)return res.status(404).json({error:'User not found.'});res.json({plan:'Free',subscription:false,active:true,freeLaunch:true,expiresAt:null,price:0,storeLimit:null,features:PLAN_CONFIG.Free.features});}catch(error){res.status(500).json({error:'Unable to load plan.'});}});
app.post('/api/plan/cancel',auth,async(req,res)=>{try{const database=await db(),result=await database.collection('users').updateOne({id:req.user.sub},{$set:{plan:'Free',subscription:false,planExpiresAt:null,planCancelledAt:now()}});if(!result.matchedCount)return res.status(404).json({error:'User not found.'});res.json({plan:'Free',subscription:false});}catch(error){res.status(500).json({error:'Unable to cancel plan.'});}});
}
