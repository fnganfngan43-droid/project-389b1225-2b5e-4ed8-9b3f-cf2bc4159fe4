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

  const handleAccountSelect = (name: string, acc?: any) => {
    const account = acc || accounts.find((a) => a.accountName === name);
    setFormData((prev) => ({
      ...prev,
      accountName: name,
      currency: account?.currency || prev.currency,
      amount: account ? String(account.balance) : prev.amount,
    }));
  };

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
    if (!selectedItem) return;
    deleteReconciliation(selectedItem.id);
    setSelectedItem(null);
    toast.success('تم حذف المطابقة');
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
          onEdit={selectedItem ? handleEdit : undefined}
          onDelete={selectedItem ? handleDelete : undefined}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في المطابقات..."
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
