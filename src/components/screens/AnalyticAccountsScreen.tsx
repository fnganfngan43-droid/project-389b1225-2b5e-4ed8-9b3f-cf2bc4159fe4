import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { useAccounting } from '@/contexts/AccountingContext';
import { AnalyticEntity, AnalyticType } from '@/types/accounting';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  analyticType: AnalyticType;
  title: string;
}

const emptyForm = {
  parentAccountNumber: '',
  entityNumber: '',
  entityName: '',
  phone: '',
  phone2: '',
  country: '',
  governorate: '',
  city: '',
  currencies: [] as string[],
  defaultCurrency: '',
};

export function AnalyticAccountsScreen({ analyticType, title }: Props) {
  const {
    chartAccounts,
    analyticEntities,
    addAnalyticEntity,
    updateAnalyticEntity,
    deleteAnalyticEntity,
    governorates,
    currencies,
  } = useAccounting();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Subsidiary accounts in the chart flagged with this analytic type
  const parentAccounts = useMemo(
    () => chartAccounts.filter((a) => a.kind === 'فرعي' && a.analyticType === analyticType),
    [chartAccounts, analyticType]
  );

  const rows = useMemo(() => {
    const list = analyticEntities.filter((e) => e.analyticType === analyticType);
    if (!search.trim()) return list;
    const q = search.trim();
    return list.filter((e) =>
      [e.entityName, e.entityNumber, e.parentAccountName, e.parentAccountNumber, e.phone, e.governorate, e.city]
        .filter(Boolean)
        .some((v) => String(v).includes(q))
    );
  }, [analyticEntities, analyticType, search]);

  const parent = parentAccounts.find((a) => a.accountNumber === form.parentAccountNumber);
  const parentCurrencies = parent?.currencies?.length ? parent.currencies : currencies.map((c) => c.symbol);

  const nextEntityNumber = (parentNumber: string) => {
    const siblings = analyticEntities.filter((e) => e.parentAccountNumber === parentNumber);
    if (siblings.length === 0) return '1';
    const max = Math.max(...siblings.map((s) => parseInt(s.entityNumber, 10) || 0));
    return String(max + 1);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = () => {
    const item = analyticEntities.find((e) => e.id === selectedId);
    if (!item) return toast.error('اختر سجلاً أولاً');
    setEditingId(item.id);
    setForm({
      parentAccountNumber: item.parentAccountNumber,
      entityNumber: item.entityNumber,
      entityName: item.entityName,
      phone: item.phone || '',
      phone2: item.phone2 || '',
      country: item.country || '',
      governorate: item.governorate || '',
      city: item.city || '',
      currencies: item.currencies || [],
      defaultCurrency: item.defaultCurrency || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = () => {
    if (!selectedId) return toast.error('اختر سجلاً أولاً');
    deleteAnalyticEntity(selectedId);
    setSelectedId(null);
    toast.success('تم الحذف');
  };

  const handleParentChange = (number: string) => {
    setForm((p) => ({
      ...p,
      parentAccountNumber: number,
      entityNumber: editingId ? p.entityNumber : nextEntityNumber(number),
    }));
  };

  const toggleCurrency = (symbol: string) => {
    setForm((p) => {
      const has = p.currencies.includes(symbol);
      const next = has ? p.currencies.filter((c) => c !== symbol) : [...p.currencies, symbol];
      return { ...p, currencies: next, defaultCurrency: next.includes(p.defaultCurrency) ? p.defaultCurrency : next[0] || '' };
    });
  };

  const handleSave = () => {
    if (!form.parentAccountNumber) return toast.error('اختر الحساب الرئيسي');
    if (!form.entityName.trim()) return toast.error('أدخل الاسم');
    if (form.currencies.length === 0) return toast.error('اختر عملة واحدة على الأقل');

    const duplicate = analyticEntities.some(
      (e) =>
        e.id !== editingId &&
        e.analyticType === analyticType &&
        (e.entityName === form.entityName.trim() ||
          (e.parentAccountNumber === form.parentAccountNumber && e.entityNumber === form.entityNumber))
    );
    if (duplicate) return toast.error('الاسم أو الرقم مكرر');

    const payload: Omit<AnalyticEntity, 'id'> = {
      analyticType,
      parentAccountNumber: form.parentAccountNumber,
      parentAccountName: parent?.accountName || '',
      entityNumber: form.entityNumber || nextEntityNumber(form.parentAccountNumber),
      entityName: form.entityName.trim(),
      phone: form.phone,
      phone2: form.phone2,
      country: form.country,
      governorate: form.governorate,
      city: form.city,
      currencies: form.currencies,
      defaultCurrency: form.defaultCurrency || form.currencies[0],
    };

    if (editingId) {
      updateAnalyticEntity(editingId, payload);
      toast.success('تم التعديل');
    } else {
      addAnalyticEntity(payload);
      toast.success('تمت الإضافة');
    }
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const fullNumber = form.parentAccountNumber
    ? `${form.parentAccountNumber}${String(form.entityNumber || '').padStart(2, '0')}`
    : '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-3 gap-3">
      <ActionToolbar
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={`بحث في ${title}...`}
      />

      {isFormOpen && (
        <div className="fixed inset-x-0 top-0 z-50 max-h-[90vh] overflow-auto border-2 border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">{editingId ? `تعديل ${title}` : `إضافة ${title}`}</h3>
            <Button variant="outline" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>اسم الحساب / المجموعة</Label>
              <Select value={form.parentAccountNumber} onValueChange={handleParentChange}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="اختر الحساب الفرعي" />
                </SelectTrigger>
                <SelectContent>
                  {parentAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.accountNumber}>
                      {a.accountNumber} - {a.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>رقم الحساب</Label>
              <Input value={form.parentAccountNumber} readOnly className="border-2 border-border bg-muted" />
            </div>
            <div>
              <Label>الرقم التحليلي</Label>
              <Input
                value={form.entityNumber}
                onChange={(e) => setForm((p) => ({ ...p, entityNumber: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>الاسم التحليلي الكامل</Label>
              <Input value={fullNumber} readOnly className="border-2 border-border bg-muted" />
            </div>
            <div>
              <Label>الاسم</Label>
              <Input
                value={form.entityName}
                onChange={(e) => setForm((p) => ({ ...p, entityName: e.target.value }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>رقم الجوال</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>رقم جوال آخر</Label>
              <Input
                value={form.phone2}
                onChange={(e) => setForm((p) => ({ ...p, phone2: e.target.value }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>الدولة</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                className="border-2 border-border"
              />
            </div>
            <div>
              <Label>المحافظة</Label>
              <Select value={form.governorate} onValueChange={(v) => setForm((p) => ({ ...p, governorate: v, city: '' }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="اختر المحافظة" />
                </SelectTrigger>
                <SelectContent>
                  {governorates.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المدينة</Label>
              <Select value={form.city} onValueChange={(v) => setForm((p) => ({ ...p, city: v }))}>
                <SelectTrigger className="border-2 border-border">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {governorates
                    .filter((g) => (form.governorate ? g.name === form.governorate : true))
                    .filter((g) => !!g.city)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.city as string}>
                        {g.city}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <Label>العملات (يمكن اختيار أكثر من عملة)</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parentCurrencies.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleCurrency(sym)}
                  className={`px-3 py-1 rounded border-2 border-border text-sm ${
                    form.currencies.includes(sym) ? 'bg-primary text-primary-foreground' : 'bg-background'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
            {form.currencies.length > 0 && (
              <div className="mt-2 max-w-xs">
                <Label>العملة الافتراضية</Label>
                <Select value={form.defaultCurrency} onValueChange={(v) => setForm((p) => ({ ...p, defaultCurrency: v }))}>
                  <SelectTrigger className="border-2 border-border">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      <ScrollableTable<AnalyticEntity>
        data={rows}
        getItemId={(i) => i.id}
        selectedId={selectedId || undefined}
        onRowClick={(i) => setSelectedId(i.id === selectedId ? null : i.id)}
        emptyIcon={<Users className="h-10 w-10 mx-auto mb-2 opacity-40" />}
        emptyTitle={`لا توجد بيانات ${title}`}
        columns={[
          { key: 'parentName', header: 'اسم الحساب', render: (i) => i.parentAccountName },
          { key: 'parentNumber', header: 'رقم الحساب', render: (i) => i.parentAccountNumber },
          { key: 'num', header: 'الرقم', render: (i) => i.entityNumber },
          { key: 'name', header: 'الاسم', render: (i) => i.entityName },
          { key: 'phone', header: 'رقم الجوال', render: (i) => i.phone || '-' },
          { key: 'country', header: 'الدولة', render: (i) => i.country || '-' },
          { key: 'gov', header: 'المحافظة', render: (i) => i.governorate || '-' },
          { key: 'city', header: 'المدينة', render: (i) => i.city || '-' },
          { key: 'phone2', header: 'جوال آخر', render: (i) => i.phone2 || '-' },
          { key: 'cur', header: 'العملات', render: (i) => i.currencies.join(' , ') },
        ]}
      />
    </div>
  );
}
