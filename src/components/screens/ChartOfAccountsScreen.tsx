import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Account } from '@/types/accounting';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export function ChartOfAccountsScreen() {
  const { accounts, groups, currencies, governorates, addAccount, updateAccount, deleteAccount } = useAccounting();
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

  return (
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onEdit={selectedAccount ? handleEdit : undefined}
        onDelete={selectedAccount ? handleDelete : undefined}
        onImport={() => toast.info('سيتم إضافة خاصية الاستيراد قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في الحسابات..."
      />

      {/* Add/Edit Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
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
      )}

      {/* Accounts Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredAccounts.map((account, index) => (
            <Card
              key={account.id}
              onClick={() => setSelectedAccount(selectedAccount?.id === account.id ? null : account)}
              className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                selectedAccount?.id === account.id 
                  ? 'border-2 border-primary bg-primary/5 shadow-glow' 
                  : 'hover:border-primary/30'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        {account.accountNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">{account.groupName}</span>
                    </div>
                    <p className="font-semibold text-foreground">{account.accountName}</p>
                    {account.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {account.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-lg ${account.type === 'debit' ? 'text-success' : 'text-destructive'}`}>
                      {account.balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{account.currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
