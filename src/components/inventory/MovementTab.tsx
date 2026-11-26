import { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Item, itemMovements, loadSalesDocs, toBaseQty, useInventory } from '@/utils/inventory';
import { Btn, DataTable, Field, Sel, inputCls } from './kit';

interface Row { id: string; number: string; name: string; unit: string; inQty: number; outQty: number; balance: number; unitCost: number; total: number; item: Item }
const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString();

export function MovementTab() {
  const { data } = useInventory();
  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<Item | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [col, setCol] = useState('all'); const [q, setQ] = useState(''); const [pos, setPos] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const sales = useMemo(loadSalesDocs, [data]);

  const rows: Row[] = data.items.map(item => {
    const m = itemMovements(item, data.openings, sales); const smallest = item.units[0]?.unit || '';
    const inQ = m.reduce((s, x) => s + x.inQty, 0), outQ = m.reduce((s, x) => s + x.outQty, 0);
    const ins = m.filter(x => x.inQty > 0); const cost = ins.length ? ins.reduce((s, x) => s + x.inQty * x.unitCost, 0) / inQ : 0;
    return { id: item.id, number: item.number, name: item.name, unit: smallest, inQty: inQ, outQty: outQ, balance: inQ - outQ, unitCost: cost, total: (inQ - outQ) * cost, item };
  });
  const cols: { key: keyof Row; label: string }[] = [{ key: 'number', label: 'رقم الصنف' }, { key: 'name', label: 'اسم الصنف' }, { key: 'unit', label: 'الوحدة' }, { key: 'inQty', label: 'الوارد' }, { key: 'outQty', label: 'المنصرف' }, { key: 'balance', label: 'الرصيد الحالي' }, { key: 'unitCost', label: 'تكلفة الوحدة' }, { key: 'total', label: 'إجمالي التكلفة' }];
  const hits = q ? rows.filter(r => (col === 'all' ? cols : cols.filter(c => c.key === col)).some(c => String(r[c.key]).includes(q))) : [];
  const go = (i: number) => { if (!hits.length) return; const k = (i + hits.length) % hits.length; setPos(k); setSel(hits[k].id);
    box.current?.querySelector(`[data-row="${hits[k].id}"]`)?.scrollIntoView({ block: 'center' }); };

  if (detail) return <ItemCard item={detail} onClose={() => setDetail(null)} sales={sales} />;
  return <div className="flex-1 flex flex-col min-h-0" ref={box}>
    <h3 className="px-3 pt-2 font-bold text-foreground">حركة المخزون الإجمالي</h3>
    {searchOpen && <div className="m-2 p-2 border-2 border-border rounded-md bg-card flex flex-wrap items-center gap-2">
      <div className="w-32"><Sel value={col} onChange={setCol} options={[{ value: 'all', label: 'الكل' }, ...cols.map(c => ({ value: c.key, label: c.label }))]} /></div>
      <input className={inputCls + ' w-36'} value={q} placeholder="بحث" onChange={e => { setQ(e.target.value); setPos(0); }} />
      <span className="text-xs font-bold">{hits.length} نتيجة</span>
      <Btn onClick={() => go(0)}>🪬</Btn><Btn onClick={() => go(pos - 1)}>▶️</Btn><Btn onClick={() => go(pos + 1)}>◀️</Btn><Btn onClick={() => { setSearchOpen(false); setQ(''); }}>❎</Btn>
    </div>}
    <DataTable rows={rows} selected={sel} onSelect={setSel} onDouble={r => setDetail(r.item)} cols={[
      { label: '🔍', render: r => <span data-row={r.id} className="flex gap-1"><button onClick={e => { e.stopPropagation(); setSearchOpen(true); }}>🔍</button><button onClick={e => { e.stopPropagation(); setDetail(r.item); }}>...</button></span> },
      ...cols.map(c => ({ label: c.label, render: (r: Row) => typeof r[c.key] === 'number' ? fmt(r[c.key] as number) : String(r[c.key]) }))]} />
    <p className="px-3 pb-2 text-xs text-muted-foreground">الكميات بأصغر وحدة. اضغط مرتين على الصف أو ... لعرض حركة الصنف.</p>
  </div>;
}

function ItemCard({ item, onClose, sales }: { item: Item; onClose: () => void; sales: ReturnType<typeof loadSalesDocs> }) {
  const { data } = useInventory();
  const [wh, setWh] = useState('');
  const g = (id: string) => data.groups.find(x => x.id === id)?.name || '';
  const saleUnit = item.units.find(u => u.level === 'وحدة البيع')?.unit || item.units[0]?.unit || '';
  const f = toBaseQty(item, saleUnit, 1);
  const moves = itemMovements(item, data.openings, sales, wh || undefined).map((m, i) => ({ ...m, id: String(i) }));
  return <div className="flex-1 flex flex-col min-h-0">
    <div className="gradient-primary text-primary-foreground flex justify-between items-center px-3 py-2"><h3 className="font-bold">حركة الصنف</h3><button onClick={onClose} aria-label="إغلاق"><X className="w-5 h-5" /></button></div>
    <div className="grid grid-cols-2 gap-2 p-2">
      <Field label="رقم الصنف"><input className={inputCls} disabled value={item.number} /></Field>
      <Field label="اسم الصنف"><input className={inputCls} disabled value={item.name} /></Field>
      <Field label="المجموعة الرئيسية"><input className={inputCls} disabled value={g(item.mainGroupId)} /></Field>
      <Field label="المجموعة الفرعية"><input className={inputCls} disabled value={g(item.subGroupId)} /></Field>
      <Field label="المجموعة التفصيلية"><input className={inputCls} disabled value={g(item.detailGroupId)} /></Field>
      <Field label="وحدة البيع"><input className={inputCls} disabled value={saleUnit} /></Field>
      <Field label="المخزن" full><Sel value={wh} placeholder="الكل" onChange={setWh} options={data.warehouses.map(w => w.name)} /></Field>
    </div>
    <DataTable rows={moves} cols={[
      { label: 'رقم المستند', render: r => r.docNumber }, { label: 'تاريخ الحركة', render: r => r.date }, { label: 'البيان', render: r => r.description },
      { label: 'نوع الحركة', render: r => r.type }, { label: `الوارد (${saleUnit})`, render: r => fmt(r.inQty / f) }, { label: `المنصرف (${saleUnit})`, render: r => fmt(r.outQty / f) },
      { label: 'الرصيد الحالي', render: r => fmt(r.balance / f) }, { label: 'تكلفة الوحدة', render: r => fmt(r.unitCost * f) }, { label: 'سعر بيع الوحدة', render: r => fmt(r.price * f) }]} />
  </div>;
}
