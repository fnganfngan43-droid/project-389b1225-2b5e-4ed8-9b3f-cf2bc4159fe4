import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Voucher } from '@/types/accounting';
import { printVoucher } from '@/utils/printService';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { parseExcelFile, mapVoucherRow } from '@/utils/excelImport';
import { findClosestMatch } from '@/utils/fuzzyMatch';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { getNextSequentialNumber } from '@/utils/sequentialNumber';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Calendar, Printer, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { useDuplicateReferenceCheck } from '@/hooks/useDuplicateReferenceCheck';
import { DuplicateReferenceDialog } from '@/components/DuplicateReferenceDialog';

interface VoucherScreenProps {
  type: 'receipt' | 'payment';
}

export function VoucherScreen({ type }: VoucherScreenProps) {
  const { vouchers, accounts, groups, currencies, settings, addVoucher, updateVoucher, deleteVoucher } = useAccounting();
  const { dialogOpen, duplicateRef, checkAndProceed, handleConfirm, handleCancel } = useDuplicateReferenceCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

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

  // Calculate next sequential number based on existing vouchers of same type
  const nextVoucherNumber = useMemo(() => {
    const typeVouchers = vouchers.filter(v => v.type === type);
    const existingNumbers = typeVouchers.map(v => v.voucherNumber);
    return getNextSequentialNumber(existingNumbers);
  }, [vouchers, type]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    voucherNumber: nextVoucherNumber,
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

  const performSave = () => {
    const voucherData = {
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
    };

    if (editingVoucher) {
      updateVoucher(editingVoucher.id, voucherData);
      toast.success('تم تحديث السند بنجاح');
    } else {
      addVoucher(voucherData);
      toast.success('تم حفظ السند بنجاح');
    }
    resetForm();
  };

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

    const refsToCheck = [formData.debitReference, formData.creditReference].filter(Boolean);
    const existingRefs = vouchers
      .filter(v => v.id !== editingVoucher?.id && v.type === type)
      .flatMap(v => [v.debitReference, v.creditReference]).filter(Boolean) as string[];
    checkAndProceed(refsToCheck, existingRefs, performSave);
  };



  const handleEdit = () => {
    if (selectedVoucher) {
      setEditingVoucher(selectedVoucher);
      setFormData({
        date: selectedVoucher.date,
        voucherNumber: selectedVoucher.voucherNumber,
        debitGroupName: selectedVoucher.debitGroupName,
        debitAccountName: selectedVoucher.debitAccountName,
        debitCurrency: selectedVoucher.debitCurrency,
        debitAmount: selectedVoucher.debitAmount.toString(),
        debitDescription: selectedVoucher.debitDescription || '',
        debitReference: selectedVoucher.debitReference || '',
        creditGroupName: selectedVoucher.creditGroupName,
        creditAccountName: selectedVoucher.creditAccountName,
        creditCurrency: selectedVoucher.creditCurrency,
        creditAmount: selectedVoucher.creditAmount.toString(),
        creditDescription: selectedVoucher.creditDescription || '',
        creditReference: selectedVoucher.creditReference || '',
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedVoucher) {
      deleteVoucher(selectedVoucher.id);
      setSelectedVoucher(null);
      toast.success('تم حذف السند بنجاح');
    }
  };

  const resetForm = () => {
    const typeVouchers = vouchers.filter(v => v.type === type);
    const existingNumbers = typeVouchers.map(v => v.voucherNumber);
    const newNumber = getNextSequentialNumber(existingNumbers);
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      voucherNumber: newNumber,
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
    setEditingVoucher(null);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;
      const accountNames = accounts.map(a => a.accountName);
      const groupNames = groups.map(g => g.name);

      for (const row of rows) {
        const mapped = mapVoucherRow(row);
        if (mapped && (mapped.debitAccountName || mapped.creditAccountName)) {
          addVoucher({
            date: mapped.date,
            voucherNumber: mapped.voucherNumber || String(vouchers.length + successCount + 1).padStart(4, '0'),
            debitAccountName: findClosestMatch(mapped.debitAccountName, accountNames),
            debitGroupName: findClosestMatch(mapped.debitGroupName, groupNames),
            debitAmount: mapped.debitAmount,
            debitCurrency: mapped.debitCurrency,
            debitReference: mapped.debitReference,
            debitDescription: mapped.debitDescription || (type === 'receipt' ? 'سند قبض' : 'سند صرف'),
            creditAccountName: findClosestMatch(mapped.creditAccountName, accountNames),
            creditGroupName: findClosestMatch(mapped.creditGroupName, groupNames),
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
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      <div className="shrink-0 px-4 pt-2">
        <ActionToolbar
          onAdd={() => {
            const typeVouchers = vouchers.filter(v => v.type === type);
            const existingNumbers = typeVouchers.map(v => v.voucherNumber);
            const newNumber = getNextSequentialNumber(existingNumbers);
            
            if (selectedVoucher) {
              // Copy selected voucher data to form (duplicate functionality)
              setFormData({
                date: new Date().toISOString().split('T')[0],
                voucherNumber: newNumber,
                debitGroupName: selectedVoucher.debitGroupName,
                debitAccountName: selectedVoucher.debitAccountName,
                debitCurrency: selectedVoucher.debitCurrency,
                debitAmount: selectedVoucher.debitAmount.toString(),
                debitDescription: selectedVoucher.debitDescription || '',
                debitReference: selectedVoucher.debitReference || '',
                creditGroupName: selectedVoucher.creditGroupName,
                creditAccountName: selectedVoucher.creditAccountName,
                creditCurrency: selectedVoucher.creditCurrency,
                creditAmount: selectedVoucher.creditAmount.toString(),
                creditDescription: selectedVoucher.creditDescription || '',
                creditReference: selectedVoucher.creditReference || '',
              });
            } else {
              // Reset form for new entry
              setFormData({
                date: new Date().toISOString().split('T')[0],
                voucherNumber: newNumber,
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
            }
            setEditingVoucher(null);
            setIsAdding(true);
          }}
          onEdit={selectedVoucher ? handleEdit : undefined}
          onDelete={selectedVoucher ? handleDelete : undefined}
          onImport={handleImport}
          showDuplicate
          onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في السندات..."
          importTitle={type === 'receipt' ? 'استيراد سندات القبض' : 'استيراد سندات الصرف'}
          importColumns={[
            'رقم السند',
            'التاريخ',
            'اسم المجموعة (مدين)',
            'اسم الحساب (مدين)',
            'رمز العملة (مدين)',
            'المبلغ (مدين)',
            'البيان (مدين)',
            'رقم المرجع (مدين)',
            'اسم المجموعة (دائن)',
            'اسم الحساب (دائن)',
            'رمز العملة (دائن)',
            'المبلغ (دائن)',
            'البيان (دائن)',
            'رقم المرجع (دائن)',
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
              {editingVoucher 
                ? (type === 'receipt' ? 'تعديل سند قبض' : 'تعديل سند صرف')
                : (type === 'receipt' ? 'سند قبض جديد' : 'سند صرف جديد')}
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

        {/* Vouchers Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredVouchers}
          columns={[
            {
              key: 'voucherNumber',
              header: 'رقم السند',
              render: (voucher: Voucher) => (
                <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">#{voucher.voucherNumber}</span>
              ),
            },
            {
              key: 'date',
              header: 'التاريخ',
              render: (voucher: Voucher) => voucher.date,
            },
            {
              key: 'debitAccountName',
              header: 'الحساب المدين',
              render: (voucher: Voucher) => (
                <span className="font-semibold">{voucher.debitAccountName}</span>
              ),
            },
            {
              key: 'creditAccountName',
              header: 'الحساب الدائن',
              render: (voucher: Voucher) => (
                <span className="font-semibold">{voucher.creditAccountName}</span>
              ),
            },
            {
              key: 'description',
              header: 'البيان',
              render: (voucher: Voucher) => voucher.debitDescription || voucher.creditDescription || '-',
            },
            {
              key: 'currency',
              header: 'العملة',
              render: (voucher: Voucher) => voucher.debitCurrency || voucher.creditCurrency,
            },
            {
              key: 'amount',
              header: 'المبلغ',
              render: (voucher: Voucher) => (
                <span className={`font-bold ${type === 'receipt' ? 'text-success' : 'text-destructive'}`}>
                  {(voucher.debitAmount || voucher.creditAmount || 0).toLocaleString()}
                </span>
              ),
              className: 'text-left',
            },
            {
              key: 'actions',
              header: 'طباعة',
              render: (voucher: Voucher) => (
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
              ),
            },
          ]}
          onRowClick={(voucher) => setSelectedVoucher(selectedVoucher?.id === voucher.id ? null : voucher)}
          selectedId={selectedVoucher?.id}
          getItemId={(voucher) => voucher.id}
          emptyIcon={<Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle="لا توجد سندات"
            emptyDescription="اضغط على 'إضافة' لإنشاء سند جديد"
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
