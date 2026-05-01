/**
 * HTML escape utilities to prevent XSS when building HTML strings
 * for printing/PDF generation via document.write or innerHTML.
 *
 * Always wrap any user-controlled value (settings, account names,
 * descriptions, references, voucher numbers, etc.) before inserting
 * into an HTML template literal.
 */

/** Escape a value for safe insertion into HTML text/attribute context. */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/** Shorter alias used in template literals: ${e(value)} */
export const e = escapeHtml;

/**
 * Escape a URL for use in src/href attributes.
 * Only allows http(s):, data:image/, and blob: schemes.
 * Returns empty string for disallowed schemes (javascript:, etc.).
 */
export function escapeUrl(url: unknown): string {
  if (url === null || url === undefined) return '';
  const str = String(url).trim();
  // Block javascript:, vbscript:, file:, etc.
  const safe = /^(https?:|data:image\/[a-zA-Z0-9.+-]+;|blob:|\/|\.|#)/i.test(str);
  if (!safe) return '';
  return escapeHtml(str);
}
