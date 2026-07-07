import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Account } from '@/types/accounting';
import { parseExcelFile, mapAccountRow } from '@/utils/excelImport';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';

export function ChartOfAccountsScreen() {
  const { accounts, groups, currencies, governorates, addAccount, updateAccount, deleteAccount, vouchers, openingBalances, invoices, currencyExchanges } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    groupName: '',
    currency: '',
    phone: '',
    governorate: '',
  });

  const filteredAccounts = accounts.filter(acc => 
    acc.accountName.includes(searchTerm) || 
    acc.accountNumber.includes(searchTerm) ||
    acc.groupName.includes(searchTerm)
  );

  const handleGroupChange = (groupName: string) => {
    const group = groups.find(g => g.name === groupName);
    if (group) {
      const existingInGroup = accounts.filter(a => a.groupName === groupName);
      const nextNumber = existingInGroup.length + 1;
      const accountNumber = `${group.initialNumber.slice(0, -1)}${nextNumber}`;
      setFormData(prev => ({ ...prev, groupName, accountNumber }));
    }
  };

  const handleSave = () => {
    if (!formData.accountName || !formData.groupName || !formData.currency) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // Check for duplicate
    const isDuplicate = accounts.some(a => 
      a.accountNumber === formData.accountNumber || a.accountName === formData.accountName
    );
    if (isDuplicate && !editingAccount) {
      toast.error('رقم الحساب أو اسم الحساب موجود مسبقاً');
      return;
    }

    if (editingAccount) {
      updateAccount(editingAccount.id, {
        ...formData,
        balance: editingAccount.balance,
        type: editingAccount.type,
      });
      toast.success('تم تحديث الحساب بنجاح');
    } else {
      addAccount({
        ...formData,
        balance: 0,
        type: 'debit',
      });
      toast.success('تم إضافة الحساب بنجاح');
    }

    resetForm();
  };

  const handleEdit = () => {
    if (selectedAccount) {
      setEditingAccount(selectedAccount);
      setFormData({
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.accountName,
        groupName: selectedAccount.groupName,
        currency: selectedAccount.currency,
        phone: selectedAccount.phone || '',
        governorate: selectedAccount.governorate || '',
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedAccount) {
      // Check if account has any transactions
      const hasVouchers = vouchers.some(v => 
        v.accountName === selectedAccount.accountName || 
        v.debitAccountName === selectedAccount.accountName || 
        v.creditAccountName === selectedAccount.accountName
      );
      const hasOpeningBalances = openingBalances.some(ob => ob.accountName === selectedAccount.accountName);
      const hasInvoices = invoices.some(inv => inv.accountName === selectedAccount.accountName);
      const hasCurrencyExchanges = currencyExchanges.some(ce => 
        ce.fromAccountName === selectedAccount.accountName || ce.toAccountName === selectedAccount.accountName
      );
      
      if (hasVouchers || hasOpeningBalances || hasInvoices || hasCurrencyExchanges) {
        toast.error(`عذراً، الحساب "${selectedAccount.accountName}" له حركة سابقة ولا يمكن حذفه`);
        return;
      }
      
      deleteAccount(selectedAccount.id);
      setSelectedAccount(null);
      toast.success('تم حذف الحساب بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      accountNumber: '',
      accountName: '',
      groupName: '',
      currency: '',
      phone: '',
      governorate: '',
    });
    setIsAdding(false);
    setEditingAccount(null);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        const mapped = mapAccountRow(row);
        if (mapped && mapped.accountName && mapped.groupName) {
          // Check for duplicate
          const isDuplicate = accounts.some(a => 
            a.accountNumber === mapped.accountNumber || a.accountName === mapped.accountName
          );
          if (!isDuplicate) {
            addAccount({
              ...mapped,
              balance: 0,
              type: 'debit',
            });
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} حساب بنجاح`);
      }
      if (errorCount > 0) {
        toast.warning(`تم تجاهل ${errorCount} صف (بيانات ناقصة أو مكررة)`);
      }
    } catch (error) {
      toast.error('فشل في استيراد الملف');
    }
  };

  const columns = [
    {
      key: 'accountNumber',
      header: 'رقم الحساب',
      render: (account: Account) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">{account.accountNumber}</span>
      ),
    },
    {
      key: 'accountName',
      header: 'اسم الحساب',
      render: (account: Account) => (
        <span className="font-semibold">{account.accountName}</span>
      ),
    },
    {
      key: 'groupName',
      header: 'المجموعة',
      render: (account: Account) => account.groupName,
    },
    {
      key: 'phone',
      header: 'رقم الجوال',
      render: (account: Account) => account.phone || '-',
    },
    {
      key: 'governorate',
      header: 'المحافظة',
      render: (account: Account) => account.governorate || '-',
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (account: Account) => account.currency,
    },
    {
      key: 'balance',
      header: 'الرصيد',
      render: (account: Account) => (
        <span className={`font-bold ${account.type === 'debit' ? 'text-success' : 'text-destructive'}`}>
          {account.balance.toLocaleString()}
        </span>
      ),
      className: 'text-left',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Fixed Section - Toolbar */}
      <div className="shrink-0 px-4 pt-2">
        <ActionToolbar
          onAdd={() => setIsAdding(true)}
          onEdit={selectedAccount ? handleEdit : undefined}
          onDelete={selectedAccount ? handleDelete : undefined}
          onImport={handleImport}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في الحسابات..."
          importTitle="استيراد دليل الحسابات"
          importColumns={[
            'اسم المجموعة',
            'رقم الحساب',
            'اسم الحساب',
            'رقم الجوال',
            'العملة',
            'المحافظة',
          ]}
        />
      </div>

      {/* Scrollable Content Area - Form + Table */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Add/Edit Form */}
        {isAdding && (
          <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto flex items-start justify-center p-4 animate-in fade-in">
          <Card className="animate-slide-up border-2 border-primary/20 w-full max-w-4xl mt-4 mb-4 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              {editingAccount ? 'تعديل حساب' : 'إضافة حساب جديد'}
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                <Select value={formData.groupName} onValueChange={handleGroupChange}>
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
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                  className="text-left"
                  dir="ltr"
                  readOnly
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب</label>
                <Input
                  value={formData.accountName}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="اسم الحساب"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم الجوال</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="رقم الجوال"
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">العملة</label>
                <Select value={formData.currency} onValueChange={(val) => setFormData(prev => ({ ...prev, currency: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(curr => (
                      <SelectItem key={curr.id} value={curr.symbol}>
                        {curr.name} ({curr.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">المحافظة</label>
                <Select value={formData.governorate} onValueChange={(val) => setFormData(prev => ({ ...prev, governorate: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map(gov => (
                      <SelectItem key={gov.id} value={gov.name}>
                        {gov.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Save button */}
            <Button onClick={handleSave} className="w-full" size="lg">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Accounts Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredAccounts}
          columns={columns}
          onRowClick={(account) => setSelectedAccount(selectedAccount?.id === account.id ? null : account)}
          selectedId={selectedAccount?.id}
          getItemId={(account) => account.id}
          emptyIcon={<Users className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle="لا توجد حسابات"
            emptyDescription="اضغط على 'إضافة' لإنشاء حساب جديد"
          />
        </div>
      </div>
    </div>
  );
}
