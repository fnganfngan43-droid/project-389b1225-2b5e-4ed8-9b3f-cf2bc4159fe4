import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Coins, MapPin, FolderTree, Lock } from 'lucide-react';
import { CurrencyManagementScreen } from '@/components/screens/CurrencyManagementScreen';
import { GovernorateManagementScreen } from '@/components/screens/GovernorateManagementScreen';
import { AccountGroupManagementScreen } from '@/components/screens/AccountGroupManagementScreen';
import { PasswordSettingsScreen } from '@/components/screens/PasswordSettingsScreen';

type SetupSubScreen =
  | 'currency-management'
  | 'governorate-management'
  | 'group-management'
  | 'password-settings';

interface SetupScreenProps {
  onBack: () => void;
}

const setupNavItems: { id: SetupSubScreen; label: string; icon: React.ElementType }[] = [
  { id: 'currency-management', label: 'إدارة العملات', icon: Coins },
  { id: 'governorate-management', label: 'إدارة المحافظات', icon: MapPin },
  { id: 'group-management', label: 'إدارة المجموعات', icon: FolderTree },
  { id: 'password-settings', label: 'كلمة المرور', icon: Lock },
];

const titles: Record<SetupSubScreen, string> = {
  'currency-management': 'إدارة العملات',
  'governorate-management': 'إدارة المحافظات',
  'group-management': 'إدارة المجموعات',
  'password-settings': 'إعدادات كلمة المرور',
};

export function SetupScreen({ onBack }: SetupScreenProps) {
  const [active, setActive] = useState<SetupSubScreen>('currency-management');
  const [visited, setVisited] = useState<Set<SetupSubScreen>>(new Set([active]));

  if (!visited.has(active)) {
    visited.add(active);
    setVisited(new Set(visited));
  }

  const screenMap: Record<SetupSubScreen, JSX.Element> = {
    'currency-management': <CurrencyManagementScreen />,
    'governorate-management': <GovernorateManagementScreen />,
    'group-management': <AccountGroupManagementScreen />,
    'password-settings': <PasswordSettingsScreen />,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header frame */}
      <div className="bg-card border-b-2 border-border shadow-soft px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          شاشة التهيئة - {titles[active]}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="min-h-[44px] gap-2 select-none"
        >
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>
      </div>

      {/* Setup navigation bar */}
      <div className="bg-card border-b border-border shadow-soft">
        <div className="flex overflow-x-auto scrollbar-thin py-2 px-2 gap-2">
          {setupNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[80px] min-h-[44px] px-3 py-3 rounded-xl transition-all duration-300 select-none',
                  isActive
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-secondary-foreground hover:bg-primary/10',
                )}
              >
                <Icon className={cn('w-5 h-5 mb-1', isActive && 'animate-bounce-soft')} />
                <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {(Object.keys(screenMap) as SetupSubScreen[])
          .filter((k) => visited.has(k))
          .map((k) => (
            <div
              key={k}
              className={cn(
                'flex-1 flex flex-col overflow-hidden min-h-0',
                active === k ? '' : 'hidden',
              )}
            >
              {screenMap[k]}
            </div>
          ))}
      </main>
    </div>
  );
}
