import { Button } from '@/components/ui/button';
import { useAccounting } from '@/contexts/AccountingContext';
import { Settings, LogOut, Calculator, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface MainHeaderProps {
  onSettingsClick: () => void;
  onLogout: () => void;
  title?: string;
}

export function MainHeader({ onSettingsClick, onLogout, title = 'الشاشة الرئيسية' }: MainHeaderProps) {
  const { settings } = useAccounting();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
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
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-soft">
            <Calculator className="w-5 h-5 text-accent-foreground" />
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
            onClick={onSettingsClick}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
