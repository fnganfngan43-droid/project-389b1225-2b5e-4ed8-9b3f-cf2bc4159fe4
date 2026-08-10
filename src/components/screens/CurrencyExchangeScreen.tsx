import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { sortByNumberDesc } from '@/lib/utils';

import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, ArrowLeftRight, ArrowDown } from 'lucide-react';

import { toast } from 'sonner';
import { useDuplicateReferenceCheck } from '@/hooks/useDuplicateReferenceCheck';
import { DuplicateReferenceDialog } from '@/components/DuplicateReferenceDialog';

import { CurrencyExchange } from '@/types/accounting';

export function CurrencyExchangeScreen() {
  const { accounts, groups, currencies, currencyExchanges, addCurrencyExchange, updateCurrencyExchange, deleteCurrencyExchange } = useAccounting();
  const { dialogOpen, duplicateRef, checkAndProceed, handleConfirm, handleCancel } = useDuplicateReferenceCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<CurrencyExchange | null>(null);
  const [editingExchange, setEditingExchange] = useState<CurrencyExchange | null>(null);

  const filteredExchanges = currencyExchanges.filter(e => 
    e.fromAccountName.includes(searchTerm) || 
    e.toAccountName.includes(searchTerm) ||
    e.exchangeNumber.includes(searchTerm)
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    exchangeNumber: String(currencyExchanges.length + 1).padStart(4, '0'),
    fromGroupName: '',
    fromAccountNumber: '',
    fromAccountName: '',
    fromAmount: '',
    fromCurrency: '',
    fromReference: '',
    toGroupName: '',
    toAccountNumber: '',
    toAccountName: '',
    toAmount: '',
    toCurrency: '',
    toReference: '',
  });

  const fromAccounts = accounts.filter(a => a.groupName === formData.fromGroupName);
  const toAccounts = accounts.filter(a => a.groupName === formData.toGroupName);

  const performSave = () => {
    if (editingExchange) {
      updateCurrencyExchange(editingExchange.id, {
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
      toast.success('تم تحديث عملية الصرف بنجاح');
    } else {
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
    }
    resetForm();
  };

  const handleSave = () => {
    if (!formData.fromAccountName || !formData.toAccountName || !formData.fromAmount || !formData.toAmount) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const refsToCheck = formData.fromReference ? [formData.fromReference] : [];
    const existingRefs = currencyExchanges
      .filter(e => e.id !== editingExchange?.id)
      .map(e => e.reference).filter(Boolean) as string[];
    checkAndProceed(refsToCheck, existingRefs, performSave);
  };

  const handleEdit = () => {
    if (selectedExchange) {
      setEditingExchange(selectedExchange);
      setFormData({
        date: selectedExchange.date,
        exchangeNumber: selectedExchange.exchangeNumber,
        fromGroupName: selectedExchange.fromGroupName,
        fromAccountNumber: accounts.find(a => a.accountName === selectedExchange.fromAccountName)?.accountNumber || '',
        fromAccountName: selectedExchange.fromAccountName,
        fromAmount: selectedExchange.fromAmount.toString(),
        fromCurrency: selectedExchange.fromCurrency,
        fromReference: selectedExchange.reference || '',
        toGroupName: selectedExchange.toGroupName,
        toAccountNumber: accounts.find(a => a.accountName === selectedExchange.toAccountName)?.accountNumber || '',
        toAccountName: selectedExchange.toAccountName,
        toAmount: selectedExchange.toAmount.toString(),
        toCurrency: selectedExchange.toCurrency,
        toReference: '',
      });
      setIsAdding(true);
    }
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
      fromAccountNumber: '',
      fromAccountName: '',
      fromAmount: '',
      fromCurrency: '',
      fromReference: '',
      toGroupName: '',
      toAccountNumber: '',
      toAccountName: '',
      toAmount: '',
      toCurrency: '',
      toReference: '',
    });
    setIsAdding(false);
    setEditingExchange(null);
  };

  const columns = [
    {
      key: 'exchangeNumber',
      header: 'رقم العملية',
      render: (exchange: CurrencyExchange) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">#{exchange.exchangeNumber}</span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      render: (exchange: CurrencyExchange) => exchange.date,
    },
    {
      key: 'fromAccountName',
      header: 'من حساب',
      render: (exchange: CurrencyExchange) => (
        <span className="font-semibold">{exchange.fromAccountName}</span>
      ),
    },
    {
      key: 'fromAmount',
      header: 'المبلغ (من)',
      render: (exchange: CurrencyExchange) => (
        <span className="text-destructive font-bold">
          {exchange.fromAmount.toLocaleString()} {exchange.fromCurrency}
        </span>
      ),
    },
    {
      key: 'toAccountName',
      header: 'إلى حساب',
      render: (exchange: CurrencyExchange) => (
        <span className="font-semibold">{exchange.toAccountName}</span>
      ),
    },
    {
      key: 'toAmount',
      header: 'المبلغ (إلى)',
      render: (exchange: CurrencyExchange) => (
        <span className="text-success font-bold">
          {exchange.toAmount.toLocaleString()} {exchange.toCurrency}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      <div className="shrink-0 px-4 pt-2">
        <ActionToolbar
          onAdd={() => setIsAdding(true)}
          onEdit={selectedExchange ? handleEdit : undefined}
          onDelete={selectedExchange ? handleDelete : undefined}
          onImport={() => toast.info('سيتم إضافة خاصية الاستيراد قريباً')}
          showDuplicate
          showCalculator
          onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في عمليات الصرف..."
        />
      </div>

      {/* Scrollable Content Area - Form + Table */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Add Form */}
        {isAdding && (
          <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto flex items-start justify-center p-4 animate-in fade-in">
          <Card className="animate-slide-up border-2 border-primary/20 w-full max-w-4xl mt-4 mb-4 shadow-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                {editingExchange ? 'تعديل عملية صرف' : 'صرف عملة جديد'}
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
                      onValueChange={(val) => setFormData(prev => ({ ...prev, fromGroupName: val, fromAccountNumber: '', fromAccountName: '' }))}
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
                      onValueChange={(val) => setFormData(prev => ({ ...prev, toGroupName: val, toAccountNumber: '', toAccountName: '' }))}
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
        </div>
        )}

        {/* Exchanges Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredExchanges}
          columns={columns}
          onRowClick={(exchange) => setSelectedExchange(selectedExchange?.id === exchange.id ? null : exchange)}
          selectedId={selectedExchange?.id}
          getItemId={(exchange) => exchange.id}
          emptyIcon={<ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle="لا توجد عمليات صرف"
            emptyDescription="اضغط على 'إضافة' لإنشاء عملية صرف جديدة"
          />
        </div>
      </div>

      <DuplicateReferenceDialog
        open={dialogOpen}
        referenceNumber={duplicateRef}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
