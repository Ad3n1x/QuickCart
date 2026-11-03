export function createVerificationEmailSender({apiKey,fromEmail,fromName="QuickCart"}) {
 async function sendVerificationEmail(email,name,otp){
 if(!brevoApiKey) throw new Error('BREVO_API_KEY is not configured.');
 if(!brevoFromEmail) throw new Error('BREVO_FROM_EMAIL is not configured.');
 const response=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','api-key':brevoApiKey,'content-type':'application/json'},body:JSON.stringify({sender:{name:brevoFromName,email:brevoFromEmail},to:[{email,name}],subject:'Your QuickCart verification code',textContent:`Hi ${name||'there'}, your QuickCart verification code is ${otp}. It expires in 10 minutes.`,htmlContent:`<html><body style="font-family:Arial,sans-serif;background:#f5f8f6;padding:30px"><div style="max-width:520px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1>Welcome to QuickCart 👋</h1><p>Hi ${name||'there'},</p><p>Use this code to verify your email:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef5f1;padding:18px;text-align:center;border-radius:12px">${otp}</div><p>This code expires in 10 minutes.</p></div></body></html>`})});
 const data=await response.json().catch(()=>({})); if(!response.ok) throw new Error(data.message||'Unable to send verification email.'); return data;
}
 return sendVerificationEmail;
}
