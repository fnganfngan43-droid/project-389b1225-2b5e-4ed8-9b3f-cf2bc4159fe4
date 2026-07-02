import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { getNextSequentialNumber } from '@/utils/sequentialNumber';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { Reconciliation } from '@/types/accounting';
import { parseExcelFile } from '@/utils/excelImport';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, X, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

export function ReconciliationScreen() {
  const {
    accounts,
    groups,
    currencies,
    reconciliations,
    vouchers,
    openingBalances,
    invoices,
    discounts,
    currencyExchanges,
    addReconciliation,
    updateReconciliation,
    deleteReconciliation,
  } = useAccounting();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Reconciliation | null>(null);
  const [editingItem, setEditingItem] = useState<Reconciliation | null>(null);

  const filtered = reconciliations.filter(
    (r) =>
      r.accountName.includes(searchTerm) ||
      r.reconciliationNumber.includes(searchTerm),
  );

  const nextNumber = useMemo(() => {
    const existing = reconciliations.map((r) => r.reconciliationNumber);
    return getNextSequentialNumber(existing);
  }, [reconciliations]);

  const startOfYear = () => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  };
  const today = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    reconciliationNumber: nextNumber,
    groupName: '',
    accountName: '',
    currency: '',
    fromDate: startOfYear(),
    toDate: today(),
    amount: '',
  });

  const filteredAccounts = accounts.filter(
    (a) => a.groupName === formData.groupName,
  );

  const resetForm = () => {
    const existing = reconciliations.map((r) => r.reconciliationNumber);
    setFormData({
      reconciliationNumber: getNextSequentialNumber(existing),
      groupName: '',
      accountName: '',
      currency: '',
      fromDate: startOfYear(),
      toDate: today(),
      amount: '',
    });
    setIsAdding(false);
    setEditingItem(null);
  };

  // Compute cumulative balance (debit - credit) for account+currency up to toDate
  const computeBalance = (
    accountName: string,
    currency: string,
    toDate: string,
  ): number => {
    if (!accountName || !currency) return 0;
    const inRange = (d: string) => !toDate || d <= toDate;
    let bal = 0;
    openingBalances
      .filter((ob) => ob.accountName === accountName && ob.currency === currency && inRange(ob.date))
      .forEach((ob) => (bal += (ob.debit || 0) - (ob.credit || 0)));
    vouchers.filter((v) => inRange(v.date)).forEach((v) => {
      if (v.debitAccountName === accountName && v.debitCurrency === currency) bal += v.debitAmount || 0;
      if (v.creditAccountName === accountName && v.creditCurrency === currency) bal -= v.creditAmount || 0;
    });
    invoices
      .filter((i) => i.accountName === accountName && i.currency === currency && inRange(i.date))
      .forEach((i) => (bal += i.amount || 0));
    discounts
      .filter((d) => d.accountName === accountName && d.currency === currency && inRange(d.date))
      .forEach((d) => (bal -= d.amount || 0));
    currencyExchanges.filter((ex) => inRange(ex.date)).forEach((ex) => {
      if (ex.fromAccountName === accountName && ex.fromCurrency === currency) bal -= ex.fromAmount || 0;
      if (ex.toAccountName === accountName && ex.toCurrency === currency) bal += ex.toAmount || 0;
    });
    return bal;
  };

  const handleAccountSelect = (name: string, acc?: any) => {
    const account = acc || accounts.find((a) => a.accountName === name);
    const currency = account?.currency || formData.currency;
    setFormData((prev) => ({
      ...prev,
      accountName: name,
      currency,
      amount: name && currency ? String(computeBalance(name, currency, prev.toDate)) : prev.amount,
    }));
  };

  // Auto-refresh amount when group/account/currency/toDate change during add (not manual edit)
  useEffect(() => {
    if (!isAdding || editingItem) return;
    if (!formData.accountName || !formData.currency) return;
    const bal = computeBalance(formData.accountName, formData.currency, formData.toDate);
    setFormData((prev) => ({ ...prev, amount: String(bal) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.accountName, formData.currency, formData.toDate, formData.groupName]);


  const handleSave = () => {
    if (!formData.accountName || !formData.currency) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const payload = {
      reconciliationNumber: formData.reconciliationNumber,
      groupName: formData.groupName,
      accountName: formData.accountName,
      currency: formData.currency,
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      amount: parseFloat(formData.amount) || 0,
    };
    if (editingItem) {
      updateReconciliation(editingItem.id, payload);
      toast.success('تم تحديث المطابقة');
    } else {
      addReconciliation(payload);
      toast.success('تم حفظ المطابقة');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    setEditingItem(selectedItem);
    setFormData({
      reconciliationNumber: selectedItem.reconciliationNumber,
      groupName: selectedItem.groupName,
      accountName: selectedItem.accountName,
      currency: selectedItem.currency,
      fromDate: selectedItem.fromDate,
      toDate: selectedItem.toDate,
      amount: String(selectedItem.amount),
    });
    setIsAdding(true);
  };

  const handleDelete = () => {
    if (!selectedItem) {
      toast.error('يرجى تحديد مطابقة أولاً');
      return;
    }
    deleteReconciliation(selectedItem.id);
    setSelectedItem(null);
    toast.success('تم حذف المطابقة');
  };

  const handleEditClick = () => {
    if (!selectedItem) {
      toast.error('يرجى تحديد مطابقة أولاً');
      return;
    }
    handleEdit();
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let count = 0;
      const existing = reconciliations.map((r) => r.reconciliationNumber);
      let nextNum = parseInt(getNextSequentialNumber(existing), 10) || 1;
      rows.forEach((row) => {
        const accountName = String(row[2] || '').trim();
        if (!accountName) return;
        addReconciliation({
          reconciliationNumber: String(row[0] || nextNum++),
          groupName: String(row[1] || ''),
          accountName,
          currency: String(row[3] || ''),
          fromDate: String(row[4] || startOfYear()),
          toDate: String(row[5] || today()),
          amount: parseFloat(row[6]) || 0,
        });
        count++;
      });
      toast.success(`تم استيراد ${count} مطابقة`);
    } catch (e) {
      toast.error('فشل استيراد الملف');
    }
  };


  const columns = [
    {
      key: 'reconciliationNumber',
      header: 'الرقم',
      render: (r: Reconciliation) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">
          #{r.reconciliationNumber}
        </span>
      ),
    },
    {
      key: 'groupName',
      header: 'اسم المجموعة',
      render: (r: Reconciliation) => r.groupName || '-',
    },
    {
      key: 'accountName',
      header: 'اسم الحساب',
      render: (r: Reconciliation) => (
        <span className="font-semibold">{r.accountName}</span>
      ),
    },
    {
      key: 'currency',
      header: 'رمز العملة',
      render: (r: Reconciliation) => r.currency,
    },
    {
      key: 'fromDate',
      header: 'مطابق من تاريخ',
      render: (r: Reconciliation) => r.fromDate,
    },
    {
      key: 'toDate',
      header: 'مطابقة إلى تاريخ',
      render: (r: Reconciliation) => r.toDate,
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (r: Reconciliation) => (
        <span className="font-bold text-accent">
          {r.amount.toLocaleString()}
        </span>
      ),
      className: 'text-left',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      <div className="shrink-0 px-4 pt-2">
        <ActionToolbar
          onAdd={() => {
            resetForm();
            setIsAdding(true);
          }}
          onEdit={handleEditClick}
          onDelete={handleDelete}
          onImport={handleImport}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في المطابقات..."
          importColumns={[
            'الرقم',
            'اسم المجموعة',
            'اسم الحساب',
            'رمز العملة',
            'مطابق من تاريخ',
            'مطابقة إلى تاريخ',
            'المبلغ',
          ]}
          importTitle="استيراد المطابقات من Excel"
        />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isAdding && (
          <Card className="animate-slide-up border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  {editingItem ? 'تعديل مطابقة' : 'مطابقة جديدة'}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    الرقم
                  </label>
                  <Input
                    value={formData.reconciliationNumber}
                    readOnly
                    className="text-left bg-secondary"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    اسم المجموعة
                  </label>
                  <Select
                    value={formData.groupName}
                    onValueChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        groupName: val,
                        accountName: '',
                        amount: '',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المجموعة" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    اسم الحساب
                  </label>
                  <AccountSearchInput
                    accounts={filteredAccounts}
                    value={formData.accountName}
                    onSelect={handleAccountSelect}
                    placeholder="ابحث عن الحساب..."
                    disabled={!formData.groupName}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    العملة
                  </label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, currency: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="العملة" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.symbol}>
                          {c.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    مطابق من تاريخ
                  </label>
                  <Input
                    type="date"
                    value={formData.fromDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        fromDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    إلى تاريخ
                  </label>
                  <Input
                    type="date"
                    value={formData.toDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        toDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="text-sm text-muted-foreground mb-1 block">
                    المبلغ (الرصيد النهائي)
                  </label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="text-left"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" size="lg">
                <Save className="w-4 h-4" />
                حفظ
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="min-h-[300px]">
          <ScrollableTable
            data={filtered}
            columns={columns}
            onRowClick={(r) =>
              setSelectedItem(selectedItem?.id === r.id ? null : r)
            }
            selectedId={selectedItem?.id}
            getItemId={(r) => r.id}
            emptyIcon={
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            }
            emptyTitle="لا توجد مطابقات"
            emptyDescription="اضغط على 'إضافة' لإنشاء مطابقة جديدة"
          />
        </div>
      </div>
    </div>
  );
}
