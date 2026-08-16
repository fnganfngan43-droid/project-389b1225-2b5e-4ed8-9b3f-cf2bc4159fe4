export interface SearchColumn {
  key: string;
  header: string;
}

/**
 * Generic search matcher: searches all columns when column === 'all',
 * otherwise only the selected column key.
 */
export function matchesSearch<T>(
  item: T,
  term: string,
  column: string,
  columns: SearchColumn[]
): boolean {
  const q = (term || '').trim().toLowerCase();
  if (!q) return true;
  const keys = column && column !== 'all' ? [column] : columns.map((c) => c.key);
  return keys.some((k) => {
    const value = (item as Record<string, unknown>)[k];
    if (value === undefined || value === null) return false;
    return String(value).toLowerCase().includes(q);
  });
}
