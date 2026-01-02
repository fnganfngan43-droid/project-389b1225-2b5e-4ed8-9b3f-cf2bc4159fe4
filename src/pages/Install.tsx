import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">تم التثبيت بنجاح!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              تطبيق رفيق المحاسب مثبت الآن على جهازك
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              فتح التطبيق
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-24 h-24 mx-auto mb-4">
            <img 
              src="/pwa-192x192.png" 
              alt="رفيق المحاسب" 
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
          <CardTitle className="text-2xl">تثبيت رفيق المحاسب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-center">
            ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
          </p>

          {isIOS ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">لتثبيت التطبيق على iPhone:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>اضغط على زر المشاركة</span>
                    <Share className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <span>اختر "إضافة إلى الشاشة الرئيسية"</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <span>اضغط "إضافة"</span>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstallClick} className="w-full" size="lg">
              <Download className="w-5 h-5 ml-2" />
              تثبيت التطبيق
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">لتثبيت التطبيق على Android:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>اضغط على قائمة المتصفح</span>
                    <MoreVertical className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <span>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Smartphone className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-primary">
              يعمل بدون إنترنت ويوفر تجربة سريعة كتطبيق أصلي
            </p>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            متابعة بدون تثبيت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
