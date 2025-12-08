import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Download, Copy, Search } from 'lucide-react';

interface ActionToolbarProps {
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImport?: () => void;
  onDuplicate?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showDuplicate?: boolean;
}

export function ActionToolbar({
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onDuplicate,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  showDuplicate = false,
}: ActionToolbarProps) {
  return (
    <div className="space-y-3 p-4 bg-card border-b border-border">
      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        {onAdd && (
          <Button onClick={onAdd} size="sm" variant="default">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        )}
        {onDuplicate && showDuplicate && (
          <Button onClick={onDuplicate} size="sm" variant="secondary">
            <Copy className="w-4 h-4" />
            إضافة من
          </Button>
        )}
        {onImport && (
          <Button onClick={onImport} size="sm" variant="secondary">
            <Download className="w-4 h-4" />
            استيراد Excel
          </Button>
        )}
        {onEdit && (
          <Button onClick={onEdit} size="sm" variant="secondary">
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
        )}
        {onDelete && (
          <Button onClick={onDelete} size="sm" variant="destructive">
            <Trash2 className="w-4 h-4" />
            حذف
          </Button>
        )}
      </div>

      {/* Search row */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pr-10"
          />
        </div>
      )}
    </div>
  );
}
