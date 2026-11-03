export function registerPaymentRoutes(app,{db,auth,uniquePaymentReference,createAlatPayVirtualAccount,now,PLAN_CONFIG,planFor,planStoreLimit}) {
/* FREE LAUNCH: paid plan checkout is paused. Original ALATPay subscription route preserved below for later reactivation.
app.post('/api/payments/alatpay/plan',auth,async(req,res)=>{try{const database=await db();const plan=String(req.body.plan||'Premium');const plans={Premium:4999,Business:9999};if(!plans[plan])return res.status(400).json({error:'Invalid plan.'});const user=await database.collection('users').findOne({id:req.user.sub});if(!user)return res.status(404).json({error:'User not found.'});const paymentReference=await uniquePaymentReference(database);const paymentId=randomUUID();const paymentContext={id:paymentId,storeName:'AD3N1X',customerName:user.name||'QuickCart Seller',customerEmail:user.email,customerPhone:String(req.body.phone||''),total:plans[plan]};const payment=await createAlatPayVirtualAccount(paymentContext,paymentReference);await database.collection('users').updateOne({id:req.user.sub},{$set:{pendingPlan:plan,pendingPlanPaymentReference:paymentReference,pendingPlanPaymentId:paymentId,pendingPlanPaymentTransactionId:payment.transactionId||payment.id||'',pendingPlanPaymentStatus:'awaiting_transfer',pendingPlanPaymentExpiresAt:payment.expiredAt||null,pendingPlanPaymentUpdatedAt:now()}});res.status(201).json({plan,paymentId,reference:paymentReference,transactionId:payment.transactionId||payment.id||null,accountNumber:payment.virtualBankAccountNumber||null,bankCode:payment.virtualBankCode||null,amount:payment.amount??plans[plan],currency:payment.currency||'NGN',expiresAt:payment.expiredAt||null,status:payment.status||'pending'});}catch(error){console.error(error);res.status(502).json({error:error.message||'Unable to initialize ALATPay plan payment.'});}});
*/
app.post('/api/payments/alatpay',auth,async(req,res)=>{try{const database=await db(),orderId=String(req.body.orderId||'').trim(),order=await database.collection('orders').findOne({id:orderId});if(!order)return res.status(404).json({error:'Order not found.'});const ownerStore=await database.collection('stores').findOne({id:order.storeId,userId:req.user.sub});if(!ownerStore)return res.status(403).json({error:'You are not allowed to initialize payment for this order.'});const payment=await createAlatPayVirtualAccount(order);await database.collection('orders').updateOne({id:order.id},{$set:{paymentProvider:'alatpay',paymentStatus:'awaiting_transfer',paymentTransactionId:payment.transactionId||payment.id||'',paymentReference:payment.orderId||order.id,paymentAccountNumber:payment.virtualBankAccountNumber||'',paymentBankCode:payment.virtualBankCode||'',paymentExpiresAt:payment.expiredAt||null,paymentUpdatedAt:now()}});res.status(201).json({orderId:order.id,transactionId:payment.transactionId||payment.id||null,accountNumber:payment.virtualBankAccountNumber||null,bankCode:payment.virtualBankCode||null,amount:payment.amount??order.total,currency:payment.currency||'NGN',expiresAt:payment.expiredAt||null,status:payment.status||'pending'});}catch(error){console.error(error);res.status(502).json({error:error.message||'Unable to initialize ALATPay payment.'});}});
app.post('/api/payments/alatpay/callback',async(req,res)=>{try{
  const database=await db(),payload=req.body||{},data=payload.data||payload;
  const orderId=String(data.orderId||data.virtualAccount?.orderId||'').trim();
  const transactionId=String(data.transactionId||data.id||data.virtualAccount?.transactionId||'').trim();
  const nipStatus=String(data.nipTransaction?.transactionStatus||'').toLowerCase();
  const status=String(data.status||data.transactionStatus||nipStatus||'').toLowerCase();
   const update={paymentProvider:'alatpay',paymentTransactionId:transactionId,paymentUpdatedAt:now()};
   if(['success','successful','completed','paid','true'].includes(status)){update.paymentStatus='paid';update.status='paid';}
   else if(['failed','failure','cancelled','canceled','expired'].includes(status))update.paymentStatus='failed';
   else if(status)update.paymentStatus=status;
   const pendingUser=await database.collection('users').findOne({$or:[{pendingPlanPaymentId:orderId},{pendingPlanPaymentReference:orderId},{pendingPlanPaymentTransactionId:transactionId}]});
   if(!pendingUser){
     if(orderId)await database.collection('orders').updateOne({$or:[{id:orderId},{paymentReference:orderId}]},{$set:update});
     else if(transactionId)await database.collection('orders').updateOne({paymentTransactionId:transactionId},{$set:update});
   }
   if(update.paymentStatus==='paid'){
     if(pendingUser?.pendingPlan){
       const days=pendingUser.pendingPlan==='Business'?365:30;
       await database.collection('users').updateOne({id:pendingUser.id},{$set:{plan:pendingUser.pendingPlan,subscription:true,planExpiresAt:new Date(Date.now()+days*86400000).toISOString(),planStartedAt:now(),planCancelledAt:null},$unset:{pendingPlan:'',pendingPlanPaymentReference:'',pendingPlanPaymentId:'',pendingPlanPaymentTransactionId:'',pendingPlanPaymentStatus:'',pendingPlanPaymentExpiresAt:'',pendingPlanPaymentUpdatedAt:''}});
     }
   }else if(update.paymentStatus&&['failed','expired','cancelled','canceled'].includes(update.paymentStatus)){
     if(pendingUser)await database.collection('users').updateOne({id:pendingUser.id},{$set:{pendingPlanPaymentStatus:update.paymentStatus},$unset:{pendingPlan:'',pendingPlanPaymentReference:'',pendingPlanPaymentId:'',pendingPlanPaymentTransactionId:'',pendingPlanPaymentExpiresAt:''}});
   }
  res.json({received:true});
}catch(error){console.error(error);res.status(500).json({error:'Unable to process ALATPay callback.'});}});

// Monetization and promotion APIs
app.get('/api/plan',auth,async(req,res)=>{try{const database=await db(),user=await database.collection('users').findOne({id:req.user.sub});if(!user)return res.status(404).json({error:'User not found.'});res.json({plan:'Free',subscription:false,active:true,freeLaunch:true,expiresAt:null,price:0,storeLimit:null,features:PLAN_CONFIG.Free.features});}catch(error){res.status(500).json({error:'Unable to load plan.'});}});
app.post('/api/plan/cancel',auth,async(req,res)=>{try{const database=await db(),result=await database.collection('users').updateOne({id:req.user.sub},{$set:{plan:'Free',subscription:false,planExpiresAt:null,planCancelledAt:now()}});if(!result.matchedCount)return res.status(404).json({error:'User not found.'});res.json({plan:'Free',subscription:false});}catch(error){res.status(500).json({error:'Unable to cancel plan.'});}});
}
