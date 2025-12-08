import { Button } from '@/components/ui/button';
import { useAccounting } from '@/contexts/AccountingContext';
import { Settings, LogOut, Calculator } from 'lucide-react';

interface MainHeaderProps {
  onSettingsClick: () => void;
  onLogout: () => void;
  title?: string;
}

export function MainHeader({ onSettingsClick, onLogout, title = 'الشاشة الرئيسية' }: MainHeaderProps) {
  const { settings } = useAccounting();

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
