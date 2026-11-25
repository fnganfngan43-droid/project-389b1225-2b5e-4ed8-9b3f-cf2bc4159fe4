import { useState } from 'react';
import { toast } from 'sonner';
import { useAccounting } from '@/contexts/AccountingContext';
import { DEFAULT_SETTINGS, InventorySettings, LINK_FIELDS, LinkRow, uid, useInventory } from '@/utils/inventory';
import { Bar, Btn, Field, Sel, YesNo, inputCls } from './kit';
import { cn } from '@/lib/utils';

const TABS = ['الإعدادات العامة', 'الربط المحاسبي', 'إعدادات الفواتير', 'إعدادات الأصناف', 'إعدادات الجرد'];

export function SetupTab({ onExit }: { onExit: () => void }) {
  const { data, update } = useInventory();
  const [tab, setTab] = useState(0);
  const [s, setS] = useState<InventorySettings>(data.settings);
  const set = (p: Partial<InventorySettings>) => setS(x => ({ ...x, ...p }));
  const hasMoves = data.openings.length > 0;
  const methodLocked = data.settingsSaved && hasMoves;

  const save = () => {
    const incomplete = data.links.some(r => !r.groupId || r.links.some(l => !l.accountNumber));
    if (data.links.length === 0 || incomplete) { setTab(1); return toast.error('اربط جميع حسابات المخزون في تبويب الربط المحاسبي قبل الحفظ'); }
    update(d => ({ ...d, settings: s, settingsSaved: true })); toast.success('تم حفظ تهيئة المخزون');
  };

  return <div className="flex-1 flex flex-col min-h-0">
    <div className="flex overflow-x-auto gap-1 p-2 bg-card border-b border-border shrink-0">
      {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} className={cn('px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap border border-border', tab === i ? 'gradient-primary text-primary-foreground' : 'bg-secondary')}>{t}</button>)}
    </div>
    <div className="flex-1 overflow-auto min-h-0">
      {tab === 0 && <div className="p-3 grid grid-cols-2 gap-3">
        <Field label="طريقة تسعير المخزون *">
          {methodLocked ? <input className={inputCls} value={s.costMethod} disabled title="لا يمكن التغيير بعد تسجيل حركات" />
            : <Sel value={s.costMethod} onChange={v => set({ costMethod: v as InventorySettings['costMethod'] })} options={['المتوسط المرجح', 'FIFO', 'LIFO']} />}
        </Field>
        <Field label="السماح بالرصيد السالب *"><YesNo value={s.allowNegative} onChange={v => set({ allowNegative: v })} /></Field>
        <Field label="تفعيل الباركود *"><YesNo value={s.barcode} onChange={v => set({ barcode: v })} /></Field>
        <Field label="تفعيل وحدات الصنف *"><YesNo value={s.itemUnits} onChange={v => set({ itemUnits: v })} /></Field>
        <Field label="تفعيل الرقم التسلسلي"><YesNo value={s.serial} onChange={v => set({ serial: v })} /></Field>
        <Field label="تفعيل الدفعات وتاريخ الصلاحية"><YesNo value={s.batches} onChange={v => set({ batches: v })} /></Field>
      </div>}
      {tab === 1 && <LinksTab />}
      {tab === 2 && <div className="p-3 grid grid-cols-2 gap-3">
        <Field label="تحديث تكلفة الصنف *"><Sel value={s.updateCost} onChange={v => set({ updateCost: v as InventorySettings['updateCost'] })} options={['تلقائي عند الحفظ', 'يدوي']} /></Field>
        <Field label="إجباري اختيار المخزن *"><YesNo value={s.requireWarehouse} onChange={v => set({ requireWarehouse: v })} /></Field>
        <Field label="طباعة تكلفة الوحدة في الفاتورة"><YesNo value={s.printUnitCost} onChange={v => set({ printUnitCost: v })} /></Field>
        <Field label="السماح بالبيع أقل من سعر التكلفة"><Sel value={s.belowCost} onChange={v => set({ belowCost: v as InventorySettings['belowCost'] })} options={['تنبيه قبل الموافقة', 'نعم اسمح', 'لا اسمح']} /></Field>
        <Field label="السماح بتعديل السعر بعد الحفظ"><YesNo value={s.editPriceAfterSave} onChange={v => set({ editPriceAfterSave: v })} /></Field>
        <Field label="السماح بخصم إجمالي بعد الأصناف"><YesNo value={s.totalDiscount} onChange={v => set({ totalDiscount: v })} /></Field>
      </div>}
      {tab === 3 && <div className="p-3 grid grid-cols-2 gap-3">
        <Field label="طريقة ترميز الأصناف *"><Sel value={s.codeMethod} onChange={v => set({ codeMethod: v as InventorySettings['codeMethod'] })} options={['تلقائي', 'يدوي']} /></Field>
        <Field label="عدد خانات كود الصنف *"><input type="number" className={inputCls} value={s.codeDigits} onChange={e => set({ codeDigits: Number(e.target.value) || 1 })} /></Field>
        <Field label="إجباري ربط المجموعة للصنف *"><YesNo value={s.requireGroup} onChange={v => set({ requireGroup: v })} /></Field>
        <Field label="تفعيل صورة الصنف"><YesNo value={s.itemImage} onChange={v => set({ itemImage: v })} /></Field>
        <Field label="تفعيل تنبيه حد الطلب الأدنى *"><YesNo value={s.minAlert} onChange={v => set({ minAlert: v })} /></Field>
      </div>}
      {tab === 4 && <div className="p-3 grid grid-cols-2 gap-3">
        <Field label="قفل المخزون بعد تاريخ الجرد"><input type="date" className={inputCls} value={s.lockAfter} onChange={e => set({ lockAfter: e.target.value })} /></Field>
        <Field label="السماح بالجرد الجزئي *"><YesNo value={s.partialCount} onChange={v => set({ partialCount: v })} /></Field>
        <Field label="طباعة فرق الجرد بالتكلفة *"><YesNo value={s.printCountDiff} onChange={v => set({ printCountDiff: v })} /></Field>
      </div>}
    </div>
    {tab !== 1 && <div className="flex gap-2 p-2 border-t border-border bg-card shrink-0">
      <Btn variant="default" onClick={save}>حفظ</Btn>
      <Btn onClick={() => setS(methodLocked ? { ...DEFAULT_SETTINGS, costMethod: s.costMethod } : DEFAULT_SETTINGS)}>افتراضي</Btn>
      <Btn onClick={onExit}>خروج</Btn>
    </div>}
  </div>;
}

function LinksTab() {
  const { data, update } = useInventory();
  const { chartAccounts } = useAccounting();
  const subs = chartAccounts.filter(a => a.kind === 'فرعي');
  const [rows, setRows] = useState<LinkRow[]>(data.links);
  const [idx, setIdx] = useState(Math.max(0, rows.length - 1));
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(false);
  const row = rows[idx];
  const blank = (): LinkRow => ({ id: uid(), groupId: '', links: LINK_FIELDS.map(field => ({ field, accountNumber: '', accountName: '' })) });
  const setLink = (field: string, val: string) => setRows(rs => rs.map((r, i) => i !== idx ? r : {
    ...r, links: r.links.map(l => { if (l.field !== field) return l; const a = subs.find(x => x.accountNumber === val || x.accountName === val || `${x.accountNumber} - ${x.accountName}` === val); return { ...l, accountNumber: a?.accountNumber || val, accountName: a?.accountName || '' }; }),
  }));
  const save = () => {
    if (!row) return;
    if (!row.groupId) return toast.error('اختر رقم المجموعة');
    if (rows.filter(r => r.groupId === row.groupId).length > 1) return toast.error('هذه المجموعة مربوطة مسبقاً');
    if (row.links.some(l => !l.accountName)) return toast.error('أكمل ربط جميع الحسابات بحسابات فرعية صحيحة');
    update(d => ({ ...d, links: rows })); setEditing(false); toast.success('تم حفظ الربط المحاسبي');
  };
  const search = () => { const i = rows.findIndex(r => data.whGroups.find(g => g.id === r.groupId)?.name.includes(q) || data.whGroups.find(g => g.id === r.groupId)?.number === q); if (i >= 0) setIdx(i); else toast.error('لا توجد نتيجة'); };

  return <div>
    <Bar>
      <Btn onClick={() => { setRows(r => [...r, blank()]); setIdx(rows.length); setEditing(true); }}>إضافة</Btn>
      <input className={inputCls + ' w-32'} placeholder="بحث بالمجموعة" value={q} onChange={e => setQ(e.target.value)} />
      <Btn onClick={search}>بحث</Btn>
      <Btn onClick={() => setEditing(true)} disabled={!row}>تعديل</Btn>
      <Btn variant="default" onClick={save} disabled={!editing}>حفظ</Btn>
      {rows.length > 1 && <Sel value={String(idx)} onChange={v => setIdx(Number(v))} options={rows.map((r, i) => ({ value: String(i), label: data.whGroups.find(g => g.id === r.groupId)?.name || `ربط ${i + 1}` }))} />}
    </Bar>
    {!row ? <p className="p-4 text-center text-muted-foreground">اضغط إضافة لربط مجموعة مخازن بالحسابات</p> :
      <div className="overflow-auto m-2 border border-border rounded-md bg-card">
        <datalist id="inv-sub-accounts">{subs.map(a => <option key={a.id} value={`${a.accountNumber} - ${a.accountName}`} />)}</datalist>
        <table className="w-full text-[13px] border-collapse">
          <thead><tr>{['اسم الحقل في النظام', 'رقم الحساب', 'اسم الحساب'].map(h => <th key={h} className="sticky top-0 bg-[hsl(var(--table-header))] border border-border p-2">{h}</th>)}</tr></thead>
          <tbody>
            <tr><td className="border border-border p-1 font-semibold">رقم المجموعة</td>
              <td className="border border-border p-1"><Sel value={row.groupId} placeholder="اختر" onChange={v => editing && setRows(rs => rs.map((r, i) => i === idx ? { ...r, groupId: v } : r))} options={data.whGroups.map(g => ({ value: g.id, label: g.number }))} /></td>
              <td className="border border-border p-1">{data.whGroups.find(g => g.id === row.groupId)?.name}</td></tr>
            {row.links.map(l => <tr key={l.field}>
              <td className="border border-border p-1 font-semibold whitespace-nowrap">{l.field}</td>
              <td className="border border-border p-1"><input list="inv-sub-accounts" disabled={!editing} className={inputCls + ' min-w-[110px]'} value={l.accountNumber} onChange={e => setLink(l.field, e.target.value)} placeholder="رقم أو اسم" /></td>
              <td className="border border-border p-1 whitespace-nowrap">{l.accountName}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
  </div>;
}
