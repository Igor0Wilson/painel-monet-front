import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

try {
  localStorage.removeItem('pm_app_installed');
  sessionStorage.removeItem('pm_app_installed');
} catch {
  // Ignore storage access errors in private mode
}

const params = new URLSearchParams(window.location.search);
const isInstalledApp =
  params.get('app') === '1' ||
  params.get('standalone') === '1' ||
  Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
  Boolean(
    typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches),
  ) ||
  Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView);

(window as unknown as { __PM_RUNNING_IN_APP__?: boolean }).__PM_RUNNING_IN_APP__ = isInstalledApp;

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}

reportWebVitals();
