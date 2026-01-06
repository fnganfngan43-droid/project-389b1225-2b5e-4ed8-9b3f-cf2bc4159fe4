import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Voucher } from '@/types/accounting';
import { printVoucher } from '@/utils/printService';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { parseExcelFile, mapVoucherRow } from '@/utils/excelImport';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Calendar, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface VoucherScreenProps {
  type: 'receipt' | 'payment';
}

export function VoucherScreen({ type }: VoucherScreenProps) {
  const { vouchers, accounts, groups, currencies, settings, addVoucher, deleteVoucher } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const handlePrint = (voucher: Voucher) => {
    printVoucher({ voucher, settings });
    toast.success('جاري طباعة السند...');
  };

  const filteredVouchers = vouchers.filter(v => 
    v.type === type && (
      v.debitAccountName?.includes(searchTerm) || 
      v.creditAccountName?.includes(searchTerm) ||
      v.voucherNumber.includes(searchTerm)
    )
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNumber: String(filteredVouchers.length + 1).padStart(4, '0'),
    // Debit side
    debitGroupName: '',
    debitAccountName: '',
    debitCurrency: '',
    debitAmount: '',
    debitDescription: '',
    debitReference: '',
    // Credit side
    creditGroupName: '',
    creditAccountName: '',
    creditCurrency: '',
    creditAmount: '',
    creditDescription: '',
    creditReference: '',
  });

  const debitFilteredAccounts = accounts.filter(a => a.groupName === formData.debitGroupName);
  const creditFilteredAccounts = accounts.filter(a => a.groupName === formData.creditGroupName);

  // Check balance validation
  const isBalanced = formData.debitCurrency === formData.creditCurrency && 
    formData.debitAmount && formData.creditAmount &&
    parseFloat(formData.debitAmount) === parseFloat(formData.creditAmount);

  const showBalanceWarning = formData.debitCurrency && formData.creditCurrency && 
    formData.debitCurrency === formData.creditCurrency &&
    formData.debitAmount && formData.creditAmount &&
    parseFloat(formData.debitAmount) !== parseFloat(formData.creditAmount);

  const handleSave = () => {
    if (!formData.debitAccountName || !formData.debitAmount || !formData.debitCurrency) {
      toast.error('يرجى ملء حقول الطرف المدين');
      return;
    }
    if (!formData.creditAccountName || !formData.creditAmount || !formData.creditCurrency) {
      toast.error('يرجى ملء حقول الطرف الدائن');
      return;
    }

    // Check balance if same currency
    if (formData.debitCurrency === formData.creditCurrency) {
      if (parseFloat(formData.debitAmount) !== parseFloat(formData.creditAmount)) {
        toast.error('المبلغ المدين والدائن غير متوازنين');
        return;
      }
    }

    addVoucher({
      date: formData.date,
      voucherNumber: formData.voucherNumber,
      debitAccountName: formData.debitAccountName,
      debitGroupName: formData.debitGroupName,
      debitAmount: parseFloat(formData.debitAmount),
      debitCurrency: formData.debitCurrency,
      debitReference: formData.debitReference,
      debitDescription: formData.debitDescription || (type === 'receipt' ? 'سند قبض' : 'سند صرف'),
      creditAccountName: formData.creditAccountName,
      creditGroupName: formData.creditGroupName,
      creditAmount: parseFloat(formData.creditAmount),
      creditCurrency: formData.creditCurrency,
      creditReference: formData.creditReference,
      creditDescription: formData.creditDescription || (type === 'receipt' ? 'سند قبض' : 'سند صرف'),
      type,
    });

    toast.success(`تم حفظ ${type === 'receipt' ? 'سند القبض' : 'سند الصرف'} بنجاح`);
    resetForm();
  };

  const handleDelete = () => {
    if (selectedVoucher) {
      deleteVoucher(selectedVoucher.id);
      setSelectedVoucher(null);
      toast.success('تم حذف السند بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      voucherNumber: String(filteredVouchers.length + 2).padStart(4, '0'),
      debitGroupName: '',
      debitAccountName: '',
      debitCurrency: '',
      debitAmount: '',
      debitDescription: '',
      debitReference: '',
      creditGroupName: '',
      creditAccountName: '',
      creditCurrency: '',
      creditAmount: '',
      creditDescription: '',
      creditReference: '',
    });
    setIsAdding(false);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;

      for (const row of rows) {
        const mapped = mapVoucherRow(row);
        if (mapped && (mapped.debitAccountName || mapped.creditAccountName)) {
          addVoucher({
            date: mapped.date,
            voucherNumber: mapped.voucherNumber || String(vouchers.length + successCount + 1).padStart(4, '0'),
            debitAccountName: mapped.debitAccountName,
            debitGroupName: mapped.debitGroupName,
            debitAmount: mapped.debitAmount,
            debitCurrency: mapped.debitCurrency,
            debitReference: mapped.debitReference,
            debitDescription: mapped.debitDescription || (type === 'receipt' ? 'سند قبض' : 'سند صرف'),
            creditAccountName: mapped.creditAccountName || '',
            creditGroupName: mapped.creditGroupName || '',
            creditAmount: mapped.creditAmount || 0,
            creditCurrency: mapped.creditCurrency || '',
            creditReference: mapped.creditReference,
            creditDescription: mapped.creditDescription || (type === 'receipt' ? 'سند قبض' : 'سند صرف'),
            type,
          });
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} سند بنجاح`);
      }
    } catch (error) {
      toast.error('فشل في استيراد الملف');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onDelete={selectedVoucher ? handleDelete : undefined}
        onImport={handleImport}
        showDuplicate
        onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في السندات..."
      />

      {/* Add Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              {type === 'receipt' ? 'سند قبض جديد' : 'سند صرف جديد'}
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 - Voucher Number & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم السند</label>
                <Input
                  value={formData.voucherNumber}
                  readOnly
                  className="text-left bg-secondary"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">التاريخ</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="pr-10"
                  />
                </div>
              </div>
            </div>

            {/* First Side - depends on voucher type */}
            {type === 'receipt' ? (
              <>
                {/* Debit Side First for Receipt */}
                <div className="border-2 border-primary/30 rounded-lg p-3 space-y-3">
                  <h3 className="text-sm font-semibold text-primary text-center bg-primary/10 rounded py-1">الطرف المدين</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                      <Select 
                        value={formData.debitGroupName} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, debitGroupName: val, debitAccountName: '' }))}
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
                        accounts={debitFilteredAccounts}
                        value={formData.debitAccountName}
                        onSelect={(val) => setFormData(prev => ({ ...prev, debitAccountName: val }))}
                        placeholder="ابحث عن الحساب..."
                        disabled={!formData.debitGroupName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                      <Select 
                        value={formData.debitCurrency} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, debitCurrency: val }))}
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
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">المبلغ مدين</label>
                      <Input
                        type="number"
                        value={formData.debitAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitAmount: e.target.value }))}
                        placeholder="0"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">البيان</label>
                      <Input
                        value={formData.debitDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitDescription: e.target.value }))}
                        placeholder="البيان"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رقم المرجع</label>
                      <Input
                        value={formData.debitReference}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitReference: e.target.value }))}
                        placeholder="رقم المرجع"
                      />
                    </div>
                  </div>
                </div>

                {/* Credit Side Second for Receipt */}
                <div className="border-2 border-success/30 rounded-lg p-3 space-y-3">
                  <h3 className="text-sm font-semibold text-success text-center bg-success/10 rounded py-1">الطرف الدائن</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                      <Select 
                        value={formData.creditGroupName} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, creditGroupName: val, creditAccountName: '' }))}
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
                        accounts={creditFilteredAccounts}
                        value={formData.creditAccountName}
                        onSelect={(val) => setFormData(prev => ({ ...prev, creditAccountName: val }))}
                        placeholder="ابحث عن الحساب..."
                        disabled={!formData.creditGroupName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                      <Select 
                        value={formData.creditCurrency} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, creditCurrency: val }))}
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
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">المبلغ الدائن</label>
                      <Input
                        type="number"
                        value={formData.creditAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditAmount: e.target.value }))}
                        placeholder="0"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">البيان</label>
                      <Input
                        value={formData.creditDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditDescription: e.target.value }))}
                        placeholder="البيان"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رقم المرجع</label>
                      <Input
                        value={formData.creditReference}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditReference: e.target.value }))}
                        placeholder="رقم المرجع"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Credit Side First for Payment */}
                <div className="border-2 border-success/30 rounded-lg p-3 space-y-3">
                  <h3 className="text-sm font-semibold text-success text-center bg-success/10 rounded py-1">الطرف الدائن</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                      <Select 
                        value={formData.creditGroupName} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, creditGroupName: val, creditAccountName: '' }))}
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
                        accounts={creditFilteredAccounts}
                        value={formData.creditAccountName}
                        onSelect={(val) => setFormData(prev => ({ ...prev, creditAccountName: val }))}
                        placeholder="ابحث عن الحساب..."
                        disabled={!formData.creditGroupName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                      <Select 
                        value={formData.creditCurrency} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, creditCurrency: val }))}
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
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">المبلغ الدائن</label>
                      <Input
                        type="number"
                        value={formData.creditAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditAmount: e.target.value }))}
                        placeholder="0"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">البيان</label>
                      <Input
                        value={formData.creditDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditDescription: e.target.value }))}
                        placeholder="البيان"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رقم المرجع</label>
                      <Input
                        value={formData.creditReference}
                        onChange={(e) => setFormData(prev => ({ ...prev, creditReference: e.target.value }))}
                        placeholder="رقم المرجع"
                      />
                    </div>
                  </div>
                </div>

                {/* Debit Side Second for Payment */}
                <div className="border-2 border-primary/30 rounded-lg p-3 space-y-3">
                  <h3 className="text-sm font-semibold text-primary text-center bg-primary/10 rounded py-1">الطرف المدين</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
                      <Select 
                        value={formData.debitGroupName} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, debitGroupName: val, debitAccountName: '' }))}
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
                        accounts={debitFilteredAccounts}
                        value={formData.debitAccountName}
                        onSelect={(val) => setFormData(prev => ({ ...prev, debitAccountName: val }))}
                        placeholder="ابحث عن الحساب..."
                        disabled={!formData.debitGroupName}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
                      <Select 
                        value={formData.debitCurrency} 
                        onValueChange={(val) => setFormData(prev => ({ ...prev, debitCurrency: val }))}
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
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">المبلغ مدين</label>
                      <Input
                        type="number"
                        value={formData.debitAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitAmount: e.target.value }))}
                        placeholder="0"
                        className="text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">البيان</label>
                      <Input
                        value={formData.debitDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitDescription: e.target.value }))}
                        placeholder="البيان"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">رقم المرجع</label>
                      <Input
                        value={formData.debitReference}
                        onChange={(e) => setFormData(prev => ({ ...prev, debitReference: e.target.value }))}
                        placeholder="رقم المرجع"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Balance Warning */}
            {showBalanceWarning && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
                <p className="text-destructive text-sm font-medium">تحذير: المبلغ المدين والدائن غير متوازنين</p>
              </div>
            )}

            {/* Balance OK indicator */}
            {isBalanced && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-center">
                <p className="text-success text-sm font-medium">✓ السند متوازن</p>
              </div>
            )}

            {/* Save button */}
            <Button onClick={handleSave} className="w-full" size="lg">
              <Save className="w-4 h-4" />
              حفظ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vouchers List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredVouchers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">لا توجد سندات</p>
              <p className="text-sm">اضغط على "إضافة" لإنشاء سند جديد</p>
            </div>
          ) : (
            filteredVouchers.map((voucher, index) => (
              <Card
                key={voucher.id}
                onClick={() => setSelectedVoucher(selectedVoucher?.id === voucher.id ? null : voucher)}
                className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                  selectedVoucher?.id === voucher.id 
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
                          #{voucher.voucherNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">{voucher.date}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">مدين: </span>
                          <span className="font-semibold">{voucher.debitAccountName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">دائن: </span>
                          <span className="font-semibold">{voucher.creditAccountName}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{voucher.debitDescription || voucher.creditDescription}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrint(voucher);
                        }}
                        className="text-primary hover:bg-primary/10"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <div className="text-left">
                        <p className={`font-bold text-lg ${type === 'receipt' ? 'text-success' : 'text-destructive'}`}>
                          {voucher.debitAmount?.toLocaleString() || voucher.creditAmount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{voucher.debitCurrency || voucher.creditCurrency}</p>
                      </div>
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
