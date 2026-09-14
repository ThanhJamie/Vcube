import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { bootstrapSettings } from './backend/services/settingsService';

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

// Nạp 4 kho cấu hình (site_content / app_settings / pricing_global_settings /
// pricing_configs) MỘT LẦN lúc khởi động — docs/plans/09-admin-settings.md §3.2 #5.
// KHÔNG chặn render: không `await` ở top-level, app vẽ ngay và cache được điền sau.
// Lỗi đọc được báo TRUNG THỰC ra console (không `catch {}` im lặng, không bịa giá trị
// mặc định — settingsService trả `null` cho kho chưa cấu hình, UI tự hiện "Chưa cấu hình").
void bootstrapSettings()
  .then(({ error }) => {
    if (error) console.error('[vcube] bootstrapSettings lỗi:', error);
  })
  .catch((e) => {
    console.error('[vcube] bootstrapSettings lỗi:', e);
  });

// ThemeProvider được mount TRONG <BrowserRouter> ở src/App.tsx (component RouteThemeSync)
// để dùng useLocation() — docs/plans/01-theme-migration.md §5.2.
// KHÔNG mount lại ở đây để tránh 2 provider chồng nhau.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
