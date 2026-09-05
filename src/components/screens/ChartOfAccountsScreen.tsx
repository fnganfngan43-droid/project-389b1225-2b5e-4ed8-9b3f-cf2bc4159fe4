import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounting } from '@/contexts/AccountingContext';
import { AnalyticType, ChartAccount } from '@/types/accounting';
import { AnalyticAccountsScreen } from '@/components/screens/AnalyticAccountsScreen';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Save, X, Search, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'tree' | 'عميل' | 'صناديق' | 'بنوك' | 'موردين';

const tabs: { id: Tab; label: string }[] = [
  { id: 'tree', label: 'شجرة الدليل' },
  { id: 'عميل', label: 'العملاء' },
  { id: 'صناديق', label: 'الصناديق' },
  { id: 'بنوك', label: 'البنوك' },
  { id: 'موردين', label: 'الموردين' },
];

const rankMarker = (rank: number) => {
  if (rank === 1) return '🟩';
  if (rank === 2) return '🔘';
  return rank >= 5 ? '➖' : '➕';
};

const emptyForm = {
  kind: 'رئيسي' as 'رئيسي' | 'فرعي',
  rank: '2',
  reportType: 'ميزانية عمومية' as 'ميزانية عمومية' | 'أرباح وخسائر',
  parentNumber: '',
  accountName: '',
  nature: 'مدين' as 'مدين' | 'دائن',
  analyticType: 'عام' as AnalyticType,
  analyticName: '',
  currencies: [] as string[],
};

interface Props {
  onClose?: () => void;
}

export function ChartOfAccountsScreen({ onClose }: Props) {
  const {
    chartAccounts,
    addChartAccount,
    updateChartAccount,
    deleteChartAccount,
    analyticEntities,
    currencies,
  } = useAccounting();

  const [tab, setTab] = useState<Tab>('tree');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const selected = chartAccounts.find((a) => a.id === selectedId) || null;

  const childrenOf = (number: string) =>
    chartAccounts
      .filter((a) => a.parentNumber === number)
      .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  const roots = chartAccounts
    .filter((a) => a.rank === 1)
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

  const toggle = (number: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(number) ? next.delete(number) : next.add(number);
      return next;
    });

  // ===== Add / edit form logic =====
  const rankOptions = form.kind === 'رئيسي' ? ['2', '3', '4'] : ['5', '6'];

  const parentRanks = (kind: string, rank: string): number[] => {
    if (kind === 'رئيسي') return [Number(rank) - 1];
    return rank === '5' ? [2, 3] : [4];
  };

  const parentOptions = useMemo(
    () => chartAccounts.filter((a) => parentRanks(form.kind, form.rank).includes(a.rank)),
    [chartAccounts, form.kind, form.rank]
  );

  const computeNumber = (kind: string, parentNumber: string) => {
    if (!parentNumber) return '';
    const siblings = chartAccounts.filter(
      (a) => a.parentNumber === parentNumber && a.kind === kind && a.id !== editingId
    );
    const seq = siblings.length + 1;
    return kind === 'رئيسي' ? `${parentNumber}${seq}` : `${parentNumber}${String(seq).padStart(3, '0')}`;
  };

  const previewNumber = computeNumber(form.kind, form.parentNumber);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = () => {
    if (!selected) return toast.error('حدد حساباً من الشجرة أولاً');
    if (selected.isSystem) return toast.error('لا يمكن تعديل الحسابات الأساسية');
    setEditingId(selected.id);
    setForm({
      kind: selected.kind,
      rank: String(selected.rank),
      reportType: selected.reportType || 'ميزانية عمومية',
      parentNumber: selected.parentNumber || '',
      accountName: selected.accountName,
      nature: selected.nature || 'مدين',
      analyticType: selected.analyticType || 'عام',
      analyticName: selected.analyticName || '',
      currencies: selected.currencies || [],
    });
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!selected) return toast.error('حدد حساباً من الشجرة أولاً');
    if (selected.isSystem) return toast.error('لا يمكن حذف الحسابات الأساسية');
    if (chartAccounts.some((a) => a.parentNumber === selected.accountNumber))
      return toast.error('لا يمكن الحذف: الحساب مرتبط بحسابات أخرى');
    if (analyticEntities.some((e) => e.parentAccountNumber === selected.accountNumber))
      return toast.error('لا يمكن الحذف: الحساب مرتبط بحسابات تحليلية');
    deleteChartAccount(selected.id);
    setSelectedId(null);
    toast.success('تم حذف الحساب');
  };

  const handleSave = () => {
    if (!form.parentNumber) return toast.error('اختر تصنيف الحساب');
    if (!form.accountName.trim()) return toast.error('أدخل اسم الحساب');
    const number = previewNumber;
    if (
      chartAccounts.some(
        (a) => a.id !== editingId && (a.accountNumber === number || a.accountName === form.accountName.trim())
      )
    )
      return toast.error('رقم الحساب أو اسمه موجود مسبقاً');

    const payload: Omit<ChartAccount, 'id'> = {
      rank: Number(form.rank) as ChartAccount['rank'],
      kind: form.kind,
      reportType: form.reportType,
      parentNumber: form.parentNumber,
      accountName: form.accountName.trim(),
      accountNumber: number,
      nature: form.nature,
      analyticType: form.kind === 'فرعي' ? form.analyticType : undefined,
      analyticName:
        form.kind === 'فرعي' && form.analyticType === 'عام' ? form.accountName.trim() : undefined,
      currencies: form.currencies,
    };

    if (editingId) {
      updateChartAccount(editingId, payload);
      toast.success('تم تعديل الحساب');
    } else {
      addChartAccount(payload);
      setExpanded((prev) => new Set(prev).add(form.parentNumber));
      toast.success('تمت إضافة الحساب');
    }
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const toggleCurrency = (sym: string) =>
    setForm((p) => ({
      ...p,
      currencies: p.currencies.includes(sym) ? p.currencies.filter((c) => c !== sym) : [...p.currencies, sym],
    }));

  // ===== Tree rendering =====
  const matches = (a: ChartAccount) =>
    !search.trim() || a.accountName.includes(search.trim()) || a.accountNumber.includes(search.trim());

  const renderNode = (node: ChartAccount, depth: number) => {
    const kids = childrenOf(node.accountNumber);
    const isOpen = expanded.has(node.accountNumber) || !!search.trim();
    const visible = matches(node) || (search.trim() && kids.length > 0);
    return (
      <div key={node.id}>
        {visible && (
          <div
            onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}
            onDoubleClick={() => kids.length > 0 && toggle(node.accountNumber)}
            className={cn(
              'flex items-center gap-2 py-1.5 px-2 cursor-pointer select-none border-b border-border/40 text-[14px]',
              selectedId === node.id ? 'bg-primary/20 font-bold' : 'hover:bg-muted/50'
            )}
            style={{ paddingInlineStart: 8 + depth * 20 }}
          >
            <span className="text-[13px]">{rankMarker(node.rank)}</span>
            <span className="font-mono text-[13px] text-muted-foreground">{node.accountNumber}</span>
            <span>{node.accountName}</span>
            {kids.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{isOpen ? '▾' : '▸'}</span>
            )}
          </div>
        )}
        {isOpen && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  if (tab !== 'tree') {
    const label = tabs.find((t) => t.id === tab)!.label;
    return (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Header tab={tab} setTab={setTab} onClose={onClose} />
        <AnalyticAccountsScreen analyticType={tab as AnalyticType} title={label} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <Header tab={tab} setTab={setTab} onClose={onClose} />

      <div className="p-3 flex flex-col gap-3 flex-1 overflow-hidden min-h-0">
        {/* Buttons row */}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={openAdd} className="gap-1 border-2 border-border">
            <Plus className="h-4 w-4" /> إضافة
          </Button>
          <Button variant="outline" className="gap-1 border-2 border-border" onClick={() => toast.info('الاستيراد من Excel متاح قريباً لهذه الشاشة')}>
            <FileSpreadsheet className="h-4 w-4" /> 📥 استيراد اكسل
          </Button>
          <Button variant="outline" className="gap-1 border-2 border-border" disabled={!selected} onClick={openEdit}>
            <Pencil className="h-4 w-4" /> تعديل
          </Button>
          <Button variant="outline" className="gap-1 border-2 border-border" disabled={!selected} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
        </div>

        {/* Search row */}
        <div className="relative max-w-md">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الدليل..."
            className="pr-8 border-2 border-border"
          />
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto border-2 border-border rounded-lg bg-card">
          {roots.map((r) => renderNode(r, 0))}
        </div>
      </div>

      {/* Add / edit overlay */}
      {isFormOpen && (
        <div className="fixed inset-x-0 top-0 z-50 max-h-[92vh] overflow-auto border-2 border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">{editingId ? 'تعديل حساب' : 'إضافة حساب'}</h3>
            <Button variant="outline" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>النوع</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, kind: v as 'رئيسي' | 'فرعي', rank: v === 'رئيسي' ? '2' : '5', parentNumber: '' }))
                }
              >
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="رئيسي">رئيسي</SelectItem>
                  <SelectItem value="فرعي">فرعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الرتبة</Label>
              <Select value={form.rank} onValueChange={(v) => setForm((p) => ({ ...p, rank: v, parentNumber: '' }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rankOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نوع التقرير</Label>
              <Select value={form.reportType} onValueChange={(v) => setForm((p) => ({ ...p, reportType: v as typeof p.reportType }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ميزانية عمومية">ميزانية عمومية</SelectItem>
                  <SelectItem value="أرباح وخسائر">أرباح وخسائر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تصنيف الحساب</Label>
              <Select value={form.parentNumber} onValueChange={(v) => setForm((p) => ({ ...p, parentNumber: v }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="اختر الحساب الأب" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.accountNumber}>
                      {a.accountNumber} - {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اسم الحساب</Label>
              <Input
                value={form.accountName}
                onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>رقم الحساب (تلقائي)</Label>
              <Input value={previewNumber} readOnly className="border-2 border-border bg-muted font-mono" />
            </div>
            <div>
              <Label>طبيعة الحساب</Label>
              <Select value={form.nature} onValueChange={(v) => setForm((p) => ({ ...p, nature: v as typeof p.nature }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="مدين">مدين</SelectItem>
                  <SelectItem value="دائن">دائن</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.kind === 'فرعي' && (
              <div>
                <Label>نوع الحساب التحليلي</Label>
                <Select
                  value={form.analyticType}
                  onValueChange={(v) => setForm((p) => ({ ...p, analyticType: v as AnalyticType }))}
                >
                  <SelectTrigger className="border-2 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['عام', 'عميل', 'صناديق', 'بنوك', 'موردين', 'مخزون'] as AnalyticType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.kind === 'فرعي' && form.analyticType === 'عام' && (
              <div>
                <Label>اسم الحساب التحليلي</Label>
                <Input value={form.accountName} readOnly className="border-2 border-border bg-muted" />
              </div>
            )}
          </div>

          <div className="mt-3">
            <Label>العملات</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {currencies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCurrency(c.symbol)}
                  className={cn(
                    'px-3 py-1 rounded border-2 border-border text-sm',
                    form.currencies.includes(c.symbol) ? 'bg-primary text-primary-foreground' : 'bg-background'
                  )}
                >
                  {c.name} ({c.symbol})
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> حفظ
            </Button>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ tab, setTab, onClose }: { tab: Tab; setTab: (t: Tab) => void; onClose?: () => void }) {
  return (
    <div className="border-b-2 border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h2 className="font-bold text-lg">الدليل المحاسبي</h2>
        {onClose && (
          <button onClick={onClose} className="text-xl leading-none px-2" aria-label="إغلاق">
            ❌
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto px-2 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded border-2 border-border whitespace-nowrap text-sm',
              tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-background'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
