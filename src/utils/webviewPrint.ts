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

/** Native Android print bridge (exposed by the APK WebView), if available */
function getNativePrint(): any {
  const bridge = (window as any).AndroidPrint;
  return bridge && typeof bridge.printHtml === 'function' ? bridge : null;
}

/** 
 * Print HTML content - works in both browser and WebView.
 * Uses iframe approach which is more compatible than window.open.
 * Falls back to Blob download if print still fails.
 */
export function printHTML(htmlContent: string, onReady?: (doc: Document) => void): void {
  // Native Android printing (phone printer / Save as PDF) when running inside the APK
  const native = getNativePrint();
  if (native) {
    try {
      native.printHtml(htmlContent, 'تقرير');
      return;
    } catch (e) {
      console.warn('Native print failed, falling back to iframe', e);
    }
  }

  // Remove any existing print iframe
  const existingFrame = document.getElementById('__print_iframe');
  if (existingFrame) existingFrame.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__print_iframe';
  iframe.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;border:none;background:white;';

  document.body.appendChild(iframe);


  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) {
    alert('تعذّر فتح نافذة الطباعة في هذا التطبيق.');
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

      // Add download/share button (PDF)
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = '📥 تحميل PDF / مشاركة';
      downloadBtn.style.cssText = 'position:fixed;top:10px;right:110px;z-index:100000;background:#0d9488;color:white;border:none;padding:8px 16px;border-radius:8px;font-size:16px;cursor:pointer;font-family:Tajawal,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
      downloadBtn.onclick = async () => {
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = '⏳ جارٍ إنشاء PDF...';
        downloadBtn.disabled = true;
        try {
          await downloadIframeAsPDF(iframe, 'تقرير.pdf');
        } catch (err) {
          console.error('PDF download failed', err);
          alert('تعذّر إنشاء ملف PDF. حاول مرة أخرى.');
        } finally {
          downloadBtn.textContent = originalText;
          downloadBtn.disabled = false;
        }
      };
      document.body.appendChild(downloadBtn);
    }, 400);
  });
}

/** Render the iframe content to an A4 PDF using pdfmake (WebView-compatible). */
async function downloadIframeAsPDF(iframe: HTMLIFrameElement, filename: string): Promise<void> {
  const { downloadIframeAsPdf } = await import('./pdfMakeService');
  await downloadIframeAsPdf(iframe, filename);
}

/**
 * Smart download tuned for Android WebView (AppMySite/AppsGeyser/Capacitor).
 * Order:
 *   1. Web Share API with File — opens the native share sheet so user can save/open
 *      the actual PDF in any app (Drive, Files, WhatsApp, PDF viewer…).
 *   2. Open the PDF blob in a new tab — the OS PDF viewer handles it; user can save.
 *   3. Anchor download with correct MIME (application/pdf) so WebView doesn't
 *      mistake it for HTML.
 */
export async function smartDownload(blob: Blob, filename: string): Promise<void> {
  // Infer/normalize MIME so Android WebView writes the correct file extension.
  const inferredType = inferMime(blob, filename);
  const finalBlob = blob.type === inferredType
    ? blob
    : new Blob([blob], { type: inferredType });

  const { toast } = await import('sonner');
  const downloadsPath = '/storage/emulated/0/Download/' + filename;
  const notifySaved = (path: string, extra?: string) => {
    toast.success('تم حفظ الملف على الجهاز', {
      description: `📁 المسار: ${path}${extra ? `\n${extra}` : ''}`,
      duration: 8000,
    });
  };

  // 1) Anchor download first so the file is actually saved to the device storage.
  let saved = false;
  try {
    await anchorDownload(finalBlob, filename);
    saved = true;
    notifySaved(downloadsPath, 'جاري فتح خيارات المشاركة...');
  } catch (e) {
    console.warn('Anchor download failed', e);
  }

  // 2) Then open the native share sheet so the user can share/open it.
  try {
    const file = new File([finalBlob], filename, { type: inferredType });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
      await nav.share({ title: filename, text: `الملف: ${filename}`, files: [file] });
      if (!saved) notifySaved(downloadsPath);
      return;
    }
  } catch (e) {
    console.warn('Web Share failed, falling back', e);
  }

  // 3) Fallback: open the PDF inline so the OS viewer can save/share it.
  if (!saved && inferredType === 'application/pdf') {
    try {
      const url = URL.createObjectURL(finalBlob);
      const win = window.open(url, '_blank');
      if (win) {
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        notifySaved(downloadsPath);
        return;
      }
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('window.open failed, falling back', e);
    }
  }

  if (!saved) {
    await anchorDownload(finalBlob, filename);
    notifySaved(downloadsPath);
  }
}

function inferMime(blob: Blob, filename: string): string {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'csv') return 'text/csv;charset=utf-8';
  if (ext === 'json') return 'application/json;charset=utf-8';
  if (ext === 'html' || ext === 'htm') return 'text/html;charset=utf-8';
  return blob.type || 'application/octet-stream';
}

async function anchorDownload(blob: Blob, filename: string): Promise<void> {
  // Prefer blob URL on modern WebViews; data URI as a secondary fallback.
  const tryAnchor = (href: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_self';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
  };

  try {
    const url = URL.createObjectURL(blob);
    tryAnchor(url);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    const reader = new FileReader();
    await new Promise<void>((resolve) => {
      reader.onloadend = () => {
        tryAnchor(reader.result as string);
        resolve();
      };
      reader.readAsDataURL(blob);
    });
  }
}

