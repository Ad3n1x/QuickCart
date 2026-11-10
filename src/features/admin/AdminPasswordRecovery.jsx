import React,{useState} from "react";
import { ArrowLeft,KeyRound,Mail,ShieldCheck,CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { Logo } from "../../components/common/SharedUI.jsx";
import { go } from "../../lib/navigation.js";
import "../../styles/admin.css";

export default function AdminPasswordRecovery({mode="forgot"}){
 const isReset=mode==="reset";
 const params=new URLSearchParams(window.location.search);
 const token=params.get("token")||"";
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState("");
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(false);
 const submit=async event=>{
  event.preventDefault();if(loading)return;setError("");setMessage("");
  if(isReset&&(password.length<14||password.length>128)){setError("Choose a password between 14 and 128 characters.");return}
  if(isReset&&password!==confirm){setError("The passwords do not match.");return}
  setLoading(true);
  try{
   if(isReset){const result=await api("/api/admin/auth/reset-password",{method:"POST",body:body({token,password})});setPassword("");setConfirm("");setMessage(result.message||"Password updated. You can now sign in.");}
   else{const result=await api("/api/admin/auth/forgot-password",{method:"POST",body:body({email:email.trim()})});setMessage(result.message||"If the administrator email is registered, a reset link will be sent shortly.");setEmail("");}
  }catch(e){setError(e.message||"Unable to complete this request.");}
  finally{setLoading(false)}
 };
 return <main className="admin-auth-page"><section className="admin-auth-card">
  <div className="admin-auth-brand"><Logo size={46}/><span>QUICKCART <b>CONTROL CENTRE</b></span></div>
  <div className="admin-auth-icon">{isReset?<KeyRound size={25}/>:<ShieldCheck size={25}/>}</div>
  <span className="admin-eyebrow">PRIVATE ADMINISTRATION</span>
  <h1>{isReset?"Choose a new password":"Recover admin access"}</h1>
  <p className="admin-auth-copy">{isReset?"Create a new password for your private administrator account. Reset links expire after 15 minutes and can only be used once.":"Enter your administrator email. If it matches the configured admin account, we’ll send a one-time password reset link."}</p>
  {message?<div className="admin-auth-success" role="status"><CheckCircle2 size={19}/><span>{message}</span></div>:null}
  {!(isReset&&!token)&&!message&&<form className="admin-auth-form" onSubmit={submit}>
   {!isReset?<><label htmlFor="admin-recovery-email">Administrator email</label><input id="admin-recovery-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" required/></>:<>
    <label htmlFor="admin-new-password">New password</label><input id="admin-new-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 14 characters" minLength={14} maxLength={128} required/>
    <label htmlFor="admin-confirm-password">Confirm new password</label><input id="admin-confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter the new password again" minLength={14} maxLength={128} required/>
    <p className="admin-auth-hint">Use at least 14 characters. Your password is stored as a secure bcrypt hash.</p>
   </>}
   {error&&<p className="admin-auth-error" role="alert">{error}</p>}
   <button type="submit" disabled={loading}>{loading?(isReset?"Updating password…":"Sending reset link…"):(isReset?"Update password":"Send reset link")} <Mail size={17}/></button>
  </form>}
  {error&&isReset&&!token?<p className="admin-auth-error" role="alert">This reset link is missing or invalid. Request a new one.</p>:null}
  <button className="admin-auth-back" type="button" onClick={()=>go("/admin/login")}><ArrowLeft size={15}/> Back to administrator sign in</button>
 </section></main>;
}
