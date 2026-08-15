import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FolderOpen, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  NATIVE_DIR_OPTIONS,
  NativeDirKey,
  selectNativeBackupFolder,
} from '@/utils/nativeBackup';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelected: (label: string) => void;
}

export function NativeFolderPicker({ open, onOpenChange, onSelected }: Props) {
  const [dir, setDir] = useState<NativeDirKey>('DOCUMENTS');
  const [subfolder, setSubfolder] = useState('AccountantBackups');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const res = await selectNativeBackupFolder(dir, subfolder.trim());
    setBusy(false);
    if (res.ok && res.label) {
      toast.success(`تم منح الإذن وحفظ المسار: ${res.label}`);
      onSelected(res.label);
      onOpenChange(false);
    } else {
      toast.error(res.error || 'تعذر اختيار المجلد');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="w-4 h-4 text-primary" />
            اختيار مجلد النسخ الاحتياطي
          </DialogTitle>
          <DialogDescription className="text-xs">
            اختر موقع التخزين في ذاكرة الهاتف. سيطلب التطبيق إذن القراءة/الكتابة ثم يتحقق من نجاح الحفظ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm">موقع التخزين</Label>
            <div className="space-y-1">
              {NATIVE_DIR_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setDir(o.key)}
                  className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                    dir === o.key
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <span>{o.label}</span>
                  {dir === o.key && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">اسم المجلد الفرعي (اختياري)</Label>
            <Input
              value={subfolder}
              onChange={(e) => setSubfolder(e.target.value)}
              placeholder="AccountantBackups"
            />
          </div>

          <Button className="w-full" disabled={busy} onClick={confirm}>
            {busy ? 'جاري التحقق...' : 'منح الإذن وحفظ المسار'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
