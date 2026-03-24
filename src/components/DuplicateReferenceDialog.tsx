import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DuplicateReferenceDialogProps {
  open: boolean;
  referenceNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DuplicateReferenceDialog({ open, referenceNumber, onConfirm, onCancel }: DuplicateReferenceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            تنبيه: رقم مرجع مكرر
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            رقم المرجع <span className="font-bold text-foreground">"{referenceNumber}"</span> مستخدم مسبقاً. هل تريد الاستمرار؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:flex-row-reverse">
          <AlertDialogCancel onClick={onCancel}>تراجع</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>موافق</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
