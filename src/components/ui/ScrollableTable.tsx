import { ReactNode } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    <div className="flex flex-col flex-1 overflow-hidden border rounded-lg">
      {/* Fixed Table Header */}
      <div className="shrink-0 overflow-hidden bg-muted">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              {columns.map((col) => (
                <TableHead key={col.key} className={`whitespace-nowrap text-right bg-muted ${col.className || ''}`}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
      </div>
      
      {/* Scrollable Table Body - Both vertical and horizontal */}
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          <Table>
            <TableBody>
              {data.map((item, index) => (
                <TableRow
                  key={getItemId(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`cursor-pointer transition-colors ${
                    selectedId === getItemId(item)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`whitespace-nowrap ${col.className || ''}`}>
                      {col.render(item, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
