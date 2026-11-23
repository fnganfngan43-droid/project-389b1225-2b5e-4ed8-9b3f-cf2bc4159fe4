import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, RotateCcw, Percent, BarChart3 } from 'lucide-react';
import { SalesInvoiceScreen } from './SalesInvoiceScreen';
import { DiscountScreen } from './DiscountScreen';
import { InvoiceVoucherReportScreen } from './InvoiceVoucherReportScreen';

type Sub = 'invoice' | 'return' | 'discount' | 'reports';
const items: { id: Sub; label: string; icon: React.ElementType }[] = [
  { id: 'invoice', label: 'فاتورة المبيعات', icon: FileText },
  { id: 'return', label: 'مرجوع المبيعات', icon: RotateCcw },
  { id: 'discount', label: 'خصم', icon: Percent },
  { id: 'reports', label: 'تقارير المبيعات', icon: BarChart3 },
];

export function SalesHubScreen({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<Sub | null>(null);
  const close = () => setActive(null);
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="bg-card border-b-2 border-border shadow-soft px-4 py-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-foreground">المبيعات{active ? ` - ${items.find(i => i.id === active)?.label}` : ''}</h2>
        <Button variant="outline" size="sm" onClick={onBack} className="min-h-[44px] gap-2"><ArrowRight className="w-4 h-4" />رجوع</Button>
      </div>
      <div className="bg-card border-b border-border flex overflow-x-auto py-2 px-2 gap-2 shrink-0">
        {items.map(it => { const Icon = it.icon; const on = active === it.id; return (
          <button key={it.id} onClick={() => setActive(it.id)} className={cn('flex flex-col items-center min-w-[90px] px-3 py-3 rounded-xl', on ? 'gradient-primary text-primary-foreground shadow-glow' : 'bg-secondary text-secondary-foreground')}>
            <Icon className="w-5 h-5 mb-1" /><span className="text-xs font-medium whitespace-nowrap">{it.label}</span>
          </button>); })}
      </div>
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {!active && <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">اختر من الشريط أعلاه</div>}
        {active === 'invoice' && <SalesInvoiceScreen onClose={close} />}
        {active === 'return' && <SalesInvoiceScreen isReturn onClose={close} />}
        {active === 'discount' && <DiscountScreen />}
        {active === 'reports' && <InvoiceVoucherReportScreen />}
      </main>
    </div>
  );
}
