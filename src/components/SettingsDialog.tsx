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
import { Save, User, FileText, Image, Upload, X, Download, UploadCloud, DatabaseBackup, RefreshCw, FolderOpen } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { isAutoBackupEnabled, setAutoBackupEnabled, triggerBackupDownload } from '@/hooks/useAutoBackup';
import { pickBackupFolder, getBackupFolderName, clearBackupFolder, isFolderPickerSupported } from '@/utils/backupFolder';
import { toast } from 'sonner';
import { encryptString } from '@/utils/secureStorage';

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
    logo: settings.logo || '',
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [autoBackup, setAutoBackup] = useState(isAutoBackupEnabled());
  const [backupFolder, setBackupFolder] = useState<string | null>(getBackupFolderName());
  const folderSupported = isFolderPickerSupported();

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

          {/* Backup & Restore */}
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DatabaseBackup className="w-4 h-4 text-primary" />
                النسخ الاحتياطي واستعادة البيانات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Last backup info */}
              {(() => {
                const lastBackup = localStorage.getItem('last_backup_date');
                return (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="text-muted-foreground">
                      آخر نسخة احتياطية: {' '}
                      <span className="font-medium text-foreground">
                        {lastBackup || 'لم يتم إنشاء نسخة بعد'}
                      </span>
                    </p>
                  </div>
                );
              })()}

              <p className="text-xs text-muted-foreground">
                💡 احفظ نسخة احتياطية في ذاكرة هاتفك لاستعادة بياناتك عند الحاجة
              </p>

              {/* Backup folder selector */}
              <div className="p-3 rounded-lg border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-medium">مسار حفظ النسخة الاحتياطية</Label>
                </div>
                <div className="text-xs text-muted-foreground break-all">
                  {backupFolder
                    ? <>المجلد المختار: <span className="font-medium text-foreground">{backupFolder}</span></>
                    : 'لم يتم اختيار مجلد - سيتم استخدام مجلد التنزيلات الافتراضي'}
                </div>
                {!folderSupported && (
                  <div className="text-xs text-destructive">
                    اختيار المجلد غير مدعوم في هذا المتصفح/التطبيق. سيتم استخدام مجلد التنزيلات الافتراضي.
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!folderSupported}
                    onClick={async () => {
                      if (isNativePlatform()) {
                        setNativePickerOpen(true);
                        return;
                      }
                      const name = await pickBackupFolder();
                      if (name) {
                        setBackupFolder(name);
                        toast.success(`تم اختيار المجلد: ${name}`);
                      } else {
                        toast.error('لم يتم اختيار مجلد');
                      }
                    }}
                  >
                    <FolderOpen className="w-4 h-4 ml-1" />
                    {backupFolder ? 'تغيير المجلد' : 'اختيار مجلد'}
                  </Button>
                  {backupFolder && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearBackupFolder();
                        setBackupFolder(null);
                        toast.success('تم إلغاء المجلد المحدد');
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Auto backup toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <Label htmlFor="auto-backup" className="text-sm font-medium cursor-pointer">
                    نسخ احتياطي تلقائي (كل 30 دقيقة)
                  </Label>
                </div>
                <Switch
                  id="auto-backup"
                  checked={autoBackup}
                  onCheckedChange={(checked) => {
                    setAutoBackup(checked);
                    setAutoBackupEnabled(checked);
                    toast.success(checked ? 'تم تفعيل النسخ الاحتياطي التلقائي' : 'تم إيقاف النسخ الاحتياطي التلقائي');
                  }}
                />
              </div>

              <Button
                variant="default"
                className="w-full"
                onClick={async () => {
                  const success = await triggerBackupDownload();
                  if (success) {
                    toast.success(backupFolder
                      ? `تم حفظ النسخة في المجلد: ${backupFolder}`
                      : 'تم حفظ نسخة المحاسب في ذاكرة الهاتف');
                  } else {
                    toast.error('لا توجد بيانات للنسخ');
                  }
                }}
              >
                <Download className="w-4 h-4 ml-2" />
                حفظ نسخة المحاسب في الهاتف
              </Button>

              <input
                type="file"
                ref={backupInputRef}
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    try {
                      const content = ev.target?.result as string;
                      const parsed = JSON.parse(content);
                      if (!parsed.accounts && !parsed.vouchers && !parsed.settings) {
                        toast.error('ملف النسخة الاحتياطية غير صالح');
                        return;
                      }
                      // Re-encrypt restored data with the device key before storing
                      const payload = await encryptString(content);
                      localStorage.setItem('accounting_data', payload);
                      toast.success('تم استعادة البيانات بنجاح. سيتم إعادة تحميل التطبيق...');
                      setTimeout(() => window.location.reload(), 1500);
                    } catch {
                      toast.error('فشل في قراءة ملف النسخة الاحتياطية');
                    }
                  };
                  reader.readAsText(file);
                  if (backupInputRef.current) backupInputRef.current.value = '';
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => backupInputRef.current?.click()}
              >
                <UploadCloud className="w-4 h-4 ml-2" />
                استعادة من نسخة احتياطية من الهاتف
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
