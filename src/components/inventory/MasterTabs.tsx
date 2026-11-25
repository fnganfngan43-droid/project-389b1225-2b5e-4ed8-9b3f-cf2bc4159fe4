import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useAccounting } from '@/contexts/AccountingContext';
import { InventoryData, ItemGroup, MeasureUnit, Warehouse, WarehouseGroup, nextNumber, uid, useInventory } from '@/utils/inventory';
import { Bar, Btn, DataTable, Field, Panel, Sel, inputCls } from './kit';

type Key = 'units' | 'groups' | 'whGroups' | 'warehouses';
/** Shared add/edit/delete state for master lists. */
function useCrud<T extends { id: string }>(key: Key, inUse: (r: T, d: InventoryData) => boolean) {
  const { data, update } = useInventory();
  const list = data[key] as unknown as T[];
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<T | null>(null);
  const save = (r: T) => { update(d => { const l = d[key] as unknown as T[]; return { ...d, [key]: l.some(x => x.id === r.id) ? l.map(x => x.id === r.id ? r : x) : [...l, r] }; }); setForm(null); setSel(r.id); toast.success('تم الحفظ'); };
  const remove = () => {
    const r = list.find(x => x.id === sel); if (!r) return;
    if (inUse(r, data)) return toast.error('لا يمكن الحذف لارتباطه ببيانات أخرى');
    if (!confirm('تأكيد الحذف؟')) return;
    update(d => ({ ...d, [key]: (d[key] as unknown as T[]).filter(x => x.id !== r.id) })); setSel(null);
  };
  const edit = () => { const r = list.find(x => x.id === sel); if (r) setForm({ ...r }); };
  return { data, update, list, sel, setSel, form, setForm, save, remove, edit };
}
const dup = <T extends { id: string },>(list: T[], r: T, f: (x: T) => string) => list.some(x => x.id !== r.id && f(x).trim() === f(r).trim());
const CrudBar = ({ onAdd, onEdit, onDelete, sel }: { onAdd: () => void; onEdit: () => void; onDelete: () => void; sel: string | null }) =>
  <Bar><Btn onClick={onAdd}>➕ إضافة</Btn><Btn onClick={onEdit} disabled={!sel}>✏️ تعديل</Btn><Btn onClick={onDelete} disabled={!sel}>🗑️ حذف</Btn></Bar>;

export function UnitsTab() {
  const c = useCrud<MeasureUnit>('units', (u, d) => d.items.some(i => i.units.some(x => x.unit === u.name)));
  const f = c.form;
  const save = () => {
    if (!f || !f.code.trim() || !f.name.trim()) return toast.error('أدخل رمز واسم الوحدة');
    if (dup(c.list, f, x => x.code) || dup(c.list, f, x => x.name)) return toast.error('رمز أو اسم الوحدة مكرر');
    c.save(f);
  };
  return <div className="flex-1 flex flex-col min-h-0">
    <CrudBar sel={c.sel} onAdd={() => c.setForm({ id: uid(), code: '', name: '', defaultPack: 1, kind: 'عددية' })} onEdit={c.edit} onDelete={c.remove} />
    <DataTable rows={c.list} selected={c.sel} onSelect={c.setSel} cols={[
      { label: 'رمز الوحدة', render: r => r.code }, { label: 'اسم الوحدة', render: r => r.name },
      { label: 'العبوة الافتراضية', render: r => r.defaultPack }, { label: 'نوع الوحدة', render: r => r.kind }]} />
    {f && <Panel title="وحدة قياس" onClose={() => c.setForm(null)} footer={<Btn variant="default" onClick={save}>💾 حفظ</Btn>}>
      <Field label="رمز الوحدة"><input className={inputCls} value={f.code} onChange={e => c.setForm({ ...f, code: e.target.value })} /></Field>
      <Field label="اسم الوحدة"><input className={inputCls} value={f.name} onChange={e => c.setForm({ ...f, name: e.target.value })} /></Field>
      <Field label="العبوة الافتراضية"><input type="number" className={inputCls} value={f.defaultPack} onChange={e => c.setForm({ ...f, defaultPack: Number(e.target.value) })} /></Field>
      <Field label="نوع الوحدة"><Sel value={f.kind} onChange={v => c.setForm({ ...f, kind: v as MeasureUnit['kind'] })} options={['عددية', 'قياسية']} /></Field>
    </Panel>}
  </div>;
}

/** Small dialog to add a main/sub group name with duplicate check. */
function QuickGroup({ level, parents, onClose, onSaved }: { level: 1 | 2 | 3; parents: ItemGroup[]; onClose: () => void; onSaved: (g: ItemGroup) => void }) {
  const { data, update } = useInventory();
  const [name, setName] = useState(''); const [parentId, setParentId] = useState('');
  const save = () => {
    if (!name.trim() || (level > 1 && !parentId)) return toast.error('أكمل الحقول');
    if (data.groups.some(g => g.level === level && g.name.trim() === name.trim() && (g.parentId || '') === parentId)) return toast.error('اسم المجموعة مكرر');
    const g: ItemGroup = { id: uid(), level, name: name.trim(), parentId: parentId || undefined };
    update(d => ({ ...d, groups: [...d.groups, g] })); onSaved(g); onClose();
  };
  return <Panel title={level === 1 ? 'مجموعة رئيسية' : level === 2 ? 'مجموعة فرعية' : 'مجموعة تفصيلية'} onClose={onClose} footer={<Btn variant="default" onClick={save}>💾 حفظ</Btn>}>
    {level > 1 && <Field label={level === 2 ? 'المجموعة الرئيسية' : 'المجموعة الفرعية'}><Sel value={parentId} placeholder="اختر" onChange={setParentId} options={parents.map(p => ({ value: p.id, label: p.name }))} /></Field>}
    <Field label="اسم المجموعة" full={level === 1}><input className={inputCls} value={name} onChange={e => setName(e.target.value)} /></Field>
  </Panel>;
}

interface GroupPath { id: string; main: string; sub: string; detail: string }
export function ItemGroupsTab() {
  const { data, update } = useInventory();
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<GroupPath | null>(null);
  const [quick, setQuick] = useState<1 | 2 | null>(null);
  const g = data.groups; const name = (id?: string) => g.find(x => x.id === id)?.name || '';
  const rows = g.filter(x => x.level === 3).map(d => { const s = g.find(x => x.id === d.parentId); return { id: d.id, main: name(s?.parentId), sub: s?.name || '', detail: d.name }; });
  const mains = g.filter(x => x.level === 1);
  const [mainId, setMainId] = useState(''); const [subId, setSubId] = useState('');
  const save = () => {
    if (!form || !mainId || !subId || !form.detail.trim()) return toast.error('أكمل حقول المجموعة');
    if (g.some(x => x.level === 3 && x.parentId === subId && x.name === form.detail.trim() && x.id !== form.id)) return toast.error('المجموعة التفصيلية مكررة');
    update(d => ({ ...d, groups: d.groups.some(x => x.id === form.id) ? d.groups.map(x => x.id === form.id ? { ...x, name: form.detail.trim(), parentId: subId } : x) : [...d.groups, { id: form.id, level: 3, name: form.detail.trim(), parentId: subId }] }));
    setForm(null); toast.success('تم الحفظ');
  };
  const open = (id?: string) => {
    const d = g.find(x => x.id === id); const s = g.find(x => x.id === d?.parentId);
    setMainId(s?.parentId || ''); setSubId(s?.id || ''); setForm({ id: d?.id || uid(), main: '', sub: '', detail: d?.name || '' });
  };
  const remove = () => {
    if (!sel) return; if (data.items.some(i => i.detailGroupId === sel)) return toast.error('لا يمكن الحذف لوجود أصناف مرتبطة');
    if (confirm('تأكيد الحذف؟')) { update(d => ({ ...d, groups: d.groups.filter(x => x.id !== sel) })); setSel(null); }
  };
  return <div className="flex-1 flex flex-col min-h-0">
    <CrudBar sel={sel} onAdd={() => open()} onEdit={() => open(sel!)} onDelete={remove} />
    <DataTable rows={rows} selected={sel} onSelect={setSel} cols={[{ label: 'المجموعة الرئيسية', render: r => r.main }, { label: 'المجموعة الفرعية', render: r => r.sub }, { label: 'المجموعة التفصيلية', render: r => r.detail }]} />
    {form && <Panel title="إضافة مجموعات" onClose={() => setForm(null)} footer={<Btn variant="default" onClick={save}>💾 حفظ</Btn>}>
      <Field label="المجموعة الرئيسية"><div className="flex gap-1"><Sel value={mainId} placeholder="اختر" onChange={v => { setMainId(v); setSubId(''); }} options={mains.map(m => ({ value: m.id, label: m.name }))} /><Btn onClick={() => setQuick(1)}><Plus className="w-4 h-4" /></Btn></div></Field>
      <Field label="المجموعة الفرعية"><div className="flex gap-1"><Sel value={subId} placeholder="اختر" onChange={setSubId} options={g.filter(x => x.level === 2 && x.parentId === mainId).map(m => ({ value: m.id, label: m.name }))} /><Btn onClick={() => setQuick(2)}><Plus className="w-4 h-4" /></Btn></div></Field>
      <Field label="المجموعة التفصيلية" full><input className={inputCls} value={form.detail} onChange={e => setForm({ ...form, detail: e.target.value })} /></Field>
    </Panel>}
    {quick && <QuickGroup level={quick} parents={quick === 2 ? mains : []} onClose={() => setQuick(null)} onSaved={x => quick === 1 ? setMainId(x.id) : (setMainId(x.parentId!), setSubId(x.id))} />}
  </div>;
}

function WhGroupForm({ f, setF, onSave, onClose }: { f: WarehouseGroup; setF: (g: WarehouseGroup) => void; onSave: () => void; onClose: () => void }) {
  return <Panel title="مجموعة مخازن" onClose={onClose} footer={<Btn variant="default" onClick={onSave}>💾 حفظ</Btn>}>
    <Field label="رقم المجموعة"><input className={inputCls} value={f.number} disabled /></Field>
    <Field label="اسم مجموعة المخازن"><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
    <Field label="نوع المخزون"><Sel value={f.kind} onChange={v => setF({ ...f, kind: v as WarehouseGroup['kind'] })} options={['رئيسي', 'فرعي']} /></Field>
    <Field label="الفرع"><input className={inputCls} value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })} /></Field>
  </Panel>;
}
const newWhGroup = (list: WarehouseGroup[]): WarehouseGroup => ({ id: uid(), number: nextNumber(list.map(x => x.number)), name: '', kind: 'رئيسي', branch: '' });
const checkWhGroup = (list: WarehouseGroup[], f: WarehouseGroup) => !f.name.trim() ? 'أدخل اسم المجموعة' : dup(list, f, x => x.name) ? 'اسم المجموعة مكرر' : null;

export function WarehouseGroupsTab() {
  const c = useCrud<WarehouseGroup>('whGroups', (g, d) => d.warehouses.some(w => w.groupId === g.id) || d.links.some(l => l.groupId === g.id));
  return <div className="flex-1 flex flex-col min-h-0">
    <CrudBar sel={c.sel} onAdd={() => c.setForm(newWhGroup(c.list))} onEdit={c.edit} onDelete={c.remove} />
    <DataTable rows={c.list} selected={c.sel} onSelect={c.setSel} cols={[{ label: 'رقم المجموعة', render: r => r.number }, { label: 'اسم المجموعة', render: r => r.name }, { label: 'نوع المخزون', render: r => r.kind }, { label: 'الفرع', render: r => r.branch }]} />
    {c.form && <WhGroupForm f={c.form} setF={c.setForm} onClose={() => c.setForm(null)} onSave={() => { const e = checkWhGroup(c.list, c.form!); e ? toast.error(e) : c.save(c.form!); }} />}
  </div>;
}

export function WarehousesTab() {
  const { currencies } = useAccounting();
  const c = useCrud<Warehouse>('warehouses', (w, d) => d.openings.some(o => o.warehouse === w.name || o.lines.some(l => l.warehouse === w.name)));
  const [gForm, setGForm] = useState<WarehouseGroup | null>(null);
  const f = c.form;
  const save = () => {
    if (!f || !f.name.trim()) return toast.error('أدخل اسم المخزون');
    if (dup(c.list, f, x => x.name) || (f.code && dup(c.list, f, x => x.code))) return toast.error('اسم أو رمز المخزون مكرر');
    c.save(f);
  };
  const saveGroup = () => {
    const e = checkWhGroup(c.data.whGroups, gForm!); if (e) return toast.error(e);
    c.update(d => ({ ...d, whGroups: [...d.whGroups, gForm!] })); c.setForm({ ...f!, groupId: gForm!.id }); setGForm(null);
  };
  return <div className="flex-1 flex flex-col min-h-0">
    <CrudBar sel={c.sel} onAdd={() => c.setForm({ id: uid(), number: nextNumber(c.list.map(x => x.number)), name: '', code: '', currency: currencies[0]?.symbol || '', groupId: '', keeperName: '', keeperNumber: '', footer: '' })} onEdit={c.edit} onDelete={c.remove} />
    <DataTable rows={c.list} selected={c.sel} onSelect={c.setSel} cols={[
      { label: 'رقم المخزون', render: r => r.number }, { label: 'مجموعة المخازن', render: r => c.data.whGroups.find(g => g.id === r.groupId)?.name },
      { label: 'اسم المخزون', render: r => r.name }, { label: 'الرمز', render: r => r.code }, { label: 'العملة', render: r => r.currency },
      { label: 'أمين المخازن', render: r => r.keeperName }, { label: 'رقم الأمين', render: r => r.keeperNumber }]} />
    {f && <Panel title="بيانات المخزون" onClose={() => c.setForm(null)} footer={<Btn variant="default" onClick={save}>💾 حفظ</Btn>}>
      <Field label="رقم المخزون"><input className={inputCls} value={f.number} disabled /></Field>
      <Field label="مجموعة المخازن"><div className="flex gap-1"><Sel value={f.groupId} placeholder="اختر" onChange={v => c.setForm({ ...f, groupId: v })} options={c.data.whGroups.map(g => ({ value: g.id, label: g.name }))} /><Btn onClick={() => setGForm(newWhGroup(c.data.whGroups))}><Plus className="w-4 h-4" /></Btn></div></Field>
      <Field label="اسم المخزون"><input className={inputCls} value={f.name} onChange={e => c.setForm({ ...f, name: e.target.value })} /></Field>
      <Field label="رمز المخزون"><input className={inputCls} value={f.code} onChange={e => c.setForm({ ...f, code: e.target.value })} /></Field>
      <Field label="عملة المخزون"><Sel value={f.currency} onChange={v => c.setForm({ ...f, currency: v })} options={currencies.map(x => ({ value: x.symbol, label: x.name }))} /></Field>
      <Field label="اسم أمين المخازن"><input className={inputCls} value={f.keeperName} onChange={e => c.setForm({ ...f, keeperName: e.target.value })} /></Field>
      <Field label="رقم أمين المخازن"><input className={inputCls} value={f.keeperNumber} onChange={e => c.setForm({ ...f, keeperNumber: e.target.value })} /></Field>
      <Field label="تذييل يظهر عند طباعة الفاتورة" full><textarea className={inputCls + ' h-16 py-1'} value={f.footer} onChange={e => c.setForm({ ...f, footer: e.target.value })} /></Field>
    </Panel>}
    {gForm && <WhGroupForm f={gForm} setF={setGForm} onClose={() => setGForm(null)} onSave={saveGroup} />}
  </div>;
}
