import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { OpeningBalance } from '@/types/accounting';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { AccountNumberInput } from '@/components/AccountNumberInput';
import { parseExcelFile, mapOpeningBalanceRow } from '@/utils/excelImport';
import { findClosestMatch } from '@/utils/fuzzyMatch';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export function OpeningBalanceScreen() {
  const { openingBalances, accounts, groups, currencies, addOpeningBalance, updateOpeningBalance, deleteOpeningBalance } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<OpeningBalance | null>(null);
  const [editingBalance, setEditingBalance] = useState<OpeningBalance | null>(null);

  const filteredBalances = openingBalances.filter(b => 
    b.accountName.includes(searchTerm)
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    groupName: '',
    accountNumber: '',
    accountName: '',
    debit: '',
    credit: '',
    currency: '',
  });

  const filteredAccounts = accounts.filter(a => a.groupName === formData.groupName);

  const handleSave = () => {
    if (!formData.accountName || !formData.currency || (!formData.debit && !formData.credit)) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (editingBalance) {
      updateOpeningBalance(editingBalance.id, {
        date: formData.date,
        accountName: formData.accountName,
        currency: formData.currency,
        debit: parseFloat(formData.debit) || 0,
        credit: parseFloat(formData.credit) || 0,
      });
      toast.success('تم تحديث الرصيد الافتتاحي بنجاح');
    } else {
      addOpeningBalance({
        date: formData.date,
        accountName: formData.accountName,
        currency: formData.currency,
        debit: parseFloat(formData.debit) || 0,
        credit: parseFloat(formData.credit) || 0,
      });
      toast.success('تم حفظ الرصيد الافتتاحي بنجاح');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (selectedBalance) {
      const account = accounts.find(a => a.accountName === selectedBalance.accountName);
      setEditingBalance(selectedBalance);
      setFormData({
        date: selectedBalance.date,
        groupName: account?.groupName || '',
        accountNumber: account?.accountNumber || '',
        accountName: selectedBalance.accountName,
        debit: selectedBalance.debit.toString(),
        credit: selectedBalance.credit.toString(),
        currency: selectedBalance.currency,
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedBalance) {
      deleteOpeningBalance(selectedBalance.id);
      setSelectedBalance(null);
      toast.success('تم حذف الرصيد بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      groupName: '',
      accountNumber: '',
      accountName: '',
      debit: '',
      credit: '',
      currency: '',
    });
    setIsAdding(false);
    setEditingBalance(null);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;
      const accountNames = accounts.map(a => a.accountName);

      for (const row of rows) {
        const mapped = mapOpeningBalanceRow(row);
        if (mapped && mapped.accountName) {
          addOpeningBalance({
            date: mapped.date,
            accountName: findClosestMatch(mapped.accountName, accountNames),
            currency: mapped.currency,
            debit: mapped.debit,
            credit: mapped.credit,
          });
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} رصيد افتتاحي بنجاح`);
      }
    } catch (error) {
      toast.error('فشل في استيراد الملف');
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'التاريخ',
      render: (balance: OpeningBalance) => balance.date,
    },
    {
      key: 'accountName',
      header: 'اسم الحساب',
      render: (balance: OpeningBalance) => (
        <span className="font-semibold">{balance.accountName}</span>
      ),
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (balance: OpeningBalance) => balance.currency,
    },
    {
      key: 'debit',
      header: 'مدين',
      render: (balance: OpeningBalance) => (
        <span className={balance.debit > 0 ? 'text-success font-bold' : ''}>
          {balance.debit > 0 ? balance.debit.toLocaleString() : '-'}
        </span>
      ),
      className: 'text-left',
    },
    {
      key: 'credit',
      header: 'دائن',
      render: (balance: OpeningBalance) => (
        <span className={balance.credit > 0 ? 'text-destructive font-bold' : ''}>
          {balance.credit > 0 ? balance.credit.toLocaleString() : '-'}
        </span>
      ),
      className: 'text-left',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      <div className="shrink-0 px-4 pt-2">
        <ActionToolbar
          onAdd={() => setIsAdding(true)}
          onEdit={selectedBalance ? handleEdit : undefined}
          onDelete={selectedBalance ? handleDelete : undefined}
          onImport={handleImport}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في الأرصدة..."
          importTitle="استيراد الأرصدة الافتتاحية"
          importColumns={[
            'التاريخ',
            'رمز العملة',
            'اسم المجموعة',
            'اسم الحساب',
            'مدين',
            'دائن',
          ]}
        />
      </div>

      {/* Scrollable Content Area - Form + Table */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Add Form */}
        {isAdding && (
          <Card className="animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {editingBalance ? 'تعديل رصيد افتتاحي' : 'رصيد افتتاحي جديد'}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">التاريخ</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => (
                      <SelectItem key={curr.id} value={curr.symbol}>
                        {curr.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                <Select 
                  value={formData.groupName} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, groupName: val, accountName: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المجموعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم الحساب</label>
                <AccountNumberInput
                  accounts={accounts}
                  value={formData.accountNumber || ''}
                  onChange={(val) => setFormData(prev => ({ ...prev, accountNumber: val }))}
                  onAccountFound={(acc) => setFormData(prev => ({ ...prev, groupName: acc.groupName, accountName: acc.accountName, accountNumber: acc.accountNumber }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب</label>
                <AccountSearchInput
                  accounts={filteredAccounts}
                  value={formData.accountName}
                  onSelect={(val, acc) => setFormData(prev => ({ ...prev, accountName: val, accountNumber: acc?.accountNumber || prev.accountNumber }))}
                  placeholder="ابحث عن الحساب..."
                  disabled={!formData.groupName}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">مدين</label>
                <Input
                  type="number"
                  value={formData.debit}
                  onChange={(e) => setFormData(prev => ({ ...prev, debit: e.target.value, credit: '' }))}
                  placeholder="0"
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">دائن</label>
                <Input
                  type="number"
                  value={formData.credit}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit: e.target.value, debit: '' }))}
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

        {/* Balances Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredBalances}
          columns={columns}
          onRowClick={(balance) => setSelectedBalance(selectedBalance?.id === balance.id ? null : balance)}
          selectedId={selectedBalance?.id}
          getItemId={(balance) => balance.id}
          emptyIcon={<BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle="لا توجد أرصدة افتتاحية"
            emptyDescription="اضغط على 'إضافة' لإنشاء رصيد افتتاحي جديد"
          />
        </div>
      </div>
    </div>
  );
}
