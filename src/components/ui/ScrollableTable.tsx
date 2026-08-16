import { ReactNode } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
    <div className="flex flex-col flex-1 overflow-hidden border-2 border-border rounded-lg">
      <ScrollArea className="flex-1">
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`h-12 px-4 text-right align-middle font-medium text-foreground whitespace-nowrap bg-muted border border-border ${col.className || ''}`}
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
                  selectedId === getItemId(item)
                    ? 'bg-primary/10'
                    : 'hover:bg-muted/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`p-4 align-middle whitespace-nowrap border border-border ${col.className || ''}`}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}