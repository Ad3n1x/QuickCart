export function createVerificationEmailSender({apiKey,fromEmail,fromName="QuickCart"}) {
 const brevoApiKey=apiKey,brevoFromEmail=fromEmail,brevoFromName=fromName;
 async function sendVerificationEmail(email,name,otp){
 if(!brevoApiKey) throw new Error('BREVO_API_KEY is not configured.');
 if(!brevoFromEmail) throw new Error('BREVO_FROM_EMAIL is not configured.');
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','api-key':brevoApiKey,'content-type':'application/json'},body:JSON.stringify({sender:{name:brevoFromName,email:brevoFromEmail},to:[{email,name}],subject:'Your QuickCart verification code',textContent:`Hi ${name||'there'}, your QuickCart verification code is ${otp}. It expires in 10 minutes.`,htmlContent:`<html><body style="font-family:Arial,sans-serif;background:#f5f8f6;padding:30px"><div style="max-width:520px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1>Welcome to QuickCart 👋</h1><p>Hi ${name||'there'},</p><p>Use this code to verify your email:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef5f1;padding:18px;text-align:center;border-radius:12px">${otp}</div><p>This code expires in 10 minutes.</p></div></body></html>`})});
 const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||'Unable to send verification email.'); return data;
}
 return sendVerificationEmail;
}


const escapeEmailHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

export function createOrderUpdateEmailSender({apiKey,fromEmail,fromName="QuickCart"}) {
 return async function sendOrderUpdateEmail(order,storeName="QuickCart Store") {
  const email=String(order?.customerEmail||"").trim().toLowerCase();
  if(!email||!/^\S+@\S+\.\S+$/.test(email))return {skipped:true,reason:"Customer email unavailable"};
  if(!apiKey||!fromEmail)throw new Error("Brevo email settings are not configured.");
  const status=String(order.status||"updated").toLowerCase();
  const labels={new:"Order received",confirmed:"Order confirmed",processing:"Order being prepared",ready:"Order ready for pickup",shipped:"Order dispatched",delivered:"Order delivered",picked_up:"Pickup completed",cancelled:"Order cancelled"};
  const title=labels[status]||"Order update";
  const reference=escapeEmailHtml(String(order.orderNumber||order.id||"").slice(0,24));
  const safeStore=escapeEmailHtml(storeName||"QuickCart Store");
  const safeTitle=escapeEmailHtml(title);
  const total=Number(order.total||0);
  const formattedTotal=Number.isFinite(total)?new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:2}).format(total):"";
  const textContent=[title,"",`Store: ${storeName||"QuickCart Store"}`,`Order: ${order.orderNumber||order.id||"—"}`,formattedTotal?`Total: ${formattedTotal}`:"","You can return to the store to view the latest order status."].filter(Boolean).join("\n");
  const htmlContent=`<!doctype html><html><body style="margin:0;background:#f4f7f5;padding:32px 16px;font-family:Arial,sans-serif;color:#17231d"><main style="max-width:560px;margin:auto;background:#fff;border:1px solid #e5ece7;border-radius:18px;padding:30px"><p style="color:#587064;font-size:12px;letter-spacing:1.5px;font-weight:700">QUICKCART ORDER UPDATE</p><h1 style="font-size:25px;margin:8px 0 12px">${safeTitle}</h1><p style="color:#53645b;line-height:1.6">There is an update to your order from <strong>${safeStore}</strong>.</p><div style="background:#f4f8f5;border-radius:12px;padding:18px;margin:22px 0"><p style="margin:0 0 8px;color:#63736a;font-size:12px">ORDER REFERENCE</p><strong>${reference}</strong>${formattedTotal?`<p style="margin:12px 0 0;font-size:18px;font-weight:700">${escapeEmailHtml(formattedTotal)}</p>`:""}</div><p style="color:#53645b;line-height:1.6">You can return to the store to view the latest order status and any next steps.</p><p style="color:#87938c;font-size:12px;margin-top:28px">This is an automated update from QuickCart.</p></main></body></html>`;
  const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":apiKey,"content-type":"application/json"},body:JSON.stringify({sender:{name:fromName,email:fromEmail},to:[{email}],subject:`${title} · ${storeName||"QuickCart"}`,textContent,htmlContent})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.message||"Unable to send customer order update email.");
  return data;
 };
}


export function createAdminPasswordResetEmailSender({apiKey,fromEmail,fromName="QuickCart"}) {
 return async function sendAdminPasswordResetEmail(email,resetUrl) {
  if(!apiKey||!fromEmail)throw new Error("Brevo email settings are not configured.");
  const safeUrl=escapeEmailHtml(resetUrl);
  const textContent="A password reset was requested for your QuickCart administrator account. Use this one-time link within 15 minutes:\n\n"+resetUrl+"\n\nIf you did not request this, ignore this email.";
  const htmlContent=`<!doctype html><html><body style="margin:0;background:#f4f7f5;padding:32px 16px;font-family:Arial,sans-serif;color:#17231d"><main style="max-width:540px;margin:auto;background:#fff;border:1px solid #e5ece7;border-radius:18px;padding:30px"><p style="color:#587064;font-size:12px;letter-spacing:1.5px;font-weight:700">QUICKCART CONTROL CENTRE</p><h1 style="font-size:24px;margin:8px 0 12px">Reset your admin password</h1><p style="color:#53645b;line-height:1.65">A password reset was requested for your QuickCart administrator account. Use the button below to choose a new password.</p><p style="margin:26px 0"><a href="${safeUrl}" style="display:inline-block;background:#245b3e;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px">Reset administrator password</a></p><p style="color:#63736a;font-size:13px;line-height:1.6">This one-time link expires in <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p><p style="color:#87938c;font-size:11px;margin-top:28px">QuickCart private administration</p></main></body></html>`;
  let response;
  try {
   response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":apiKey,"content-type":"application/json"},body:JSON.stringify({sender:{name:fromName,email:fromEmail},to:[{email}],subject:"Reset your QuickCart administrator password",textContent,htmlContent}),signal:AbortSignal.timeout(15000)});
  } catch(error) {
   const deliveryError=new Error(error?.name==="TimeoutError"||error?.name==="AbortError"?"Brevo email request timed out.":"Could not reach Brevo email service.");
   deliveryError.code=error?.name==="TimeoutError"||error?.name==="AbortError"?"BREVO_TIMEOUT":"BREVO_NETWORK_ERROR";
   throw deliveryError;
  }
  const raw=await response.text();
  let data={};
  try{data=raw?JSON.parse(raw):{}}catch{data={message:raw.slice(0,300)}}
  if(!response.ok){
   const deliveryError=new Error(String(data.message||data.error||"Brevo rejected the administrator reset email.").slice(0,300));
   deliveryError.statusCode=response.status;
   deliveryError.code=String(data.code||data.errorCode||"BREVO_REJECTED").slice(0,80);
   throw deliveryError;
  }
  if(!data.messageId){
   const deliveryError=new Error("Brevo returned success without a message ID; delivery acceptance could not be confirmed.");
   deliveryError.statusCode=response.status;
   deliveryError.code="BREVO_UNCONFIRMED_ACCEPTANCE";
   throw deliveryError;
  }
  return data;
 };
}
