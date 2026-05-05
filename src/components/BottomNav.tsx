import { cn } from '@/lib/utils';
import { ScreenType } from '@/types/accounting';
import { Settings2, FileText, ShoppingCart, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  activeScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
}

const items: { id: ScreenType; label: string; icon: React.ElementType }[] = [
  { id: 'chart-of-accounts', label: 'الحسابات', icon: FileText },
  { id: 'sales', label: 'العمليات', icon: ShoppingCart },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'group-management', label: 'الإعداد', icon: Settings2 },
];

export function BottomNav({ activeScreen, onScreenChange }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border shadow-card safe-bottom"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}
      role="navigation"
      aria-label="التنقل السفلي"
    >
      <ul className="flex justify-around items-stretch">
        {items.map((it) => {
          const Icon = it.icon;
          const active = activeScreen === it.id;
          return (
            <li key={it.id} className="flex-1">
              <button
                onClick={() => onScreenChange(it.id)}
                className={cn(
                  'w-full flex flex-col items-center justify-center gap-0.5 px-2 py-2 transition-colors',
                  'min-h-[56px]',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
