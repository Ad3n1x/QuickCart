export function createPaymentServices({secretKey,businessId,baseUrl="https://apibox.alatpay.ng/bank-transfer"}) {
 const alatPaySecretKey=secretKey,alatPayBusinessId=businessId,alatPayBaseUrl=baseUrl;
 function makePaymentReference(){return Math.random().toString(36).slice(2,7).toUpperCase().padEnd(5,'X').slice(0,5);}
 async function uniquePaymentReference(database){for(let i=0;i<20;i++){const reference=makePaymentReference();if(!await database.collection('users').findOne({$or:[{pendingPlanPaymentReference:reference},{pendingPlanPaymentTransactionId:reference}]}))return reference;}throw new Error('Could not create a unique payment reference.');}

 async function createAlatPayVirtualAccount(order,providerOrderId=order.id) {
  if (!alatPaySecretKey) throw new Error('ALATPAY_SECRET_KEY is not configured.');
  if (!alatPayBusinessId) throw new Error('ALATPAY_BUSINESS_ID is not configured.');
  const response = await fetch(`${alatPayBaseUrl}/api/v1/bankTransfer/virtualAccount`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': alatPaySecretKey },
    body: JSON.stringify({ businessId: alatPayBusinessId, businessName: 'AD3N1X', amount: Number(order.total), currency: 'NGN', orderId: providerOrderId, description: `QuickCart ${order.storeId?'order':'subscription payment'} ${providerOrderId}`, channel: 'WEB', customer: { email: String(order.customerEmail || ''), phone: String(order.customerPhone || ''), firstName: String(order.customerName || 'Customer').split(' ')[0], lastName: String(order.customerName || '').split(' ').slice(1).join(' ') || 'Customer', metadata: JSON.stringify(order.storeId ? { quickCartOrderId: order.id, storeId: order.storeId, paymentReference: providerOrderId } : { quickCartPaymentType: 'subscription', paymentReference: providerOrderId }) } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === false) throw new Error(data.message || 'ALATPay payment initialization failed.');
  return data.data || data;
 }

 // Never trust callback status fields: fetch the transaction directly from ALATPay.
 async function verifyAlatPayTransaction(transactionId) {
  if (!alatPaySecretKey || !alatPayBusinessId) throw new Error('ALATPay credentials are not configured.');
  if (!transactionId) throw new Error('ALATPay transaction ID is required.');
  const response = await fetch(`${alatPayBaseUrl}/api/v1/bankTransfer/transactions/${encodeURIComponent(transactionId)}`, {
   method: 'GET',
   headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': alatPaySecretKey }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status === false || !payload.data) throw new Error(payload.message || 'Unable to verify ALATPay transaction.');
  const transaction = payload.data;
  const returnedTransactionId = String(transaction.transactionId || transaction.id || transaction.nipTransaction?.transactionId || '').trim();
  if (returnedTransactionId !== transactionId) throw new Error('ALATPay returned a different transaction ID.');
  if (String(transaction.businessId || transaction.virtualAccount?.businessId || '') !== String(alatPayBusinessId)) throw new Error('ALATPay transaction belongs to a different business.');
  return transaction;
 }
 return { makePaymentReference, uniquePaymentReference, createAlatPayVirtualAccount, verifyAlatPayTransaction };
}
