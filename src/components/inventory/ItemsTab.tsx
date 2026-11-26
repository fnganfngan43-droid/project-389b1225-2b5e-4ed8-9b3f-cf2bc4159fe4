import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { parseExcelFile } from '@/utils/excelImport';
import { Item, ItemUnit, UNIT_LEVELS, UnitLevel, uid, useInventory, validateUnits } from '@/utils/inventory';
import { Bar, Btn, DataTable, Field, Panel, Sel, inputCls } from './kit';

const COLS = ['A رقم الصنف', 'B اسم الصنف', 'C المجموعة الرئيسية', 'D المجموعة الفرعية', 'E المجموعة التفصيلية', 'F الوحدة (; للفصل)', 'G العبوة (; للفصل)', 'H المستوى (; للفصل)'];

export function ItemsTab() {
  const { data, update } = useInventory();
  const [sel, setSel] = useState<string | null>(null);
  const [f, setF] = useState<Item | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const g = data.groups; const gname = (id: string) => g.find(x => x.id === id)?.name || '';

  const save = () => {
    if (!f || !f.number.trim() || !f.name.trim()) return toast.error('أدخل رقم واسم الصنف');
    if (data.items.some(i => i.id !== f.id && i.number === f.number.trim())) return toast.error('رقم الصنف مكرر');
    if (data.settings.requireGroup && !f.detailGroupId) return toast.error('اختر المجموعات للصنف');
    const e = validateUnits(f.units); if (e) return toast.error(e);
    update(d => ({ ...d, items: d.items.some(i => i.id === f.id) ? d.items.map(i => i.id === f.id ? f : i) : [...d.items, f] }));
    setF(null); toast.success('تم حفظ الصنف');
  };
  const remove = () => {
    const it = data.items.find(i => i.id === sel); if (!it) return;
    if (data.openings.some(o => o.lines.some(l => l.itemNumber === it.number))) return toast.error('لا يمكن حذف صنف له حركة');
    if (confirm('تأكيد الحذف؟')) { update(d => ({ ...d, items: d.items.filter(i => i.id !== sel) })); setSel(null); }
  };
  const findGroup = (level: number, name: string, parentId?: string) => g.find(x => x.level === level && x.name === name && (!parentId || x.parentId === parentId));

  const doImport = async (file: File) => {
    const rows = await parseExcelFile(file); const errors: string[] = []; const added: Item[] = [];
    rows.forEach((r, i) => {
      const n = i + 2; const [num, name, m, s, dt, u, p, lv] = r.map(x => String(x ?? '').trim());
      if (!num || !name) return errors.push(`سطر ${n}: رقم أو اسم الصنف فارغ`);
      if (data.items.some(x => x.number === num) || added.some(x => x.number === num)) return errors.push(`سطر ${n}: رقم الصنف ${num} مكرر`);
      const mg = findGroup(1, m), sg = mg && findGroup(2, s, mg.id), dg = sg && findGroup(3, dt, sg.id);
      if (data.settings.requireGroup && !dg) return errors.push(`سطر ${n}: المجموعات غير موجودة (${m} / ${s} / ${dt})`);
      const us = u.split(';').map(x => x.trim()).filter(Boolean), ps = p.split(';'), ls = lv.split(';');
      const bad = us.find(x => !data.units.some(d => d.name === x)); if (bad) return errors.push(`سطر ${n}: الوحدة "${bad}" غير مضافة في وحدات القياس`);
      const units: ItemUnit[] = us.map((x, k) => ({ unit: x, pack: Number(ps[k]) || (k === 0 ? 1 : 0), level: (UNIT_LEVELS.includes(ls[k]?.trim() as UnitLevel) ? ls[k].trim() : 'أصغر مستوى') as UnitLevel }));
      const ue = validateUnits(units); if (ue) return errors.push(`سطر ${n}: ${ue}`);
      added.push({ id: uid(), number: num, name, mainGroupId: mg?.id || '', subGroupId: sg?.id || '', detailGroupId: dg?.id || '', units });
    });
    if (added.length) update(d => ({ ...d, items: [...d.items, ...added] }));
    toast[errors.length ? 'warning' : 'success'](`تم استيراد ${added.length} صنف`, errors.length ? { description: errors.slice(0, 6).join('\n'), duration: 12000 } : undefined);
    setShowImport(false);
  };

  return <div className="flex-1 flex flex-col min-h-0">
    <Bar>
      <Btn onClick={() => setF({ id: uid(), number: '', name: '', mainGroupId: '', subGroupId: '', detailGroupId: '', units: [{ unit: data.units[0]?.name || '', pack: 1, level: 'أصغر مستوى' }] })}>➕ إضافة</Btn>
      <Btn onClick={() => { const i = data.items.find(x => x.id === sel); if (i) setF(structuredClone(i)); }} disabled={!sel}>✏️ تعديل</Btn>
      <Btn onClick={remove} disabled={!sel}>🗑️ حذف</Btn>
      <Btn onClick={() => setShowImport(true)}>📥</Btn>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={e => { const x = e.target.files?.[0]; if (x) doImport(x); e.target.value = ''; }} />
    </Bar>
    <DataTable rows={data.items} selected={sel} onSelect={setSel} onDouble={i => setF(structuredClone(i))} cols={[
      { label: 'رقم الصنف', render: r => r.number }, { label: 'اسم الصنف', render: r => r.name },
      { label: 'المجموعة الرئيسية', render: r => gname(r.mainGroupId) }, { label: 'المجموعة الفرعية', render: r => gname(r.subGroupId) },
      { label: 'المجموعة التفصيلية', render: r => gname(r.detailGroupId) }, { label: 'الوحدات', render: r => r.units.map(u => `${u.unit}(${u.pack})`).join(' ; ') }]} />
    {showImport && <Panel title="ترتيب أعمدة ملف الإكسل" onClose={() => setShowImport(false)} footer={<Btn variant="default" onClick={() => fileRef.current?.click()}>📥 اختيار الملف</Btn>}>
      <div className="col-span-2 max-h-64 overflow-y-auto text-sm space-y-1">
        {COLS.map(c => <div key={c} className="border border-border rounded px-2 py-1 bg-card">{c}</div>)}
        <p className="text-xs text-muted-foreground">مثال: الوحدة "حبة;درزن;طرد" والعبوة "1;12;24" والمستوى بنفس الترتيب. يجب إضافة المجموعات والوحدات مسبقاً.</p>
      </div>
    </Panel>}
    {f && <Panel title="بيانات الصنف" onClose={() => setF(null)} footer={<Btn variant="default" onClick={save}>💾 حفظ</Btn>}>
      <datalist id="inv-items">{data.items.map(i => <option key={i.id} value={i.number}>{i.name}</option>)}</datalist>
      <Field label="رقم الصنف"><input list="inv-items" className={inputCls} value={f.number} onChange={e => { const v = e.target.value; const ex = data.items.find(i => i.number === v || i.name === v); setF(ex && ex.id !== f.id ? structuredClone(ex) : { ...f, number: v }); }} /></Field>
      <Field label="اسم الصنف"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="المجموعة الرئيسية"><Sel value={f.mainGroupId} placeholder="اختر" onChange={v => setF({ ...f, mainGroupId: v, subGroupId: '', detailGroupId: '' })} options={g.filter(x => x.level === 1).map(x => ({ value: x.id, label: x.name }))} /></Field>
      <Field label="المجموعة الفرعية"><Sel value={f.subGroupId} placeholder="اختر" onChange={v => setF({ ...f, subGroupId: v, detailGroupId: '' })} options={g.filter(x => x.level === 2 && x.parentId === f.mainGroupId).map(x => ({ value: x.id, label: x.name }))} /></Field>
      <Field label="المجموعة التفصيلية" full><Sel value={f.detailGroupId} placeholder="اختر" onChange={v => setF({ ...f, detailGroupId: v })} options={g.filter(x => x.level === 3 && x.parentId === f.subGroupId).map(x => ({ value: x.id, label: x.name }))} /></Field>
      <div className="col-span-2 overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead><tr>{['الوحدة', 'العبوة', 'مستوى الوحدة', ''].map(h => <th key={h} className="bg-[hsl(var(--table-header))] border border-border p-1">{h}</th>)}</tr></thead>
          <tbody>{f.units.map((u, k) => <tr key={k}>
            <td className="border border-border p-1"><Sel value={u.unit} placeholder="اختر" onChange={v => setF({ ...f, units: f.units.map((x, j) => j === k ? { ...x, unit: v } : x) })} options={data.units.map(x => x.name)} /></td>
            <td className="border border-border p-1"><input type="number" className={inputCls} value={u.pack} disabled={k === 0} onChange={e => setF({ ...f, units: f.units.map((x, j) => j === k ? { ...x, pack: Number(e.target.value) } : x) })} /></td>
            <td className="border border-border p-1"><Sel value={u.level} onChange={v => setF({ ...f, units: f.units.map((x, j) => j === k ? { ...x, level: v as UnitLevel } : x) })} options={UNIT_LEVELS} /></td>
            <td className="border border-border p-1">{k > 0 && <button onClick={() => setF({ ...f, units: f.units.filter((_, j) => j !== k) })}>🗑️</button>}</td>
          </tr>)}</tbody>
        </table>
        <Btn onClick={() => setF({ ...f, units: [...f.units, { unit: '', pack: 12, level: 'وحدة البيع' }] })}>➕ وحدة</Btn>
        <p className="text-xs text-muted-foreground mt-1">العبوة = عدد الوحدات السابقة داخل هذه الوحدة (مثال: درزن = 12 حبة، طرد = 24 درزن).</p>
      </div>
    </Panel>}
  </div>;
}
