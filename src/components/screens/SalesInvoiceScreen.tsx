import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAccounting } from '@/contexts/AccountingContext';
import { getNextSequentialNumber } from '@/utils/sequentialNumber';
import { printHTML } from '@/utils/webviewPrint';
import { escapeHtml } from '@/utils/htmlEscape';
import { parseExcelFile } from '@/utils/excelImport';
import { buildJournal, invoiceTotals, isBelowCost, lineTotal, InvoiceLine, PayType, SalesInvoiceDoc } from '@/utils/salesInvoice';
import { toast } from 'sonner';

const KEY = 'sales_invoices_v2';
const load = (): SalesInvoiceDoc[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const uid = () => Math.random().toString(36).slice(2, 10);
const newLine = (): InvoiceLine => ({ id: uid(), itemNumber: '', itemName: '', unit: 'حبة', stock: 0, qty: 1, unitCost: 0, price: 0, discount: 0 });

interface Props { isReturn?: boolean; onClose: () => void }

export function SalesInvoiceScreen({ isReturn = false, onClose }: Props) {
  const { analyticEntities, currencies, settings } = useAccounting();
  const [all, setAll] = useState<SalesInvoiceDoc[]>(load);
  const list = all.filter(i => !!i.isReturn === isReturn);
  const [mode, setMode] = useState<'search' | 'edit'>('search');
  const [doc, setDoc] = useState<SalesInvoiceDoc | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchCol, setSearchCol] = useState('all');
  const [showJournal, setShowJournal] = useState(false);
  const [menuLine, setMenuLine] = useState<string | null>(null);
  const [warn, setWarn] = useState<null | (() => void)>(null);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(all)); }, [all]);

  const blank = (): SalesInvoiceDoc => ({
    id: uid(), isReturn, invoiceNumber: getNextSequentialNumber(list.map(i => i.invoiceNumber)),
    date: new Date().toISOString().split('T')[0], payType: 'cash', payAccountNumber: '', payAccountName: '',
    customerNumber: '', customerName: '', phone: '', currency: currencies[0]?.symbol || '', rate: 1,
    reference: '', lines: [newLine()], userName: settings.userName || '', savedAt: '',
  });

  const set = (p: Partial<SalesInvoiceDoc>) => setDoc(d => d ? { ...d, ...p } : d);
  const setLine = (id: string, p: Partial<InvoiceLine>) => setDoc(d => d ? { ...d, lines: d.lines.map(l => l.id === id ? { ...l, ...p } : l) } : d);
  const saved = !!doc && all.some(i => i.id === doc.id);

  const payType = doc?.payType ?? 'cash';
  const payEntities = analyticEntities.filter(e => e.analyticType === (payType === 'bank' ? 'بنوك' : 'صناديق'));
  const customers = analyticEntities.filter(e => e.analyticType === 'عميل');
  const pickEntity = (num: string, pool: typeof analyticEntities) => pool.find(e => e.entityNumber === num || e.entityName === num);
  const totals = useMemo(() => invoiceTotals(doc?.lines || []), [doc]);

  const doSave = () => {
    if (!doc) return;
    const final = { ...doc, savedAt: new Date().toLocaleString('ar'), userName: settings.userName || doc.userName };
    setAll(a => a.some(i => i.id === final.id) ? a.map(i => i.id === final.id ? final : i) : [...a, final]);
    setDoc(final); setSelectedId(final.id);
    toast.success('تم حفظ الفاتورة');
  };
  const save = () => {
    if (!doc) return;
    const needPay = doc.payType !== 'credit' && !doc.payAccountName;
    if (needPay || (doc.payType === 'credit' && !doc.customerName) || !doc.currency || !doc.lines.some(l => l.itemName && l.qty > 0)) {
      toast.error('يرجى تعبئة الحقول الإجبارية والأصناف'); return;
    }
    if (doc.lines.some(isBelowCost)) { setWarn(() => doSave); return; }
    doSave();
  };

  const filtered = list.filter(i => {
    if (!search) return true;
    const cols: Record<string, string> = { invoiceNumber: i.invoiceNumber, date: i.date, customerName: i.customerName || i.payAccountName, currency: i.currency, net: String(invoiceTotals(i.lines).net) };
    return searchCol === 'all' ? Object.values(cols).some(v => v.includes(search)) : (cols[searchCol] || '').includes(search);
  }).sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber));

  const print = () => {
    if (!doc) return;
    const rows = doc.lines.map(l => `<tr><td>${escapeHtml(l.itemNumber)}</td><td>${escapeHtml(l.itemName)}</td><td>${escapeHtml(l.unit)}</td><td>${l.qty}</td><td>${l.price}</td><td>${l.discount}</td><td>${lineTotal(l)}</td></tr>`).join('');
    const head = (settings.headerArabic || []).map(h => `<div>${escapeHtml(h)}</div>`).join('');
    printHTML(`<html dir="rtl"><head><style>body{font-family:Arial;padding:16px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #000;padding:4px;font-size:13px}th{background:#87CEEB;font-size:14px}.b{border:2px solid #000;padding:12px}</style></head><body><div class="b"><div style="text-align:center;font-weight:bold">${head}</div><h3 style="text-align:center">${isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'} رقم ${escapeHtml(doc.invoiceNumber)}</h3><p>التاريخ: ${escapeHtml(doc.date)} — العميل: ${escapeHtml(doc.customerName || doc.payAccountName)} — العملة: ${escapeHtml(doc.currency)}</p><table><tr><th>رقم الصنف</th><th>اسم الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr>${rows}</table><p>إجمالي الكمية: ${totals.qty} — قبل الخصم: ${totals.gross} — الخصم: ${totals.discount} — <b>الصافي: ${totals.net} ${escapeHtml(doc.currency)}</b></p><p style="font-size:12px">${escapeHtml(settings.voucherFooterNote || '')}</p></div></body></html>`);
  };

  const importExcel = async (file: File) => {
    const rows = await parseExcelFile(file);
    if (mode === 'edit' && doc) {
      const lines = rows.map((r: any) => ({ ...newLine(), itemNumber: String(r['رقم الصنف'] ?? ''), itemName: String(r['اسم الصنف'] ?? ''), unit: String(r['الوحدة'] ?? 'حبة'), qty: +r['الكمية'] || 0, unitCost: +r['تكلفة الوحدة'] || 0, price: +r['السعر'] || 0, discount: +r['الخصم'] || 0 })).filter(l => l.itemName);
      set({ lines: [...doc.lines.filter(l => l.itemName), ...lines] });
      toast.success(`تم استيراد ${lines.length} صنف`);
    } else toast.info('افتح فاتورة جديدة ثم استورد الأصناف');
  };

  const btn = (icon: string, title: string, onClick: () => void, enabled = true) => (
    <Button key={title} variant="outline" size="icon" title={title} aria-label={title} disabled={!enabled} onClick={onClick} className="text-lg min-w-[40px]">{icon}</Button>
  );
  const sel = !!selectedId;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex gap-1 overflow-x-auto p-2 bg-card border-b border-border shrink-0">
        {btn('🔁', 'إضافة من فاتورة محددة', () => { const src = doc || all.find(i => i.id === selectedId); if (src) { setDoc({ ...blank(), lines: src.lines.map(l => ({ ...l, id: uid() })), payType: src.payType, customerName: src.customerName, customerNumber: src.customerNumber, currency: src.currency, rate: src.rate }); setMode('edit'); } }, sel)}
        {btn('➕', 'إضافة', () => { setDoc(blank()); setSelectedId(null); setMode('edit'); })}
        {btn('💾', 'حفظ', save, mode === 'edit')}
        {btn('🔍', 'بحث', () => setMode('search'))}
        {btn('✏️', 'تعديل', () => { const d = all.find(i => i.id === selectedId); if (d) { setDoc(d); setMode('edit'); } }, sel)}
        {btn('🖨️', 'طباعة', print, saved)}
        <label title="استيراد من إكسل" className="inline-flex items-center justify-center border border-border rounded-md min-w-[40px] h-10 text-lg cursor-pointer bg-background">📥<input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && importExcel(e.target.files[0])} /></label>
        {btn('📋', 'عرض القيد', () => setShowJournal(true), saved)}
        {btn('🗑️', 'حذف', () => { if (selectedId && confirm('حذف الفاتورة؟')) { setAll(a => a.filter(i => i.id !== selectedId)); setSelectedId(null); setDoc(null); setMode('search'); } }, sel)}
        {btn('↩️', 'تراجع عن الإضافة', () => { setDoc(selectedId ? all.find(i => i.id === selectedId) || null : null); if (!selectedId) setMode('search'); }, mode === 'edit' && !saved)}
        {btn('❌', 'خروج', onClose)}
      </div>

      {mode === 'search' ? (
        <div className="flex-1 overflow-auto p-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={searchCol} onChange={e => setSearchCol(e.target.value)} className="border border-border rounded-md px-2 bg-background text-sm">
              <option value="all">الكل</option><option value="invoiceNumber">رقم الفاتورة</option><option value="date">التاريخ</option><option value="customerName">العميل</option><option value="currency">العملة</option><option value="net">الصافي</option>
            </select>
          </div>
          <div className="overflow-auto border border-border rounded-md max-h-[70vh]">
            <table className="w-full text-[13px] border-collapse">
              <thead><tr>{['رقم الفاتورة', 'التاريخ', 'النوع', 'العميل/الصندوق', 'العملة', 'الصافي'].map(h => <th key={h} className="sticky top-0 bg-[hsl(var(--report-header,197_71%_73%))] border border-border p-2 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id} onClick={() => { setSelectedId(i.id); setDoc(i); setMode('edit'); }} className={`cursor-pointer ${selectedId === i.id ? 'bg-primary/20' : ''}`}>
                    <td className="border border-border p-2">{i.invoiceNumber}</td><td className="border border-border p-2">{i.date}</td>
                    <td className="border border-border p-2">{i.payType === 'cash' ? 'نقد' : i.payType === 'bank' ? 'تحويل بنكي' : 'آجل'}</td>
                    <td className="border border-border p-2">{i.customerName || i.payAccountName}</td><td className="border border-border p-2">{i.currency}</td>
                    <td className="border border-border p-2 font-bold">{invoiceTotals(i.lines).net.toLocaleString()}</td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد فواتير — اضغط ➕ للإضافة</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : doc && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <F label="رقم الفاتورة"><Input value={doc.invoiceNumber} readOnly className="bg-secondary" /></F>
            <F label="التاريخ"><Input type="date" value={doc.date} onChange={e => set({ date: e.target.value })} /></F>
            <F label="نوع الفاتورة">
              <select value={doc.payType} onChange={e => set({ payType: e.target.value as PayType, payAccountName: '', payAccountNumber: '' })} className="w-full h-10 border border-border rounded-md px-2 bg-background">
                <option value="cash">نقد</option><option value="bank">تحويل بنكي</option><option value="credit">آجل</option>
              </select>
            </F>
            {doc.payType !== 'credit' && <>
              <F label={doc.payType === 'bank' ? 'رقم البنك' : 'رقم الصندوق'}><Input list="payList" value={doc.payAccountNumber} onChange={e => { const en = pickEntity(e.target.value, payEntities); set({ payAccountNumber: e.target.value, payAccountName: en?.entityName || doc.payAccountName }); }} /></F>
              <F label={doc.payType === 'bank' ? 'اسم البنك' : 'اسم الصندوق'}><Input list="payNames" value={doc.payAccountName} onChange={e => { const en = pickEntity(e.target.value, payEntities); set({ payAccountName: e.target.value, payAccountNumber: en?.entityNumber || doc.payAccountNumber }); }} /></F>
            </>}
            {doc.payType === 'credit' && <CustomerFields doc={doc} set={set} customers={customers} pick={pickEntity} />}
            <F label="رمز العملة">
              <select value={doc.currency} onChange={e => set({ currency: e.target.value })} className="w-full h-10 border border-border rounded-md px-2 bg-background">
                {currencies.map(c => <option key={c.id} value={c.symbol}>{c.symbol}</option>)}
              </select>
            </F>
            <F label="سعر الصرف"><Input type="number" dir="ltr" value={doc.rate} onChange={e => set({ rate: +e.target.value || 0 })} /></F>
            <F label="المبلغ بالعملة المحلية"><Input readOnly className="bg-secondary" value={(totals.net * doc.rate).toLocaleString()} /></F>
            <F label="رقم المرجع"><Input value={doc.reference} onChange={e => set({ reference: e.target.value })} /></F>
            {doc.payType !== 'credit' && <CustomerFields doc={doc} set={set} customers={customers} pick={pickEntity} withPhone />}
          </div>
          <datalist id="payList">{payEntities.map(e => <option key={e.id} value={e.entityNumber}>{e.entityName}</option>)}</datalist>
          <datalist id="payNames">{payEntities.map(e => <option key={e.id} value={e.entityName} />)}</datalist>
          <datalist id="custList">{customers.map(e => <option key={e.id} value={e.entityNumber}>{e.entityName}</option>)}</datalist>
          <datalist id="custNames">{customers.map(e => <option key={e.id} value={e.entityName} />)}</datalist>

          <div className="overflow-auto border border-border rounded-md">
            <table className="text-[13px] border-collapse min-w-[900px] w-full">
              <thead><tr>{['…', 'رقم الصنف', 'اسم الصنف', 'الوحدة', 'المخزون', 'الكمية', 'تكلفة الوحدة', 'سعر الوحدة', 'الخصم', 'الإجمالي'].map(h => <th key={h} className="sticky top-0 bg-[#87CEEB] text-black border border-border p-1 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {doc.lines.map(l => (
                  <tr key={l.id} className={isBelowCost(l) ? 'bg-destructive/10' : ''}>
                    <td className="border border-border p-1 relative">
                      <button className="px-2 text-lg" aria-label="خيارات" onClick={() => setMenuLine(menuLine === l.id ? null : l.id)}>⋮</button>
                      {menuLine === l.id && (
                        <div className="absolute z-20 top-8 right-0 bg-card border border-border rounded-md shadow-lg text-sm w-36">
                          <button className="block w-full text-right p-2 hover:bg-secondary" onClick={() => { setLine(l.id, {}); setDoc(d => d ? { ...d, lines: [...d.lines, newLine()] } : d); setMenuLine(null); }}>إضافة صنف جديد</button>
                          <button className="block w-full text-right p-2 hover:bg-secondary text-destructive" onClick={() => { setDoc(d => d ? { ...d, lines: d.lines.length > 1 ? d.lines.filter(x => x.id !== l.id) : [newLine()] } : d); setMenuLine(null); }}>حذف الصف</button>
                        </div>
                      )}
                    </td>
                    <C v={l.itemNumber} on={v => setLine(l.id, { itemNumber: v })} />
                    <C v={l.itemName} on={v => setLine(l.id, { itemName: v })} w="min-w-[140px]" />
                    <C v={l.unit} on={v => setLine(l.id, { unit: v })} />
                    <C v={l.stock} num on={v => setLine(l.id, { stock: +v || 0 })} />
                    <C v={l.qty} num on={v => setLine(l.id, { qty: +v || 0 })} />
                    <C v={l.unitCost} num on={v => setLine(l.id, { unitCost: +v || 0 })} />
                    <C v={l.price} num on={v => setLine(l.id, { price: +v || 0 })} />
                    <C v={l.discount} num on={v => setLine(l.id, { discount: +v || 0 })} />
                    <td className="border border-border p-1 font-bold text-center">{lineTotal(l).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDoc(d => d ? { ...d, lines: [...d.lines, newLine()] } : d)}>+ صف جديد</Button>

          <div className="grid grid-cols-3 gap-2 text-sm border border-border rounded-md p-2 bg-card">
            <T l="اسم المستخدم" v={doc.userName || settings.userName || '-'} />
            <T l="تاريخ ووقت الحفظ" v={doc.savedAt || '-'} />
            <T l="إجمالي الكمية" v={totals.qty} />
            <T l="الإجمالي قبل الخصم" v={totals.gross.toLocaleString()} />
            <T l="إجمالي الخصم" v={totals.discount.toLocaleString()} />
            <T l="الصافي" v={`${totals.net.toLocaleString()} ${doc.currency}`} bold />
          </div>
        </div>
      )}

      <Dialog open={showJournal} onOpenChange={setShowJournal}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>القيود المحاسبية التلقائية</DialogTitle></DialogHeader>
          {doc && buildJournal(doc).map((entry, i) => (
            <table key={i} className="w-full text-[13px] border-collapse mb-3">
              <thead><tr>{['الحساب', 'مدين', 'دائن', 'البيان'].map(h => <th key={h} className="bg-[#87CEEB] text-black border border-border p-1">{h}</th>)}</tr></thead>
              <tbody>{entry.map((j, k) => <tr key={k}><td className="border border-border p-1">{j.account}</td><td className="border border-border p-1">{j.debit ? j.debit.toLocaleString() : ''}</td><td className="border border-border p-1">{j.credit ? j.credit.toLocaleString() : ''}</td><td className="border border-border p-1">{j.description}</td></tr>)}</tbody>
            </table>
          ))}
        </DialogContent>
      </Dialog>

      <Dialog open={!!warn} onOpenChange={o => !o && setWarn(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تحذير</DialogTitle></DialogHeader>
          <p>يوجد صنف سعر بيعه أقل من سعر التكلفة. هل تريد المتابعة والحفظ؟</p>
          <DialogFooter className="gap-2">
            <Button onClick={() => { warn?.(); setWarn(null); }}>موافق</Button>
            <Button variant="outline" onClick={() => setWarn(null)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground block mb-1">{label}</label>{children}</div>;
}
function C({ v, on, num, w = 'min-w-[70px]' }: { v: string | number; on: (v: string) => void; num?: boolean; w?: string }) {
  return <td className={`border border-border p-0 ${w}`}><input value={v} type={num ? 'number' : 'text'} onChange={e => on(e.target.value)} className="w-full h-9 px-1 bg-transparent text-center outline-none" /></td>;
}
function T({ l, v, bold }: { l: string; v: React.ReactNode; bold?: boolean }) {
  return <div><div className="text-xs text-muted-foreground">{l}</div><div className={bold ? 'font-bold text-primary' : ''}>{v}</div></div>;
}
function CustomerFields({ doc, set, customers, pick, withPhone }: any) {
  return <>
    <F label="رقم العميل"><Input list="custList" value={doc.customerNumber} onChange={e => { const en = pick(e.target.value, customers); set({ customerNumber: e.target.value, customerName: en?.entityName || doc.customerName, phone: en?.phone || doc.phone }); }} /></F>
    <F label="اسم العميل"><Input list="custNames" value={doc.customerName} onChange={e => { const en = pick(e.target.value, customers); set({ customerName: e.target.value, customerNumber: en?.entityNumber || doc.customerNumber, phone: en?.phone || doc.phone }); }} /></F>
    {withPhone && <F label="رقم الجوال"><Input dir="ltr" value={doc.phone} onChange={e => set({ phone: e.target.value })} /></F>}
  </>;
}
