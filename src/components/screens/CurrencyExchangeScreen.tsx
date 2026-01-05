import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, ArrowLeftRight, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

import { CurrencyExchange } from '@/types/accounting';

export function CurrencyExchangeScreen() {
  const { accounts, groups, currencies, currencyExchanges, addCurrencyExchange, deleteCurrencyExchange } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<CurrencyExchange | null>(null);

  const filteredExchanges = currencyExchanges.filter(e => 
    e.fromAccountName.includes(searchTerm) || 
    e.toAccountName.includes(searchTerm) ||
    e.exchangeNumber.includes(searchTerm)
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exchangeNumber: String(currencyExchanges.length + 1).padStart(4, '0'),
    fromGroupName: '',
    fromAccountName: '',
    fromAmount: '',
    fromCurrency: '',
    fromReference: '',
    toGroupName: '',
    toAccountName: '',
    toAmount: '',
    toCurrency: '',
    toReference: '',
  });

  const fromAccounts = accounts.filter(a => a.groupName === formData.fromGroupName);
  const toAccounts = accounts.filter(a => a.groupName === formData.toGroupName);

  const handleSave = () => {
    if (!formData.fromAccountName || !formData.toAccountName || !formData.fromAmount || !formData.toAmount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    addCurrencyExchange({
      date: formData.date,
      exchangeNumber: formData.exchangeNumber,
      fromAccountName: formData.fromAccountName,
      fromGroupName: formData.fromGroupName,
      fromAmount: parseFloat(formData.fromAmount),
      fromCurrency: formData.fromCurrency,
      toAccountName: formData.toAccountName,
      toGroupName: formData.toGroupName,
      toAmount: parseFloat(formData.toAmount),
      toCurrency: formData.toCurrency,
      reference: formData.fromReference,
      description: `مبتاع بقيمة ${formData.toAmount} ${formData.toCurrency} بصرف ${formData.fromCurrency}`,
    });

    toast.success('تم حفظ عملية الصرف بنجاح');
    resetForm();
  };

  const handleDelete = () => {
    if (selectedExchange) {
      deleteCurrencyExchange(selectedExchange.id);
      setSelectedExchange(null);
      toast.success('تم حذف العملية بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      exchangeNumber: String(currencyExchanges.length + 2).padStart(4, '0'),
      fromGroupName: '',
      fromAccountName: '',
      fromAmount: '',
      fromCurrency: '',
      fromReference: '',
      toGroupName: '',
      toAccountName: '',
      toAmount: '',
      toCurrency: '',
      toReference: '',
    });
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onDelete={selectedExchange ? handleDelete : undefined}
        onImport={() => toast.info('سيتم إضافة خاصية الاستيراد قريباً')}
        showDuplicate
        onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في عمليات الصرف..."
      />

      {/* Add Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                صرف عملة جديد
              </div>
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 - Date & Number */}
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
                <label className="text-sm text-muted-foreground mb-1 block">رقم العملية</label>
                <Input
                  value={formData.exchangeNumber}
                  readOnly
                  className="text-left bg-secondary"
                  dir="ltr"
                />
              </div>
            </div>

            {/* FROM Section */}
            <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-3">الطرف المحول منه (دائن)</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                    <Select 
                      value={formData.fromGroupName} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, fromGroupName: val, fromAccountName: '' }))}
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
                    <Select 
                      value={formData.fromAccountName} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, fromAccountName: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {fromAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.accountName}>
                            {acc.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">المبلغ</label>
                    <Input
                      type="number"
                      value={formData.fromAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, fromAmount: e.target.value }))}
                      placeholder="0"
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                    <Select 
                      value={formData.fromCurrency} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, fromCurrency: val }))}
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
              </div>
            </div>

            {/* Arrow divider */}
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
                <ArrowDown className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>

            {/* TO Section */}
            <div className="bg-success/5 p-4 rounded-xl border border-success/20">
              <p className="text-sm font-semibold text-success mb-3">الطرف المحول إليه (مدين)</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                    <Select 
                      value={formData.toGroupName} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, toGroupName: val, toAccountName: '' }))}
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
                    <Select 
                      value={formData.toAccountName} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, toAccountName: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                      <SelectContent>
                        {toAccounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.accountName}>
                            {acc.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">المبلغ</label>
                    <Input
                      type="number"
                      value={formData.toAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, toAmount: e.target.value }))}
                      placeholder="0"
                      className="text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                    <Select 
                      value={formData.toCurrency} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, toCurrency: val }))}
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
              </div>
            </div>

            <Button onClick={handleSave} className="w-full" size="lg">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exchanges List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredExchanges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">لا توجد عمليات صرف</p>
              <p className="text-sm">اضغط على "إضافة" لإنشاء عملية صرف جديدة</p>
            </div>
          ) : (
            filteredExchanges.map((exchange, index) => (
              <Card
                key={exchange.id}
                onClick={() => setSelectedExchange(selectedExchange?.id === exchange.id ? null : exchange)}
                className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                  selectedExchange?.id === exchange.id 
                    ? 'border-2 border-primary bg-primary/5 shadow-glow' 
                    : 'hover:border-primary/30'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                        #{exchange.exchangeNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">{exchange.date}</span>
                    </div>
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">من</p>
                      <p className="font-semibold text-sm">{exchange.fromAccountName}</p>
                      <p className="text-destructive font-bold">
                        {exchange.fromAmount.toLocaleString()} {exchange.fromCurrency}
                      </p>
                    </div>
                    <ArrowLeftRight className="w-5 h-5 text-muted-foreground mx-2" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">إلى</p>
                      <p className="font-semibold text-sm">{exchange.toAccountName}</p>
                      <p className="text-success font-bold">
                        {exchange.toAmount.toLocaleString()} {exchange.toCurrency}
                      </p>
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
