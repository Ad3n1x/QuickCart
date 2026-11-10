import React,{useState} from "react";
import { ShieldCheck,LogIn,KeyRound } from "lucide-react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { Logo } from "../../components/common/SharedUI.jsx";
import { go } from "../../lib/navigation.js";
import "../../styles/admin.css";

export default function AdminAuth(){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 const submit=async event=>{event.preventDefault();if(loading)return;setError("");setLoading(true);try{const result=await api("/api/admin/auth/login",{method:"POST",body:body({email:email.trim(),password})});sessionStorage.setItem("quickcart_admin_token",result.token);setPassword("");go("/admin",true)}catch(e){setError(e.message||"Unable to sign in.");}finally{setLoading(false)}};
 return <main className="admin-auth-page"><section className="admin-auth-card"><div className="admin-auth-brand"><Logo size={46}/><span>QUICKCART <b>CONTROL CENTRE</b></span></div><div className="admin-auth-icon"><ShieldCheck size={25}/></div><span className="admin-eyebrow">PRIVATE ADMINISTRATION</span><h1>Administrator sign in</h1><p className="admin-auth-copy">This private workspace is separate from customer and seller accounts. Access is restricted to the configured administrator.</p><form className="admin-auth-form" onSubmit={submit}><label htmlFor="admin-email">Administrator email</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" required/><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your private password" required maxLength={128}/>{error&&<p className="admin-auth-error" role="alert">{error}</p>}<button type="submit" disabled={loading}>{loading?"Signing in…":"Sign in securely"} <LogIn size={17}/></button></form><button className="admin-auth-forgot" type="button" onClick={()=>go("/admin/forgot-password")}>Forgot administrator password?</button><p className="admin-auth-footnote">No public registration. Admin credentials are provisioned privately by the platform owner.</p><button className="admin-auth-back" type="button" onClick={()=>go("/")}>Back to QuickCart marketplace</button></section></main>;
}
