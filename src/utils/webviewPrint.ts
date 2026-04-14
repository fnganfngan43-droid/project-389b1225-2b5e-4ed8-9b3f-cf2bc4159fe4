/**
 * WebView-compatible printing utility.
 * In WebView environments (like AppsGeyser), window.open and window.print() 
 * are often blocked. This utility uses an iframe-based approach with 
 * PDF download fallback.
 */

/** Detect if running inside a WebView */
export function isWebView(): boolean {
  const ua = navigator.userAgent || '';
  // Common WebView indicators
  return /wv|WebView|AppGeyser/i.test(ua) || 
    // Android WebView
    (/Android/.test(ua) && /Version\/[\d.]+/.test(ua) && !/Chrome\/[\d.]+ Mobile Safari/i.test(ua)) ||
    // iOS WebView
    (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua));
}

/** 
 * Print HTML content - works in both browser and WebView.
 * Uses iframe approach which is more compatible than window.open.
 * Falls back to Blob download if print still fails.
 */
export function printHTML(htmlContent: string, onReady?: (doc: Document) => void): void {
  // Remove any existing print iframe
  const existingFrame = document.getElementById('__print_iframe');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__print_iframe';
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:white;';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    // Fallback: download as HTML file
    downloadAsHTML(htmlContent);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  const waitForResources = () => {
    const images = Array.from(iframeDoc.images || []);
    const imgPromises = images.map(img => 
      img.complete ? Promise.resolve() : new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
    );
    const fontsReady = (iframeDoc as any).fonts?.ready?.catch?.(() => undefined) || Promise.resolve();
    return Promise.all([fontsReady, ...imgPromises]);
  };

  waitForResources().finally(() => {
    setTimeout(() => {
      if (onReady) {
        onReady(iframeDoc);
      }

      try {
        // Try printing via iframe
        iframe.contentWindow!.focus();
        iframe.contentWindow!.print();
      } catch (e) {
        console.warn('iframe print failed, trying fallback', e);
      }

      // Add close button overlay
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ إغلاق';
      closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;background:#ef4444;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:16px;cursor:pointer;font-family:Tajawal,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      closeBtn.onclick = () => {
        iframe.remove();
        closeBtn.remove();
        downloadBtn.remove();
      };
      document.body.appendChild(closeBtn);

      // Add download/share button
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = '📥 تحميل / مشاركة';
      downloadBtn.style.cssText = 'position:fixed;top:10px;right:110px;z-index:100000;background:#0d9488;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:16px;cursor:pointer;font-family:Tajawal,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      downloadBtn.onclick = () => {
        downloadAsHTML(htmlContent);
      };
      document.body.appendChild(downloadBtn);
    }, 400);
  });
}

/** Download HTML content as a file */
function downloadAsHTML(htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Try Web Share API first (works on mobile)
  if (navigator.share) {
    const file = new File([blob], 'تقرير.html', { type: 'text/html' });
    navigator.share({
      title: 'تقرير',
      files: [file]
    }).catch(() => {
      // Fallback to download
      triggerDownload(url, 'تقرير.html');
    });
  } else {
    triggerDownload(url, 'تقرير.html');
  }
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
