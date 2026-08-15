// Keeps all navigation inside the app. Prevents any link or script from
// opening an external browser window (important for the Android WebView build).

export function installInAppNavigationGuard() {
  if (typeof window === 'undefined') return;
  if ((window as any).__inAppNavInstalled) return;
  (window as any).__inAppNavInstalled = true;

  const isInternal = (url: string) => {
    try {
      const u = new URL(url, window.location.href);
      if (u.protocol === 'blob:' || u.protocol === 'data:') return true;
      return u.origin === window.location.origin;
    } catch {
      return true;
    }
  };

  // Block window.open to an external browser
  const originalOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const href = typeof url === 'string' ? url : url?.toString();
    if (!href) return originalOpen(url as any, '_self', features);
    if (isInternal(href)) {
      window.location.href = href;
      return null;
    }
    return null; // never leave the app
  }) as typeof window.open;

  // Force every anchor to navigate in place
  document.addEventListener(
    'click',
    (e) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.hasAttribute('download')) return;
      if (/^(tel:|mailto:|sms:)/i.test(href)) return;

      if (anchor.target === '_blank') anchor.removeAttribute('target');
      if (!isInternal(href)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
}
