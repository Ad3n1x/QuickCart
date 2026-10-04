import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
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
  box.innerHTML = '<section style="max-width:680px;width:100%;background:#fff;border:1px solid #e4ebe7;border-radius:18px;padding:28px;box-shadow:0 18px 55px rgba(16,43,33,.08)"><h1 style="margin:0 0 10px">QuickCart could not start</h1><p style="color:#60746a">The page loaded, but the application failed during startup. Reloading can clear a stale cached bundle.</p><button id="quickcart-reload" style="margin-top:10px;padding:11px 15px;border:0;border-radius:11px;background:#12392d;color:#fff;font-weight:800">Reload QuickCart</button></section>';
  box.querySelector('#quickcart-reload')?.addEventListener('click', () => window.location.reload());
  root.appendChild(box);
}

window.addEventListener('error', event => {
  if (event?.error) showFatalError(event.error);
});
window.addEventListener('unhandledrejection', event => {
  showFatalError(event?.reason || new Error('Unhandled promise rejection'));
});

function BootError({ error }) {
  return React.createElement('main', {
    style: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7faf8', color: '#102b21', fontFamily: 'system-ui, sans-serif' }
  }, React.createElement('section', {
    style: { maxWidth: 620, width: '100%', background: '#fff', border: '1px solid #e4ebe7', borderRadius: 18, padding: 28, boxShadow: '0 18px 55px rgba(16,43,33,.08)' }
  }, React.createElement('h1', { style: { marginTop: 0 } }, 'QuickCart could not start'),
  React.createElement('p', null, 'The app loaded, but its JavaScript bundle could not start correctly.'),
  React.createElement('code', { style: { display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f3f7f4', padding: 12, borderRadius: 10, fontSize: 12 } }, String(error?.message || error || 'Unknown startup error')),
  React.createElement('button', { onClick: () => window.location.reload(), style: { marginTop: 16, padding: '11px 15px', border: 0, borderRadius: 11, background: '#12392d', color: '#fff', fontWeight: 800 } }, 'Reload QuickCart')));
}

try {
  createRoot(root).render(React.createElement(AppErrorBoundary, null, React.createElement(App)));
} catch (error) {
  console.error('QuickCart startup error:', error);
  createRoot(root).render(React.createElement(BootError, { error }));
}
