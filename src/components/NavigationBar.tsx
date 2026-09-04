import { cn } from '@/lib/utils';
import { ScreenType } from '@/types/accounting';
import {
  BarChart3,
  Home,
  Settings as SettingsIcon,
  CheckSquare,
  FileText,
  Wrench,
} from 'lucide-react';

interface NavigationBarProps {
  activeScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
}

const navItems: { id: ScreenType; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'setup', label: 'التهيئة', icon: SettingsIcon },
  { id: 'operations', label: 'العمليات', icon: Wrench },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'invoice-voucher-report', label: 'تقرير الفواتير', icon: FileText },
  { id: 'reconciliation', label: 'المطابقات', icon: CheckSquare },
];

export function NavigationBar({ activeScreen, onScreenChange }: NavigationBarProps) {
  return (
    <div className="bg-card border-b border-border shadow-soft">
      <div className="flex overflow-x-auto scrollbar-thin py-2 px-2 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[80px] px-3 py-3 rounded-xl transition-all duration-300",
                isActive 
                  ? "gradient-primary text-primary-foreground shadow-glow" 
                  : "bg-secondary text-secondary-foreground hover:bg-primary/10"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "animate-bounce-soft")} />
              <span className="text-xs font-medium whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
