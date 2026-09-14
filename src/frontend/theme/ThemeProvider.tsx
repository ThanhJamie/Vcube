/**
 * ThemeProvider — chọn theme theo ROUTE FAMILY (light-first storefront, dark cho
 * khu vực kỹ thuật) + override người dùng qua localStorage.
 *
 * Quy tắc (docs/plans/01-theme-migration.md §5.2):
 *   dark  : /quote, /admin/*, /lab/*, /designer/*
 *   light : mọi route còn lại (storefront)
 * Override: `localStorage['vcube_theme'] = 'light' | 'dark' | 'auto'` ('auto' = theo route).
 *
 * HAI CHẾ ĐỘ (khác nhau đúng ở việc có đụng vào `history` hay không):
 *  1. ROUTER ĐIỀU KHIỂN (khuyến nghị, §5.2): provider nằm TRONG <BrowserRouter>, nhận
 *     prop `pathname` từ `useLocation()`. Không gắn listener, KHÔNG bọc history.pushState.
 *  2. FALLBACK (provider nằm ngoài Router — ví dụ mount tạm ở main.tsx): tự đọc
 *     `window.location.pathname`, lắng nghe popstate/hashchange/'vcube:routechange' và
 *     bọc history.pushState/replaceState (popstate KHÔNG phát khi pushState); mọi thứ
 *     được khôi phục nguyên trạng khi unmount.
 * Chuyển từ chế độ 2 sang 1 thì phải BỎ mount ở main.tsx để tránh 2 provider chồng nhau.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEME_STORAGE_KEY, type ThemeMode } from './tokens';

/** Sự kiện nội bộ phát khi URL đổi — ai đó có thể tự dispatch để báo provider. */
export const ROUTE_CHANGE_EVENT = 'vcube:routechange';

/** Route family dark-first (đồng bộ toàn bộ platform sang light-first SaaS hiện đại). */
export const DARK_ROUTE_PREFIXES: readonly string[] = [] as const;

export type ResolvedTheme = 'light' | 'dark';

/**
 * Chuẩn hoá pathname: bỏ query/hash, ép có `/` đầu, bỏ `/` cuối, hạ chữ thường.
 * `/admin/Users?id=1` -> `/admin/users`.
 */
export function normalizePathname(input?: string | null): string {
  if (!input) return '/';
  let path = String(input).split('#')[0].split('?')[0];
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1) {
    path = path.replace(/\/+$/, '') || '/';
  }
  return path.toLowerCase();
}

/** Route này thuộc nhóm dark-first? */
export function isDarkRoute(pathname?: string | null): boolean {
  const path = normalizePathname(pathname);
  return DARK_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
}

/** Ghép override người dùng với route family -> theme thực tế. */
export function resolveThemeMode(mode: ThemeMode | string | null | undefined, pathname?: string | null): ResolvedTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return isDarkRoute(pathname) ? 'dark' : 'light';
}

function readStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Safari private mode / môi trường chặn storage
    return null;
  }
}

/** Đọc override đã lưu; giá trị lạ hoặc không đọc được -> 'auto'. */
export function readStoredMode(): ThemeMode {
  const storage = readStorage();
  if (!storage) return 'auto';
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : 'auto';
  } catch {
    return 'auto';
  }
}

/** Ghi override. `null` = xoá override (quay về 'auto'). */
export function writeStoredMode(mode: ThemeMode | null): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    if (mode === null) storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // bỏ qua: theme vẫn đúng trong phiên hiện tại
  }
}

/** Gắn/bỏ `class="dark"` + `color-scheme` trên `<html>`. */
export function applyThemeToDocument(isDark: boolean, root?: HTMLElement | null): void {
  const el = root ?? (typeof document === 'undefined' ? null : document.documentElement);
  if (!el || !el.classList) return;
  if (isDark) el.classList.add('dark');
  else el.classList.remove('dark');
  if (el.style) el.style.colorScheme = isDark ? 'dark' : 'light';
}

/* ---------------------------------------------------------------------------
   Route watcher — CHỈ dùng ở chế độ fallback (không có prop `pathname`).
   --------------------------------------------------------------------------- */

/** Phần `window` mà watcher cần — khai báo tối thiểu để test được không cần DOM thật. */
export type RouteWatcherTarget = {
  location: { pathname: string };
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  dispatchEvent: (event: unknown) => boolean;
  history: Pick<History, 'pushState' | 'replaceState'>;
  Event?: new (type: string) => unknown;
};

/* Đếm tham chiếu: nhiều provider fallback (StrictMode mount 2 lần, HMR) chỉ bọc history
   MỘT lớp; lớp bọc chỉ được tháo khi tham chiếu cuối cùng unmount. */
let historyPatchRefs = 0;
let restoreHistoryPatch: (() => void) | null = null;

function patchHistoryEvents(target: RouteWatcherTarget): () => void {
  const history = target.history;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  if (typeof originalPushState !== 'function' || typeof originalReplaceState !== 'function') return () => {};

  if (historyPatchRefs === 0) {
    const notify = () => {
      const EventCtor = target.Event ?? (globalThis as unknown as { Event?: new (type: string) => unknown }).Event;
      if (typeof EventCtor !== 'function') return;
      try {
        target.dispatchEvent(new EventCtor(ROUTE_CHANGE_EVENT));
      } catch {
        // môi trường test tối giản: bỏ qua
      }
    };
    history.pushState = function patchedPushState(...args: Parameters<History['pushState']>) {
      const result = originalPushState.apply(history, args);
      notify();
      return result;
    };
    history.replaceState = function patchedReplaceState(...args: Parameters<History['replaceState']>) {
      const result = originalReplaceState.apply(history, args);
      notify();
      return result;
    };
    restoreHistoryPatch = () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      restoreHistoryPatch = null;
    };
  }

  historyPatchRefs += 1;
  return () => {
    historyPatchRefs = Math.max(0, historyPatchRefs - 1);
    if (historyPatchRefs === 0 && restoreHistoryPatch) restoreHistoryPatch();
  };
}

/**
 * Theo dõi đổi route ở chế độ fallback. Trả về hàm cleanup.
 *
 * - `options.hasExplicitPathname === true` (provider do router điều khiển): NO-OP tuyệt đối —
 *   không gắn listener, KHÔNG bọc `history.pushState/replaceState`.
 * - Ngược lại: gắn popstate/hashchange/'vcube:routechange' + bọc history; cleanup gỡ listener
 *   và khôi phục history về hàm gốc (không chồng lớp khi mount/unmount nhiều lần).
 */
export function createRouteWatcher(
  onRouteChange: () => void,
  options: { hasExplicitPathname?: boolean; targetWindow?: RouteWatcherTarget | null } = {},
): () => void {
  if (options.hasExplicitPathname) return () => {};

  const target =
    options.targetWindow ??
    (typeof window === 'undefined' ? null : (window as unknown as RouteWatcherTarget));
  if (!target || !target.history || typeof target.addEventListener !== 'function') return () => {};

  target.addEventListener('popstate', onRouteChange);
  target.addEventListener('hashchange', onRouteChange);
  target.addEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
  const restoreHistory = patchHistoryEvents(target);

  return () => {
    if (typeof target.removeEventListener === 'function') {
      target.removeEventListener('popstate', onRouteChange);
      target.removeEventListener('hashchange', onRouteChange);
      target.removeEventListener(ROUTE_CHANGE_EVENT, onRouteChange);
    }
    restoreHistory();
  };
}

/**
 * Pathname hiện tại:
 * - có prop `pathname` -> dùng thẳng giá trị router đưa (không listener, không đụng history);
 * - không có -> đọc `window.location.pathname` + watcher fallback.
 */
function useRoutePathname(explicitPathname?: string): string {
  const [pathname, setPathname] = useState<string>(() =>
    normalizePathname(
      explicitPathname !== undefined
        ? explicitPathname
        : typeof window !== 'undefined'
          ? window.location.pathname
          : '/',
    ),
  );

  useEffect(() => {
    if (explicitPathname !== undefined) {
      const next = normalizePathname(explicitPathname);
      setPathname((prev) => (prev === next ? prev : next));
      return;
    }
    if (typeof window === 'undefined') return;

    const sync = () => {
      const next = normalizePathname(window.location.pathname);
      setPathname((prev) => (prev === next ? prev : next));
    };
    sync();
    return createRouteWatcher(sync);
  }, [explicitPathname]);

  return pathname;
}

export type ThemeContextValue = {
  /** Cấu hình: 'light' | 'dark' | 'auto' (auto = theo route family). */
  mode: ThemeMode;
  /** Theme đang áp dụng thực tế. */
  resolvedMode: ResolvedTheme;
  /** `resolvedMode === 'dark'` — tiện cho viewer 3D. */
  isDark: boolean;
  /** Pathname provider đang dùng để quyết định theme. */
  pathname: string;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Truyền `useLocation().pathname` khi provider nằm trong Router (chế độ khuyến nghị). */
  pathname?: string;
};

export function ThemeProvider({ children, pathname: pathnameProp }: ThemeProviderProps) {
  const pathname = useRoutePathname(pathnameProp);
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());

  const resolvedMode = resolveThemeMode(mode, pathname);
  const isDark = resolvedMode === 'dark';

  useEffect(() => {
    applyThemeToDocument(isDark);
  }, [isDark]);

  // Đổi override ở tab khác -> đồng bộ.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) setModeState(readStoredMode());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStoredMode(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedMode, isDark, pathname, setMode }),
    [mode, resolvedMode, isDark, pathname, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Đọc/đổi theme. Ném lỗi rõ ràng nếu quên bọc <ThemeProvider>. */
export function useThemeMode(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(
      'useThemeMode() phải nằm trong <ThemeProvider>. Xem docs/plans/01-theme-migration.md §5.2 hoặc snippet mount trong báo cáo A2a.',
    );
  }
  return context;
}
