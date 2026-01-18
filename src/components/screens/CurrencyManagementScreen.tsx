import { useState } from 'react';
import { useAccounting } from '@/contexts/AccountingContext';
import { Currency } from '@/types/accounting';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, X, Coins } from 'lucide-react';
import { toast } from 'sonner';

export function CurrencyManagementScreen() {
  const { currencies, addCurrency, updateCurrency, deleteCurrency, accounts, vouchers, openingBalances, invoices, currencyExchanges } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
  });

  const filteredCurrencies = currencies.filter(currency =>
    currency.name.includes(searchTerm) ||
    currency.symbol.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({ name: '', symbol: '' });
    setIsAdding(false);
    setSelectedCurrency(null);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.symbol.trim()) {
      toast.error('يرجى إدخال اسم العملة والرمز');
      return;
    }

    // Check for duplicate symbol
    const isDuplicate = currencies.some(c => 
      c.symbol === formData.symbol.trim() && c.id !== selectedCurrency?.id
    );
    if (isDuplicate) {
      toast.error('رمز العملة موجود مسبقاً');
      return;
    }

    if (selectedCurrency) {
      updateCurrency(selectedCurrency.id, {
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
      });
      toast.success('تم تعديل العملة بنجاح');
    } else {
      addCurrency({
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
      });
      toast.success('تم إضافة العملة بنجاح');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (selectedCurrency) {
      setFormData({
        name: selectedCurrency.name,
        symbol: selectedCurrency.symbol,
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedCurrency) {
      // Check if currency is used in any account
      const usedInAccounts = accounts.some(a => a.currency === selectedCurrency.symbol);
      const usedInVouchers = vouchers.some(v => 
        v.currency === selectedCurrency.symbol || 
        v.debitCurrency === selectedCurrency.symbol || 
        v.creditCurrency === selectedCurrency.symbol
      );
      const usedInOpeningBalances = openingBalances.some(ob => ob.currency === selectedCurrency.symbol);
      const usedInInvoices = invoices.some(inv => inv.currency === selectedCurrency.symbol);
      const usedInExchanges = currencyExchanges.some(ce => 
        ce.fromCurrency === selectedCurrency.symbol || ce.toCurrency === selectedCurrency.symbol
      );

      if (usedInAccounts || usedInVouchers || usedInOpeningBalances || usedInInvoices || usedInExchanges) {
        toast.error(`عذراً، العملة "${selectedCurrency.name}" مستخدمة ولا يمكن حذفها`);
        return;
      }

      deleteCurrency(selectedCurrency.id);
      setSelectedCurrency(null);
      toast.success('تم حذف العملة بنجاح');
    }
  };

  const columns = [
    { 
      key: 'name', 
      header: 'اسم العملة', 
      render: (item: Currency) => item.name 
    },
    { 
      key: 'symbol', 
      header: 'الرمز', 
      render: (item: Currency) => (
        <span className="font-semibold text-primary">{item.symbol}</span>
      )
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <ActionToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في العملات..."
        onAdd={() => {
          resetForm();
          setIsAdding(true);
        }}
        onEdit={selectedCurrency ? handleEdit : undefined}
        onDelete={selectedCurrency ? handleDelete : undefined}
      />

      {isAdding && (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              {selectedCurrency ? 'تعديل عملة' : 'إضافة عملة جديدة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currencyName">اسم العملة</Label>
                <Input
                  id="currencyName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: ريال يمني"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencySymbol">رمز العملة</Label>
                <Input
                  id="currencySymbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
                  placeholder="مثال: ر.ي"
                  className="text-right"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={handleSave} className="gradient-primary">
                <Save className="w-4 h-4 ml-2" />
                حفظ
              </Button>
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 ml-2" />
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="flex-1 flex flex-col overflow-hidden glass-card">
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            قائمة العملات ({filteredCurrencies.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollableTable
            columns={columns}
            data={filteredCurrencies}
            selectedId={selectedCurrency?.id}
            onRowClick={(item) => setSelectedCurrency(item)}
            getItemId={(item) => item.id}
            emptyTitle="لا توجد عملات"
            emptyDescription="اضغط على إضافة لإنشاء عملة جديدة"
          />
        </CardContent>
      </Card>
    </div>
  );
}
