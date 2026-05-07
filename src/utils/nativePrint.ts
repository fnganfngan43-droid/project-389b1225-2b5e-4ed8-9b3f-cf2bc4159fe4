/**
 * Native print + PDF save helpers.
 * On Capacitor Android/iOS:
 *   - print(): hands HTML to the platform print framework (real printer / Save as PDF).
 *   - savePdf(): writes a PDF Blob to the device Documents folder and shares it.
 * On the web: falls back to existing iframe printing and browser download.
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Printer } from '@bcyesil/capacitor-plugin-printer';
import { smartDownload, printHTML } from './webviewPrint';

function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function nativePrintHtml(htmlContent: string, name = 'تقرير'): Promise<void> {
  if (isNative()) {
    try {
      await Printer.print({ content: htmlContent, name, orientation: 'portrait' });
      return;
    } catch (e) {
      console.warn('Native print failed, falling back to iframe', e);
    }
  }
  printHTML(htmlContent);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

export async function nativeSavePdf(blob: Blob, filename = 'تقرير.pdf'): Promise<void> {
  if (!isNative()) {
    smartDownload(blob, filename);
    return;
  }
  try {
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    try {
      await Share.share({
        title: filename,
        text: filename,
        url: written.uri,
        dialogTitle: 'مشاركة / فتح PDF',
      });
    } catch { /* user cancelled */ }
  } catch (e) {
    console.warn('Native PDF save failed, falling back', e);
    smartDownload(blob, filename);
  }
}
