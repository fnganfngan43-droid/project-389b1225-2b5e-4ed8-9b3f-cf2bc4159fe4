import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounting } from '@/contexts/AccountingContext';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Save, User, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useAccounting();
  
  const [formData, setFormData] = useState({
    userName: settings.userName,
    headerArabic: settings.headerArabic,
    headerEnglish: settings.headerEnglish,
    footerNote: settings.footerNote || '',
  });

  const handleSave = () => {
    updateSettings(formData);
    toast.success('تم حفظ الإعدادات بنجاح');
    onOpenChange(false);
  };

  const updateHeaderLine = (lang: 'arabic' | 'english', index: number, value: string) => {
    if (lang === 'arabic') {
      const newHeader = [...formData.headerArabic];
      newHeader[index] = value;
      setFormData(prev => ({ ...prev, headerArabic: newHeader }));
    } else {
      const newHeader = [...formData.headerEnglish];
      newHeader[index] = value;
      setFormData(prev => ({ ...prev, headerEnglish: newHeader }));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">الإعدادات</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* User Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                اسم المستخدم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.userName}
                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="اسم المستخدم"
              />
            </CardContent>
          </Card>

          {/* Arabic Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ترويسة الطباعة (عربي)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.headerArabic.map((line, index) => (
                <Input
                  key={index}
                  value={line}
                  onChange={(e) => updateHeaderLine('arabic', index, e.target.value)}
                  placeholder={`السطر ${index + 1}`}
                />
              ))}
            </CardContent>
          </Card>

          {/* English Header */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ترويسة الطباعة (إنجليزي)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.headerEnglish.map((line, index) => (
                <Input
                  key={index}
                  value={line}
                  onChange={(e) => updateHeaderLine('english', index, e.target.value)}
                  placeholder={`Line ${index + 1}`}
                  dir="ltr"
                  className="text-left"
                />
              ))}
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4" />
                الشعار
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-24 h-24 mx-auto rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <div className="text-center">
                  <Image className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">اختر صورة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                ملاحظة التذييل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.footerNote}
                onChange={(e) => setFormData(prev => ({ ...prev, footerNote: e.target.value }))}
                placeholder="حقل إضافي يظهر في نهاية التقرير"
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full" size="lg">
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
