import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { OpeningBalance } from '@/types/accounting';
import { AccountSearchInput } from '@/components/AccountSearchInput';
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
  const { openingBalances, accounts, groups, currencies, addOpeningBalance } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<OpeningBalance | null>(null);

  const filteredBalances = openingBalances.filter(b => 
    b.accountName.includes(searchTerm)
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    groupName: '',
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

    addOpeningBalance({
      date: formData.date,
      accountName: formData.accountName,
      currency: formData.currency,
      debit: parseFloat(formData.debit) || 0,
      credit: parseFloat(formData.credit) || 0,
    });

    toast.success('تم حفظ الرصيد الافتتاحي بنجاح');
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      groupName: '',
      accountName: '',
      debit: '',
      credit: '',
      currency: '',
    });
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onImport={() => toast.info('سيتم إضافة خاصية الاستيراد قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في الأرصدة..."
      />

      {/* Add Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                رصيد افتتاحي جديد
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
            <div className="grid grid-cols-2 gap-3">
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
                <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب</label>
                <AccountSearchInput
                  accounts={filteredAccounts}
                  value={formData.accountName}
                  onSelect={(val) => setFormData(prev => ({ ...prev, accountName: val }))}
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

      {/* Balances List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredBalances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">لا توجد أرصدة افتتاحية</p>
              <p className="text-sm">اضغط على "إضافة" لإنشاء رصيد افتتاحي جديد</p>
            </div>
          ) : (
            filteredBalances.map((balance, index) => (
              <Card
                key={balance.id}
                onClick={() => setSelectedBalance(selectedBalance?.id === balance.id ? null : balance)}
                className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                  selectedBalance?.id === balance.id 
                    ? 'border-2 border-primary bg-primary/5 shadow-glow' 
                    : 'hover:border-primary/30'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">{balance.date}</p>
                      <p className="font-semibold text-foreground">{balance.accountName}</p>
                      <p className="text-xs text-muted-foreground mt-1">رصيد افتتاحي</p>
                    </div>
                    <div className="text-left">
                      {balance.debit > 0 ? (
                        <div>
                          <p className="text-xs text-muted-foreground">مدين</p>
                          <p className="font-bold text-lg text-success">
                            {balance.debit.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">دائن</p>
                          <p className="font-bold text-lg text-destructive">
                            {balance.credit.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{balance.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
