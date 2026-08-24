import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign ResizeObserver loop notifications
const suppressResizeObserverError = (e: ErrorEvent | PromiseRejectionEvent) => {
  const msg = 'message' in e ? e.message : (e as PromiseRejectionEvent).reason?.message || String((e as PromiseRejectionEvent).reason || '');
  if (
    typeof msg === 'string' &&
    (msg.includes('ResizeObserver loop') ||
      msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded'))
  ) {
    if ('stopImmediatePropagation' in e && typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
    if ('preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    return true;
  }
  return false;
};

window.addEventListener('error', suppressResizeObserverError, true);
window.addEventListener('unhandledrejection', suppressResizeObserverError, true);

const originalOnError = window.onerror;
window.onerror = function (msg, url, lineNo, columnNo, error) {
  if (
    typeof msg === 'string' &&
    (msg.includes('ResizeObserver loop') ||
      msg.includes('ResizeObserver loop completed with undelivered notifications') ||
      msg.includes('ResizeObserver loop limit exceeded'))
  ) {
    return true;
  }
  if (originalOnError) {
    return originalOnError.apply(this, [msg, url, lineNo, columnNo, error]);
  }
  return false;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
