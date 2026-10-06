import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

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
    <FatalBoundary><App /></FatalBoundary>
  </React.StrictMode>
);
