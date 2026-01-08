import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit, Download, Copy, Search, FileSpreadsheet, Info } from 'lucide-react';
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
  importColumns = [],
  importTitle = 'استيراد من Excel',
}: ActionToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

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
        <DialogContent className="max-w-md">
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
          <Button onClick={handleImportClick} size="sm" variant="secondary">
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
