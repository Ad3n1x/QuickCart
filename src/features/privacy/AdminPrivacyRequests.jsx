import React, { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../../lib/api.js";
import { body } from "../../lib/json.js";
import { go } from "../../lib/navigation.js";
import { Loading } from "../../components/common/SharedUI.jsx";
import "../../styles/privacy.css";

const statuses = ["received", "identity_verification", "in_progress", "completed", "declined"];
const verificationStatuses = ["pending", "verified", "not_required"];

export default function AdminPrivacyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { const data = await api("/api/admin/privacy/requests"); setRequests(data.requests || []); }
    catch (err) { setError(err.message || "Unable to load requests."); if (err.status === 401) { sessionStorage.removeItem("quickcart_admin_token"); go("/admin/login", true); } }
    finally { setLoading(false); }
  };
  useEffect(() => { if (!sessionStorage.getItem("quickcart_admin_token")) { go("/admin/login", true); return; } load(); }, []);
  const update = async (request, patch) => {
    setBusyId(request.id); setError("");
    try { const data = await api("/api/admin/privacy/requests/" + encodeURIComponent(request.id), { method: "PATCH", body: body(patch) }); setRequests(items => items.map(item => item.id === request.id ? data.request : item)); }
    catch (err) { setError(err.message || "Unable to update request."); }
    finally { setBusyId(""); }
  };
  if (loading && !requests.length) return <Loading label="Loading privacy requests…"/>;
  return <main className="privacy-admin-page">
    <header><button onClick={() => go("/admin")}><ArrowLeft size={16}/> Admin dashboard</button><button onClick={load}><RefreshCw size={16}/> Refresh</button></header>
    <div className="privacy-admin-heading"><ShieldCheck size={24}/><div><span>PRIVATE ADMINISTRATION</span><h1>Privacy requests</h1><p>Review incoming data-subject requests. Verify identity before releasing or changing personal data.</p></div></div>
    {error && <p className="privacy-error" role="alert">{error}</p>}
    {!requests.length ? <p className="privacy-empty">No privacy requests have been submitted.</p> : <div className="privacy-request-list">{requests.map(request => <article key={request.id}>
      <div className="privacy-request-top"><div><strong>{request.name}</strong><a href={"mailto:" + request.email}>{request.email}</a></div><code>{request.id}</code></div>
      <p className="privacy-request-type">{String(request.type).replaceAll("-", " ")}</p><p>{request.details}</p>
      <small>Received {request.createdAt ? new Date(request.createdAt).toLocaleString() : "—"}</small>
      <div className="privacy-admin-controls">
        <label>Status<select value={request.status} disabled={busyId === request.id} onChange={e => update(request, { status: e.target.value })}>{statuses.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Identity check<select value={request.verificationStatus} disabled={busyId === request.id} onChange={e => update(request, { verificationStatus: e.target.value })}>{verificationStatuses.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label className="privacy-note-field">Internal note<textarea defaultValue={request.internalNote || ""} maxLength={2000} rows={2} onBlur={e => { if (e.target.value !== (request.internalNote || "")) update(request, { internalNote: e.target.value }); }}/></label>
      </div>
    </article>)}</div>}
  </main>;
}
