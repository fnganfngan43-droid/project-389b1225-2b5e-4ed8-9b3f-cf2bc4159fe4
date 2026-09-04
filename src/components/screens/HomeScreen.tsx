import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScreenType } from '@/types/accounting';
import {
  Settings as SettingsIcon,
  Wrench,
  BarChart3,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  BookOpen,
  LogOut,
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSettingsClick: () => void;
  onLogout: () => void;
}

const homeItems: { id: ScreenType; label: string; icon: React.ElementType }[] = [
  { id: 'setup', label: 'التهيئة', icon: SettingsIcon },
  { id: 'chart-of-accounts', label: 'الدليل المحاسبي', icon: BookOpen },
  { id: 'operations', label: 'العمليات', icon: Wrench },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'sales', label: 'المبيعات', icon: ShoppingCart },
  { id: 'purchases', label: 'المشتريات', icon: ShoppingBag },
  { id: 'inventory', label: 'المخزون', icon: Boxes },
];

export function HomeScreen({ onNavigate, onSettingsClick, onLogout }: HomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Header frame */}
      <div className="bg-card border-b-2 border-border shadow-soft px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">الشاشة الرئيسية</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsClick}
            className="min-h-[44px] gap-2 select-none"
          >
            <SettingsIcon className="w-4 h-4" />
            الإعدادات
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="min-h-[44px] gap-2 select-none"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </Button>
        </div>
      </div>

      {/* Icons grid */}
      <main className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {homeItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-6 rounded-2xl',
                  'bg-card border-2 border-border shadow-soft',
                  'hover:bg-primary/10 active:scale-95 transition-all duration-200 select-none',
                  'min-h-[120px]',
                )}
              >
                <span className="w-14 h-14 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
                  <Icon className="w-7 h-7" />
                </span>
                <span className="text-sm font-bold text-foreground">{item.label}</span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
