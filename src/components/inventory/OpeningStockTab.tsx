import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAccounting } from '@/contexts/AccountingContext';
import { parseExcelFile } from '@/utils/excelImport';
import { printHTML } from '@/utils/webviewPrint';
import { escapeHtml } from '@/utils/htmlEscape';
import { OpeningLine, OpeningStock, nextNumber, uid, useInventory } from '@/utils/inventory';
import { Bar, Btn, DataTable, Field, Panel, Sel, inputCls } from './kit';

const lineTotal = (l: OpeningLine) => l.qty * l.unitCost;
const docTotal = (o: OpeningStock) => o.lines.reduce((s, l) => s + lineTotal(l), 0);
const newLine = (): OpeningLine => ({ id: uid(), itemNumber: '', itemName: '', unit: '', warehouse: '', qty: 0, unitCost: 0 });

export function OpeningStockTab() {
  const { data, update } = useInventory();
  const { currencies } = useAccounting();
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState<OpeningStock | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = [...data.openings].sort((a, b) => Number(a.number) - Number(b.number));

  const setLine = (id: string, p: Partial<OpeningLine>) => setF(d => d && { ...d, lines: d.lines.map(l => l.id === id ? { ...l, ...p } : l) });
  const pickItem = (id: string, v: string) => {
    const it = data.items.find(i => i.number === v || i.name === v);
    setLine(id, it ? { itemNumber: it.number, itemName: it.name, unit: it.units[0]?.unit || '' } : { itemNumber: v, itemName: '' });
  };
  const blank = (): OpeningStock => ({ id: uid(), number: nextNumber(data.openings.map(o => o.number)), date: new Date().toISOString().split('T')[0], warehouse: data.warehouses[0]?.name || '', currency: data.warehouses[0]?.currency || currencies[0]?.symbol || '', rate: 1, reference: '', description: 'مخزون افتتاحي', lines: [newLine()] });
  const save = () => {
    if (!f) return;
    if (!f.warehouse && data.settings.requireWarehouse) return toast.error('اختر المخزون');
    const lines = f.lines.filter(l => l.itemNumber);
    if (!lines.length) return toast.error('أضف صنفاً واحداً على الأقل');
    const bad = lines.find(l => !data.items.some(i => i.number === l.itemNumber)); if (bad) return toast.error(`رقم الصنف ${bad.itemNumber} غير موجود في بيانات الأصناف`);
    if (lines.some(l => !(l.qty > 0))) return toast.error('أدخل الكمية لكل صنف');
    const doc = { ...f, lines };
    update(d => ({ ...d, openings: d.openings.some(o => o.id === doc.id) ? d.openings.map(o => o.id === doc.id ? doc : o) : [...d.openings, doc] }));
    setF(null); setSel(doc.id); toast.success('تم حفظ المخزون الافتتاحي');
  };
  const doImport = async (file: File) => {
    if (!f) return; const rows = await parseExcelFile(file); const errors: string[] = []; const lines: OpeningLine[] = [];
    rows.forEach((r, i) => {
      const [num, , unit, wh, qty, cost] = r.map(x => String(x ?? '').trim());
      const it = data.items.find(x => x.number === num);
      if (!it) return errors.push(`سطر ${i + 2}: رقم الصنف ${num} غير موجود`);
      if (unit && !it.units.some(u => u.unit === unit)) return errors.push(`سطر ${i + 2}: الوحدة ${unit} غير معرفة للصنف`);
      lines.push({ id: uid(), itemNumber: it.number, itemName: it.name, unit: unit || it.units[0]?.unit || '', warehouse: wh || f.warehouse, qty: Number(qty) || 0, unitCost: Number(cost) || 0 });
    });
    setF({ ...f, lines: [...f.lines.filter(l => l.itemNumber), ...lines] });
    toast[errors.length ? 'warning' : 'success'](`تم استيراد ${lines.length} صنف`, errors.length ? { description: errors.slice(0, 6).join('\n'), duration: 12000 } : undefined);
  };
  const print = () => {
    const o = data.openings.find(x => x.id === sel); if (!o) return;
    const e = escapeHtml;
    printHTML(`<html dir="rtl"><head><style>body{font-family:Arial;padding:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:4px;font-size:13px}th{background:#87CEEB;font-size:14px}</style></head><body>
      <h2 style="text-align:center">المخزون الافتتاحي رقم ${e(o.number)}</h2><p>التاريخ: ${e(o.date)} — المخزون: ${e(o.warehouse)} — العملة: ${e(o.currency)} — المرجع: ${e(o.reference)}</p><p>البيان: ${e(o.description)}</p>
      <table><tr><th>رقم الصنف</th><th>اسم الصنف</th><th>الوحدة</th><th>المخزن</th><th>الكمية</th><th>تكلفة الوحدة</th><th>إجمالي التكلفة</th></tr>
      ${o.lines.map(l => `<tr><td>${e(l.itemNumber)}</td><td>${e(l.itemName)}</td><td>${e(l.unit)}</td><td>${e(l.warehouse || o.warehouse)}</td><td>${l.qty}</td><td>${l.unitCost}</td><td>${lineTotal(l)}</td></tr>`).join('')}
      <tr><th colspan="6">الإجمالي</th><th>${docTotal(o)}</th></tr></table></body></html>`);
  };

  return <div className="flex-1 flex flex-col min-h-0">
    <Bar>
      <Btn onClick={() => setF(blank())}>➕</Btn>
      <Btn onClick={() => { const o = data.openings.find(x => x.id === sel); if (o) setF(structuredClone(o)); }} disabled={!sel}>✏️</Btn>
      <Btn onClick={print} disabled={!sel}>🖨️</Btn>
      <Btn onClick={() => { if (sel && confirm('تأكيد الحذف؟')) { update(d => ({ ...d, openings: d.openings.filter(o => o.id !== sel) })); setSel(null); } }} disabled={!sel}>🗑️</Btn>
    </Bar>
    <DataTable rows={list} selected={sel} onSelect={setSel} onDouble={o => setF(structuredClone(o))} cols={[
      { label: 'الرقم', render: r => r.number }, { label: 'التاريخ', render: r => r.date }, { label: 'المخزون', render: r => r.warehouse },
      { label: 'المبلغ المحلي', render: r => (docTotal(r) * r.rate).toLocaleString() }, { label: 'العملة', render: r => r.currency },
      { label: 'رقم المرجع', render: r => r.reference }, { label: 'البيان', render: r => r.description }]} />
    {f && <Panel title="المخزون الافتتاحي" onClose={() => setF(null)} footer={<><Btn onClick={() => fileRef.current?.click()}>📥</Btn><Btn variant="default" onClick={save}>💾 حفظ</Btn></>}>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={e => { const x = e.target.files?.[0]; if (x) doImport(x); e.target.value = ''; }} />
      <Field label="الرقم"><input className={inputCls} value={f.number} disabled /></Field>
      <Field label="التاريخ"><input type="date" className={inputCls} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="المخزون"><Sel value={f.warehouse} placeholder="اختر" onChange={v => setF({ ...f, warehouse: v, currency: data.warehouses.find(w => w.name === v)?.currency || f.currency })} options={data.warehouses.map(w => w.name)} /></Field>
      <Field label="العملة"><Sel value={f.currency} onChange={v => setF({ ...f, currency: v })} options={currencies.map(c => ({ value: c.symbol, label: c.name }))} /></Field>
      <Field label="سعر الصرف"><input type="number" className={inputCls} value={f.rate} onChange={e => setF({ ...f, rate: Number(e.target.value) || 1 })} /></Field>
      <Field label="المبلغ المحلي"><input className={inputCls} disabled value={(docTotal(f) * f.rate).toLocaleString()} /></Field>
      <Field label="المرجع"><input className={inputCls} value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })} /></Field>
      <Field label="البيان"><input className={inputCls} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
      <datalist id="inv-items-o">{data.items.map(i => <option key={i.id} value={i.number}>{i.name}</option>)}</datalist>
      <div className="col-span-2 overflow-x-auto border border-border rounded">
        <table className="w-max min-w-full text-[13px] border-collapse">
          <thead><tr>{['', 'رقم الصنف', 'اسم الصنف', 'الوحدة', 'المخزن', 'الكمية', 'تكلفة الوحدة', 'إجمالي التكلفة'].map(h => <th key={h} className="bg-[hsl(var(--table-header))] border border-border p-1 whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody>{f.lines.map(l => { const it = data.items.find(i => i.number === l.itemNumber); return <tr key={l.id}>
            <td className="border border-border p-1 relative"><button onClick={() => setMenu(menu === l.id ? null : l.id)} className="px-2">⋮</button>
              {menu === l.id && <div className="absolute z-20 top-full right-0 bg-card border border-border rounded shadow text-xs">
                <button className="block px-3 py-2 w-full text-right whitespace-nowrap" onClick={() => { setF({ ...f, lines: [...f.lines, newLine()] }); setMenu(null); }}>إضافة صنف</button>
                <button className="block px-3 py-2 w-full text-right" onClick={() => { setF({ ...f, lines: f.lines.length > 1 ? f.lines.filter(x => x.id !== l.id) : [newLine()] }); setMenu(null); }}>حذف الصف</button></div>}</td>
            <td className="border border-border p-1"><input list="inv-items-o" className={inputCls + ' w-24'} value={l.itemNumber} onChange={e => pickItem(l.id, e.target.value)} /></td>
            <td className="border border-border p-1 min-w-[110px]">{l.itemName}</td>
            <td className="border border-border p-1"><Sel value={l.unit} onChange={v => setLine(l.id, { unit: v })} options={it?.units.map(u => u.unit) || []} /></td>
            <td className="border border-border p-1"><Sel value={l.warehouse} placeholder="الافتراضي" onChange={v => setLine(l.id, { warehouse: v })} options={data.warehouses.map(w => w.name)} /></td>
            <td className="border border-border p-1"><input type="number" className={inputCls + ' w-20'} value={l.qty} onChange={e => setLine(l.id, { qty: Number(e.target.value) })} /></td>
            <td className="border border-border p-1"><input type="number" className={inputCls + ' w-24'} value={l.unitCost} onChange={e => setLine(l.id, { unitCost: Number(e.target.value) })} /></td>
            <td className="border border-border p-1">{lineTotal(l).toLocaleString()}</td>
          </tr>; })}</tbody>
        </table>
      </div>
      <p className="col-span-2 text-xs text-muted-foreground">ترتيب أعمدة الإكسل: A رقم الصنف، B اسم الصنف، C الوحدة، D المخزن، E الكمية، F تكلفة الوحدة، G التكلفة.</p>
    </Panel>}
  </div>;
}
