import React, { useState } from "react";
import { LockKeyhole, X } from "lucide-react";

export default function PrivacyNoticeBanner() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem("qc_privacy_storage_notice_v1") !== "seen"; }
    catch { return true; }
  });
  if (!visible) return null;
  const dismiss = () => {
    try { localStorage.setItem("qc_privacy_storage_notice_v1", "seen"); } catch {}
    setVisible(false);
  };
  return <div className="privacy-storage-overlay">
    <section className="privacy-storage-dialog" role="dialog" aria-modal="true" aria-labelledby="privacy-storage-title">
      <div className="privacy-storage-top"><span><LockKeyhole size={16}/> PRIVACY &amp; STORAGE</span><button type="button" aria-label="Close privacy notice" onClick={dismiss}><X size={18}/></button></div>
      <h2 id="privacy-storage-title">Your privacy choices matter.</h2>
      <p>QuickCart uses essential browser storage for core features such as sign-in, cart and store context, and preferences. Optional analytics or advertising tracking must remain off unless it is separately explained and you choose to allow it.</p>
      <div className="privacy-storage-actions"><a href="./privacy">Read the privacy notice</a><button type="button" onClick={dismiss}>Continue with essential storage</button></div>
    </section>
  </div>;
}
