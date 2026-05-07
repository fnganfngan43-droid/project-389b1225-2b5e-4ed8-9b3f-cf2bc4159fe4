/**
 * pdfmake-based PDF generation that works inside WebView (AppMySite, AppsGeyser, etc.).
 * Unlike html2canvas+jsPDF, pdfmake builds the PDF directly from data structures,
 * so it does not depend on DOM rendering, canvas tainting, or window.print.
 *
 * Strategy: walk the printable iframe/document, extract semantic blocks
 * (headings, key/value pairs, tables) and feed them to pdfmake along with
 * an Arabic font (Cairo) loaded as base64 VFS at runtime.
 */

import pdfMake from 'pdfmake/build/pdfmake';
import type { TDocumentDefinitions, Content, TableCell } from 'pdfmake/interfaces';
import { smartDownload } from './webviewPrint';
import { nativeSavePdf } from './nativePrint';

// ----- Arabic font (Cairo) loaded once on demand -----

let fontsReady: Promise<void> | null = null;

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch font: ${url}`);
  const buf = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

async function ensureArabicFont(): Promise<void> {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    try {
      const [normal, bold] = await Promise.all([
        fetchAsBase64('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvalIkTpu0xg.ttf'),
        fetchAsBase64('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvalIvTpu0xg.ttf'),
      ]);
      const vfs: Record<string, string> = (pdfMake as any).vfs || {};
      vfs['Cairo-Regular.ttf'] = normal;
      vfs['Cairo-Bold.ttf'] = bold;
      (pdfMake as any).vfs = vfs;
      (pdfMake as any).fonts = {
        Cairo: {
          normal: 'Cairo-Regular.ttf',
          bold: 'Cairo-Bold.ttf',
          italics: 'Cairo-Regular.ttf',
          bolditalics: 'Cairo-Bold.ttf',
        },
      };
    } catch (err) {
      console.warn('Cairo font load failed, falling back to Roboto', err);
      try {
        // @ts-ignore
        await import('pdfmake/build/vfs_fonts');
      } catch { /* noop */ }
    }
  })();
  return fontsReady;
}

// ----- DOM -> pdfmake content extraction -----

function cleanText(s: string | null | undefined): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

function extractTableRows(table: HTMLTableElement): TableCell[][] {
  const rows: TableCell[][] = [];
  const trList = Array.from(table.querySelectorAll('tr'));
  for (const tr of trList) {
    const cells = Array.from(tr.querySelectorAll('th,td'));
    if (cells.length === 0) continue;
    const isHeader = cells[0].tagName.toLowerCase() === 'th';
    rows.push(
      cells.map((c) => {
        const txt = cleanText((c as HTMLElement).innerText || c.textContent || '');
        const cell: TableCell = isHeader
          ? { text: txt, bold: true, alignment: 'center', fillColor: '#87CEEB' }
          : { text: txt, alignment: 'right' };
        return cell;
      })
    );
  }
  return rows;
}

function extractContentFromDoc(doc: Document): Content[] {
  const content: Content[] = [];
  const root = doc.body;
  if (!root) return content;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'table'].includes(tag)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    },
  });

  const seenTables = new Set<HTMLTableElement>();
  let node: Node | null = walker.nextNode();
  while (node) {
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === 'table') {
      const tbl = el as HTMLTableElement;
      if (!seenTables.has(tbl)) {
        seenTables.add(tbl);
        const body = extractTableRows(tbl);
        if (body.length > 0) {
          content.push({
            table: { headerRows: 1, widths: Array(body[0].length).fill('*'), body },
            layout: {
              hLineWidth: () => 0.6,
              vLineWidth: () => 0.6,
              hLineColor: () => '#000000',
              vLineColor: () => '#000000',
            },
            margin: [0, 4, 0, 4],
          });
        }
      }
    } else {
      const txt = cleanText(el.innerText || el.textContent || '');
      if (txt) {
        const sizeMap: Record<string, number> = { h1: 18, h2: 16, h3: 14, h4: 12 };
        content.push({
          text: txt,
          fontSize: sizeMap[tag] || 12,
          bold: true,
          alignment: 'center',
          margin: [0, 4, 0, 4],
        });
      }
    }
    node = walker.nextNode();
  }

  if (content.length === 0) {
    const txt = cleanText(root.innerText || root.textContent || '');
    if (txt) content.push({ text: txt, alignment: 'right' });
  }

  return content;
}

// ----- Public API -----

export interface PdfMakeOptions {
  filename?: string;
  title?: string;
  pageOrientation?: 'portrait' | 'landscape';
}

async function buildDoc(content: Content[], opts: PdfMakeOptions = {}): Promise<TDocumentDefinitions> {
  await ensureArabicFont();
  const usingCairo = !!(pdfMake as any).fonts?.Cairo;
  return {
    pageSize: 'A4',
    pageOrientation: opts.pageOrientation || 'portrait',
    pageMargins: [24, 28, 24, 28],
    defaultStyle: {
      font: usingCairo ? 'Cairo' : 'Roboto',
      alignment: 'right',
      fontSize: 10,
    },
    info: { title: opts.title || 'تقرير' },
    content,
  };
}

export async function generatePdfBlobFromDoc(
  doc: Document,
  opts: PdfMakeOptions = {}
): Promise<Blob> {
  const content = extractContentFromDoc(doc);
  const def = await buildDoc(content, opts);
  return new Promise<Blob>((resolve, reject) => {
    try {
      (pdfMake as any).createPdf(def).getBlob((blob: Blob) => resolve(blob));
    } catch (e) {
      reject(e);
    }
  });
}

export async function downloadHtmlAsPdf(htmlContent: string, filename = 'تقرير.pdf'): Promise<void> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const blob = await generatePdfBlobFromDoc(doc, { filename, title: filename });
  await nativeSavePdf(blob, filename);
}

export async function downloadIframeAsPdf(iframe: HTMLIFrameElement, filename = 'تقرير.pdf'): Promise<void> {
  const doc = iframe.contentDocument;
  if (!doc) throw new Error('iframe document not available');
  const blob = await generatePdfBlobFromDoc(doc, { filename, title: filename });
  await nativeSavePdf(blob, filename);
}

export async function generatePdfBlobFromHtml(htmlContent: string, opts: PdfMakeOptions = {}): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  return generatePdfBlobFromDoc(doc, opts);
}
