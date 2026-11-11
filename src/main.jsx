import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./styles/experience-refresh.css";

const root = document.getElementById("root");

class FatalBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("QuickCart render error:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="fatal-screen"><section><div className="fatal-icon">!</div><h1>QuickCart could not load this screen.</h1><p>The app hit an unexpected error. Your saved session is still stored locally.</p><pre>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre><button className="primary-button" onClick={() => window.location.reload()}>Reload QuickCart</button></section></main>;
  }
}

function InstallAppPrompt() {
  const [installPrompt, setInstallPrompt] = React.useState(null);
  const [installed, setInstalled] = React.useState(false);
  const path = window.location.pathname;
  const isAdmin = /^\\/admin(?:\\/|$)/.test(path);
  const isStorefront = path === "/marketplace" || path.startsWith("/store/");
  const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

  React.useEffect(() => {
    const onPrompt = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if ((!isAdmin && !isStorefront) || isStandalone || installed || !installPrompt) return null;

  const label = isAdmin ? "Install Admin App" : "Install Storefront App";
  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return <button type="button" onClick={install} aria-label={label} style={{
    position:"fixed",right:"16px",bottom:"max(16px, env(safe-area-inset-bottom))",zIndex:9999,
    display:"inline-flex",alignItems:"center",gap:"9px",padding:"12px 16px",
    border:0,borderRadius:"999px",background:"#12392d",color:"#fff",
    boxShadow:"0 8px 28px rgba(18,57,45,.24)",fontSize:"14px",fontWeight:700,
    cursor:"pointer"
  }}>
    <span aria-hidden="true">↓</span>{label}
  </button>;
}

if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(reg => reg.update().catch(() => {}))
      .catch(error => console.warn("QuickCart offline support could not start:", error));
  });
}

window.addEventListener("unhandledrejection", event => {
  console.error("QuickCart unhandled promise rejection:", event?.reason);
});

window.addEventListener("vite:preloadError", event => {
  event.preventDefault();
  const key = "quickcart_preload_recovery";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
});

if (!root) {
  throw new Error("QuickCart root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <>
      <InstallAppPrompt />
      <FatalBoundary><App /></FatalBoundary>
    </>
  </React.StrictMode>
);
