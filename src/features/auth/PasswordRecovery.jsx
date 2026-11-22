import React,{useState} from "react";
import { Check,KeyRound,ArrowLeft } from "lucide-react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { emailOf } from "../../lib/identity.js";
import { Field,Logo,Password } from "../../components/common/SharedUI.jsx";

export default function PasswordRecovery({accountType="seller",mode="forgot",onBack}) {
  const buyer=accountType==="buyer";
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmPassword,setConfirmPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const token=new URLSearchParams(window.location.search).get("token")||"";
  const reset=mode==="reset";

  const submit=async event=>{
    event.preventDefault();
    if(loading)return;
    setError("");setMessage("");
    if(!reset){
      const normalized=emailOf(email);
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(normalized))return setError("Enter a valid email address.");
      setLoading(true);
      try{
        const endpoint=buyer?"/api/customer/auth/forgot-password":"/api/auth/forgot-password";
        const result=await api(endpoint,{method:"POST",body:body({email:normalized})});
        setMessage(result.message||"If an account exists for that email, a password reset link will be sent shortly.");
      }catch(e){setError(e.message||"Unable to request a reset link. Please try again.");}
      finally{setLoading(false);}
      return;
    }
    if(!token)return setError("This reset link is missing its security token. Request a new link.");
    if(password!==confirmPassword)return setError("The passwords do not match.");
    if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,128}$/.test(password))return setError("Use 8–128 characters with uppercase, lowercase, a number and a symbol.");
    setLoading(true);
    try{
      const endpoint=buyer?"/api/customer/auth/reset-password":"/api/auth/reset-password";
      const result=await api(endpoint,{method:"POST",body:body({token,password})});
      setMessage(result.message||"Your password has been updated. You can now sign in.");
      setPassword("");setConfirmPassword("");
    }catch(e){setError(e.message||"This reset link is invalid or expired. Request a new one.");}
    finally{setLoading(false);}
  };

  return <main className={buyer?"customer-auth-page":"auth-page"}><div className={buyer?"customer-auth-shell":"auth-shell"}><section className={buyer?"customer-auth-card":"auth-card"}>
    <div className={buyer?"customer-auth-brand":"auth-brand"}><Logo size={44}/><div><span className="eyebrow">QUICKCART {buyer?"BUYER":"SELLER"}</span><h1>{reset?"Choose a new password":"Forgot your password?"}</h1><p>{reset?"Create a new password for your QuickCart account.":"Enter the email address linked to your account and we’ll send a secure reset link."}</p></div></div>
    {message&&<div className="form-success">{message}</div>}
    {error&&<div className="form-error">{error}</div>}
    {reset&&!token&&!error&&<div className="form-error">This reset link is missing its security token. Request a new link.</div>}
    {!(reset&&message)&&<form className="stack" onSubmit={submit}>
      {!reset?<Field label="Email address" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/>:<><Password label="New password" value={password} onChange={setPassword}/><Password label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword}/><small className="muted">Use 8–128 characters with uppercase, lowercase, a number and a symbol.</small></>}
      <button className="primary-button big full" disabled={loading||Boolean(reset&&!token)}>{loading?"Please wait…":reset?"Update password":"Send reset link"} <KeyRound size={17}/></button>
    </form>}
    <p className="auth-switch"><button type="button" onClick={onBack}><ArrowLeft size={14}/> Back to sign in</button></p>
  </section></div></main>;
}
