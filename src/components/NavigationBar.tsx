import { cn } from '@/lib/utils';
import { ScreenType } from '@/types/accounting';
import { 
  ShoppingCart, 
  Receipt, 
  CreditCard, 
  BookOpen, 
  FileText,
  BarChart3,
  Percent,
  RotateCcw,
  ArrowLeftRight,
  Settings as SettingsIcon,
  CheckSquare
} from 'lucide-react';

interface NavigationBarProps {
  activeScreen: ScreenType;
  onScreenChange: (screen: ScreenType) => void;
}

const navItems: { id: ScreenType; label: string; icon: React.ElementType }[] = [
  { id: 'sales', label: 'المبيعات', icon: ShoppingCart },
  { id: 'setup', label: 'التهيئة', icon: SettingsIcon },
  { id: 'payment', label: 'سند صرف', icon: CreditCard },
  { id: 'receipt', label: 'سند قبض', icon: Receipt },
  { id: 'opening-balance', label: 'الأرصدة الافتتاحية', icon: BookOpen },
  { id: 'chart-of-accounts', label: 'الدليل المحاسبي', icon: FileText },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'discount', label: 'الخصم', icon: Percent },
  { id: 'sales-return', label: 'مرتجع المبيعات', icon: RotateCcw },
  { id: 'currency-exchange', label: 'صرف عملة', icon: ArrowLeftRight },
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
