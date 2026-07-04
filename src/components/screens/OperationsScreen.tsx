import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  FileText,
  BookOpen,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  ShoppingCart,
  RotateCcw,
  Percent,
} from 'lucide-react';
import { ChartOfAccountsScreen } from '@/components/screens/ChartOfAccountsScreen';
import { OpeningBalanceScreen } from '@/components/screens/OpeningBalanceScreen';
import { VoucherScreen } from '@/components/screens/VoucherScreen';
import { CurrencyExchangeScreen } from '@/components/screens/CurrencyExchangeScreen';
import { SalesScreen } from '@/components/screens/SalesScreen';
import { DiscountScreen } from '@/components/screens/DiscountScreen';

type OpsSubScreen =
  | 'chart-of-accounts'
  | 'opening-balance'
  | 'receipt'
  | 'payment'
  | 'currency-exchange'
  | 'sales'
  | 'sales-return'
  | 'discount';

interface OperationsScreenProps {
  onBack: () => void;
}

const opsNavItems: { id: OpsSubScreen; label: string; icon: React.ElementType }[] = [
  { id: 'chart-of-accounts', label: 'الدليل المحاسبي', icon: FileText },
  { id: 'opening-balance', label: 'الأرصدة الافتتاحية', icon: BookOpen },
  { id: 'receipt', label: 'سند قبض', icon: Receipt },
  { id: 'payment', label: 'سند صرف', icon: CreditCard },
  { id: 'currency-exchange', label: 'صرف عملة', icon: ArrowLeftRight },
  { id: 'sales', label: 'المبيعات', icon: ShoppingCart },
  { id: 'sales-return', label: 'مرتجع المبيعات', icon: RotateCcw },
  { id: 'discount', label: 'الخصم', icon: Percent },
];

const titles: Record<OpsSubScreen, string> = {
  'chart-of-accounts': 'الدليل المحاسبي',
  'opening-balance': 'الأرصدة الافتتاحية',
  'receipt': 'سند قبض',
  'payment': 'سند صرف',
  'currency-exchange': 'صرف عملة',
  'sales': 'المبيعات',
  'sales-return': 'مرتجع المبيعات',
  'discount': 'الخصم',
};

export function OperationsScreen({ onBack }: OperationsScreenProps) {
  const [active, setActive] = useState<OpsSubScreen>('chart-of-accounts');
  const [visited, setVisited] = useState<Set<OpsSubScreen>>(new Set([active]));

  if (!visited.has(active)) {
    visited.add(active);
    setVisited(new Set(visited));
  }

  const screenMap: Record<OpsSubScreen, JSX.Element> = {
    'chart-of-accounts': <ChartOfAccountsScreen />,
    'opening-balance': <OpeningBalanceScreen />,
    'receipt': <VoucherScreen type="receipt" />,
    'payment': <VoucherScreen type="payment" />,
    'currency-exchange': <CurrencyExchangeScreen />,
    'sales': <SalesScreen />,
    'sales-return': <SalesScreen isReturn />,
    'discount': <DiscountScreen />,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="bg-card border-b-2 border-border shadow-soft px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">
          شاشة العمليات - {titles[active]}
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

      <div className="bg-card border-b border-border shadow-soft">
        <div className="flex overflow-x-auto scrollbar-thin py-2 px-2 gap-2">
          {opsNavItems.map((item) => {
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

      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {(Object.keys(screenMap) as OpsSubScreen[])
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
