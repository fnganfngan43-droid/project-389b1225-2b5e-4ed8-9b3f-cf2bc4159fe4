import { useState, useRef } from 'react';
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
import { Save, User, FileText, Image, Upload, X, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadProjectAsZip } from '@/utils/downloadService';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useAccounting();
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [formData, setFormData] = useState({
    userName: settings.userName,
    headerArabic: settings.headerArabic,
    headerEnglish: settings.headerEnglish,
    footerNote: settings.footerNote || '',
    logo: settings.logo || '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadCode = async () => {
    setIsDownloading(true);
    try {
      await downloadProjectAsZip();
      toast.success('تم تحميل ملف الكود بنجاح');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('فشل في تحميل الملف');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('حجم الصورة كبير جداً. الحد الأقصى 2 ميجابايت');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('يرجى اختيار ملف صورة صالح');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, logo: base64String }));
        toast.success('تم رفع الشعار بنجاح');
      };
      reader.onerror = () => {
        toast.error('فشل في قراءة الصورة');
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    updateSettings({
      userName: formData.userName,
      headerArabic: formData.headerArabic,
      headerEnglish: formData.headerEnglish,
      footerNote: formData.footerNote,
      logo: formData.logo,
    });
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
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
                id="logo-upload"
              />
              
              {formData.logo ? (
                <div className="relative w-24 h-24 mx-auto">
                  <img
                    src={formData.logo}
                    alt="الشعار"
                    className="w-full h-full object-contain rounded-lg border-2 border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  className="w-24 h-24 mx-auto rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors block"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">اختر صورة</p>
                  </div>
                </label>
              )}
              
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  {formData.logo ? 'تغيير الشعار' : 'رفع شعار'}
                </Button>
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

          {/* Download Code Button */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4" />
                تحميل الكود المصدري
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDownloadCode} 
                variant="outline" 
                className="w-full"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    تحميل ملف ZIP
                  </>
                )}
              </Button>
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
