import { useState } from 'react';
import { ArrowRight, Settings2, Ruler, FolderTree, Warehouse, Building2, Package, ArrowLeftRight, PackageOpen, Layers, Tags, ClipboardCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SetupTab } from '@/components/inventory/SetupTab';
import { UnitsTab, ItemGroupsTab, WarehouseGroupsTab, WarehousesTab } from '@/components/inventory/MasterTabs';
import { ItemsTab } from '@/components/inventory/ItemsTab';
import { OpeningStockTab } from '@/components/inventory/OpeningStockTab';
import { MovementTab } from '@/components/inventory/MovementTab';

type Sub = 'setup' | 'units' | 'groups' | 'whgroups' | 'warehouses' | 'items' | 'movement' | 'opening' | 'levels' | 'pricing' | 'count' | 'close';
const items: { id: Sub; label: string; icon: React.ElementType }[] = [
  { id: 'setup', label: 'تهيئة المخزون', icon: Settings2 }, { id: 'units', label: 'وحدات القياس', icon: Ruler },
  { id: 'groups', label: 'مجموعات الأصناف', icon: FolderTree }, { id: 'whgroups', label: 'مجموعة مخازن', icon: Building2 },
  { id: 'warehouses', label: 'بيانات المخزون', icon: Warehouse }, { id: 'items', label: 'بيانات الأصناف', icon: Package },
  { id: 'movement', label: 'حركة المخزون', icon: ArrowLeftRight }, { id: 'opening', label: 'المخزون الافتتاحي', icon: PackageOpen },
  { id: 'levels', label: 'مستويات التسعير', icon: Layers }, { id: 'pricing', label: 'تسعير الأصناف', icon: Tags },
  { id: 'count', label: 'الجرد', icon: ClipboardCheck }, { id: 'close', label: 'إقفال المخزون', icon: Lock },
];

export function InventoryScreen({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<Sub | null>(null);
  return <div className="flex-1 flex flex-col overflow-hidden min-h-0">
    <div className="bg-card border-b-2 border-border shadow-soft px-4 py-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-foreground">المخزون{active ? ` - ${items.find(i => i.id === active)?.label}` : ''}</h2>
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
      {active === 'setup' && <SetupTab onExit={() => setActive(null)} />}
      {active === 'units' && <UnitsTab />}
      {active === 'groups' && <ItemGroupsTab />}
      {active === 'whgroups' && <WarehouseGroupsTab />}
      {active === 'warehouses' && <WarehousesTab />}
      {active === 'items' && <ItemsTab />}
      {active === 'movement' && <MovementTab />}
      {active === 'opening' && <OpeningStockTab />}
      {(['levels', 'pricing', 'count', 'close'] as Sub[]).includes(active!) && <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">هذه الشاشة سيتم تطويرها لاحقاً</div>}
    </main>
  </div>;
}
