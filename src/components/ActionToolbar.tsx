import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Download, Copy, Search, FileSpreadsheet, Info, Calculator as CalculatorIcon } from 'lucide-react';
import { Calculator } from '@/components/Calculator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActionToolbarProps {
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImport?: (file: File) => void;
  onDuplicate?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showDuplicate?: boolean;
  showCalculator?: boolean;
  importColumns?: string[];
  importTitle?: string;
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
  showCalculator = false,
  importColumns = [],
  importTitle = 'استيراد من Excel',
}: ActionToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setShowImportDialog(false);
  };

  const handleImportClick = () => {
    if (importColumns.length > 0) {
      setShowImportDialog(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleConfirmImport = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3 p-4 bg-card border-b border-border">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Import Instructions Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                {importTitle}
              </DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowImportDialog(false)}>
                  إلغاء
                </Button>
                <Button size="sm" onClick={handleConfirmImport}>
                  <Download className="w-4 h-4" />
                  موافق
                </Button>
              </div>
            </div>
            <DialogDescription className="text-right">
              يرجى التأكد من ترتيب الأعمدة في ملف Excel كالتالي:
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                يتم الاستيراد من الصف الثاني (الصف الأول للعناوين)
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold mb-2">ترتيب الأعمدة:</p>
              <div className="grid gap-1.5">
                {importColumns.map((column, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 text-sm bg-background rounded px-3 py-1.5 border"
                  >
                    <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span>{column}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Action buttons row */}
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
        {onAdd && (
          <Button onClick={onAdd} size="sm" variant="default" className="shrink-0">
            <Plus className="w-4 h-4" />
            إضافة
          </Button>
        )}
        {onImport && (
          <Button
            onClick={handleImportClick}
            size="sm"
            variant="secondary"
            className="shrink-0"
            aria-label="استيراد من Excel"
            title="استيراد من Excel"
          >
            <span className="text-base leading-none">📥</span>
          </Button>
        )}
        {onEdit && (
          <Button onClick={onEdit} size="sm" variant="secondary" className="shrink-0">
            <Edit className="w-4 h-4" />
            تعديل
          </Button>
        )}
        {onDelete && (
          <Button onClick={onDelete} size="sm" variant="destructive" className="shrink-0">
            <Trash2 className="w-4 h-4" />
            حذف
          </Button>
        )}
        {showCalculator && (
          <Button
            onClick={() => setShowCalc(true)}
            size="sm"
            variant="secondary"
            className="shrink-0 hidden"
            aria-label="الآلة الحاسبة"
          >
            <CalculatorIcon className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search row */}
      {onSearchChange && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pr-10"
            />
          </div>
          {searchColumns && searchColumns.length > 0 && (
            <Select
              value={searchColumn || 'all'}
              onValueChange={(v) => onSearchColumnChange?.(v)}
            >
              <SelectTrigger className="w-36 shrink-0" aria-label="عمود البحث">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">الكل</SelectItem>
                {searchColumns.map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    {col.header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}
