import * as React from 'react';

function navigate(url: string, replace = false) {
  const destination = new URL(url, location.href);
  if (destination.origin !== location.origin) {
    if (replace) location.replace(destination.href);
    else location.assign(destination.href);
    return;
  }

  history[replace ? 'replaceState' : 'pushState']({}, '', destination);
  window.dispatchEvent(new Event('popstate'));
}
const router = { push: (url: string) => navigate(url), replace: (url: string) => navigate(url, true), back: () => history.back(), refresh: () => window.dispatchEvent(new Event('popstate')) };
export function useLocation() { return React.useSyncExternalStore(callback => { window.addEventListener('popstate', callback); return () => window.removeEventListener('popstate', callback); }, () => location.pathname + location.search); }
export function usePathname() { return useLocation().split('?')[0]; }
export function useSearchParams() { const url = useLocation(); return React.useMemo(() => new URLSearchParams(url.split('?')[1]), [url]); }
export function useRouter() { return router; }
export function useParams() { return { uuid: usePathname().split('/')[2] || 'preview-task' }; }
export function redirect(url: string) { queueMicrotask(() => router.replace(url)); }
