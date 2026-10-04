import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { createRoot } from 'react-dom/client';
import App, { AppErrorBoundary } from './App.jsx';
import './index.css';

const root = document.getElementById('root');

function showFatalError(error) {
  console.error('QuickCart fatal startup error:', error);
  if (!root) return;
  root.innerHTML = '';
  const box = document.createElement('main');
  box.style.cssText = 'min-height:100vh;display:grid;place-items:center;padding:24px;background:#f7faf8;color:#102b21;font-family:system-ui,sans-serif';
  box.innerHTML = '<section style="max-width:680px;width:100%;background:#fff;border:1px solid #e4ebe7;border-radius:18px;padding:28px;box-shadow:0 18px 55px rgba(16,43,33,.08)"><h1 style="margin:0 0 10px">QuickCart could not start</h1><p style="color:#60746a">The application bundle failed while starting. The exact error is shown below so it cannot silently appear as a blank page.</p><pre id="quickcart-error" style="white-space:pre-wrap;word-break:break-word;background:#f3f7f4;padding:12px;border-radius:10px;font-size:12px"></pre><button id="quickcart-reload" style="margin-top:10px;padding:11px 15px;border:0;border-radius:11px;background:#12392d;color:#fff;font-weight:800">Reload QuickCart</button></section>';
  const details = box.querySelector('#quickcart-error');
  if (details) details.textContent = String(error?.stack || error?.message || error || 'Unknown startup error');
  box.querySelector('#quickcart-reload')?.addEventListener('click', () => window.location.reload());
  root.appendChild(box);
}

window.addEventListener('error', event => {
  if (event?.error) showFatalError(event.error);
});
window.addEventListener('unhandledrejection', event => {
  showFatalError(event?.reason || new Error('Unhandled promise rejection'));
});

window.addEventListener('vite:preloadError', event => {
  event.preventDefault();
  const key = 'quickcart_preload_recovery';
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1');
    window.location.reload();
  } else {
    showFatalError(event?.payload?.err || new Error('A QuickCart application chunk could not be loaded.'));
  }
});

try {
  if (!root) throw new Error('QuickCart root element was not found.');
  if (!App || !AppErrorBoundary) throw new Error('QuickCart App module loaded without its expected exports.');
  createRoot(root).render(
    React.createElement(AppErrorBoundary, null, React.createElement(App))
  );
} catch (error) {
  showFatalError(error);
}
