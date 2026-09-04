import { Button } from '@/components/ui/button';
import { useAccounting } from '@/contexts/AccountingContext';
import { LogOut, Download, Home } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface MainHeaderProps {
  onHomeClick: () => void;
  onLogout: () => void;
  title?: string;
  showLogout?: boolean;
}

/** True when the app is already installed/standalone (PWA or Android APK WebView). */
function detectInstalled(): boolean {
  // PWA installed (Chrome/Edge/Safari standalone)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  // iOS Safari standalone
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }
  // Android APK WebView — the native print bridge is injected only inside the installed APK
  if ((window as Window & { AndroidPrint?: unknown }).AndroidPrint) {
    return true;
  }
  // Generic WebView signals (AppsGeyser / Capacitor / Android WebView)
  const ua = navigator.userAgent || '';
  if (/wv|WebView|AppGeyser|Capacitor/i.test(ua)) {
    return true;
  }
  return false;
}

export function MainHeader({ onHomeClick, onLogout, title = 'الشاشة الرئيسية', showLogout = true }: MainHeaderProps) {
  const { settings } = useAccounting();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (detectInstalled()) {
      setIsInstalled(true);
    }

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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Redirect to install page for iOS or manual instructions
      window.location.href = '/install';
    }
  };

  return (
    <header className="gradient-primary text-primary-foreground p-4 shadow-card">
      <div className="flex items-center justify-between">
        {/* Right side - Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-soft border-2 border-accent/60">
            <img src="/pwa-192x192.png" alt="شعار التطبيق" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-primary-foreground/70">مرحباً، {settings.userName}</p>
          </div>
        </div>

        {/* Left side - Actions */}
        <div className="flex items-center gap-2">
          {!isInstalled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleInstallClick}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="تثبيت التطبيق"
            >
              <Download className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onHomeClick}
            className="text-primary-foreground hover:bg-primary-foreground/10"
            title="الرجوع إلى الشاشة الرئيسية"
          >
            <Home className="w-5 h-5" />
          </Button>
          {showLogout && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
