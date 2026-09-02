import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
}

interface ScrollableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  selectedId?: string;
  getItemId: (item: T) => string;
  emptyIcon?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ScrollableTable<T>({
  data,
  columns,
  onRowClick,
  selectedId,
  getItemId,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription = 'اضغط على "إضافة" لإنشاء عنصر جديد',
}: ScrollableTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyIcon}
        <p className="text-lg">{emptyTitle}</p>
        <p className="text-sm">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin border-2 border-border rounded-lg bg-card">
      <table className="w-full min-w-max border-collapse text-[13px] text-foreground">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sticky top-0 z-10 h-11 px-3 text-right align-middle font-bold whitespace-nowrap border border-border bg-[#87CEEB] text-black text-[14px] ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={getItemId(item)}
              onClick={() => onRowClick?.(item)}
              className={`cursor-pointer transition-colors ${
                selectedId === getItemId(item) ? 'bg-primary/20' : 'hover:bg-muted/50'
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 align-middle whitespace-nowrap border border-border ${col.className || ''}`}
                >
                  {col.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
