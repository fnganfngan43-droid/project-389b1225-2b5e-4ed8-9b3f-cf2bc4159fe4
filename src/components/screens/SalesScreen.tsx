import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Invoice } from '@/types/accounting';
import { AccountSearchInput } from '@/components/AccountSearchInput';

import { parseExcelFile, mapInvoiceRow } from '@/utils/excelImport';
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
import { Save, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useDuplicateReferenceCheck } from '@/hooks/useDuplicateReferenceCheck';
import { DuplicateReferenceDialog } from '@/components/DuplicateReferenceDialog';

interface SalesScreenProps {
  isReturn?: boolean;
}

export function SalesScreen({ isReturn = false }: SalesScreenProps) {
  const { invoices, accounts, groups, currencies, addInvoice, updateInvoice, deleteInvoice } = useAccounting();
  const { dialogOpen, duplicateRef, checkAndProceed, warnIfDuplicate, handleConfirm, handleCancel } = useDuplicateReferenceCheck();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(inv => 
    (isReturn ? inv.amount < 0 : inv.amount >= 0) && (
      inv.accountName.includes(searchTerm) || 
      inv.invoiceNumber.includes(searchTerm)
    )
  );

  // Calculate next sequential number based on existing invoices of same type
  const nextInvoiceNumber = useMemo(() => {
    const typeInvoices = invoices.filter(inv => isReturn ? inv.amount < 0 : inv.amount >= 0);
    const existingNumbers = typeInvoices.map(inv => inv.invoiceNumber);
    return getNextSequentialNumber(existingNumbers);
  }, [invoices, isReturn]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: nextInvoiceNumber,
    type: 'cash' as 'cash' | 'credit',
    groupName: '',
    accountNumber: '',
    accountName: '',
    amount: '',
    currency: '',
    reference: '',
    description: '',
  });

  const filteredAccounts = accounts.filter(a => a.groupName === formData.groupName);

  const performSave = () => {
    if (editingInvoice) {
      updateInvoice(editingInvoice.id, {
        date: formData.date,
        invoiceNumber: formData.invoiceNumber,
        accountName: formData.accountName,
        groupName: formData.groupName,
        amount: isReturn ? -parseFloat(formData.amount) : parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        reference: formData.reference,
        description: formData.description || (isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'),
      });
      toast.success(`تم تحديث ${isReturn ? 'المرتجع' : 'الفاتورة'} بنجاح`);
    } else {
      addInvoice({
        date: formData.date,
        invoiceNumber: formData.invoiceNumber,
        accountName: formData.accountName,
        groupName: formData.groupName,
        amount: isReturn ? -parseFloat(formData.amount) : parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        reference: formData.reference,
        description: formData.description || (isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'),
      });
      toast.success(`تم حفظ ${isReturn ? 'المرتجع' : 'الفاتورة'} بنجاح`);
    }
    resetForm();
  };

  const handleSave = () => {
    if (!formData.accountName || !formData.amount || !formData.currency) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const refsToCheck = formData.reference ? [formData.reference] : [];
    const existingRefs = invoices
      .filter(inv => inv.id !== editingInvoice?.id && (isReturn ? inv.amount < 0 : inv.amount >= 0))
      .map(inv => inv.reference).filter(Boolean) as string[];
    checkAndProceed(refsToCheck, existingRefs, performSave);
  };

  const handleEdit = () => {
    if (selectedInvoice) {
      setEditingInvoice(selectedInvoice);
      setFormData({
        date: selectedInvoice.date,
        invoiceNumber: selectedInvoice.invoiceNumber,
        type: selectedInvoice.type,
        groupName: selectedInvoice.groupName,
        accountNumber: accounts.find(a => a.accountName === selectedInvoice.accountName)?.accountNumber || '',
        accountName: selectedInvoice.accountName,
        amount: Math.abs(selectedInvoice.amount).toString(),
        currency: selectedInvoice.currency,
        reference: selectedInvoice.reference || '',
        description: selectedInvoice.description,
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedInvoice) {
      deleteInvoice(selectedInvoice.id);
      setSelectedInvoice(null);
      toast.success('تم الحذف بنجاح');
    }
  };

  const resetForm = () => {
    const typeInvoices = invoices.filter(inv => isReturn ? inv.amount < 0 : inv.amount >= 0);
    const existingNumbers = typeInvoices.map(inv => inv.invoiceNumber);
    const newNumber = getNextSequentialNumber(existingNumbers);
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: newNumber,
      type: 'cash',
      groupName: '',
      accountNumber: '',
      accountName: '',
      amount: '',
      currency: '',
      reference: '',
      description: '',
    });
    setIsAdding(false);
    setEditingInvoice(null);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;
      const accountNames = accounts.map(a => a.accountName);
      const groupNames = groups.map(g => g.name);

      for (const row of rows) {
        const mapped = mapInvoiceRow(row);
        if (mapped && mapped.accountName) {
          // Try to find account by number first, then by name
          let finalAccountName = findClosestMatch(mapped.accountName, accountNames);
          let finalGroupName = findClosestMatch(mapped.groupName, groupNames);
          
          if (mapped.accountNumber) {
            const foundByNumber = accounts.find(a => a.accountNumber === mapped.accountNumber);
            if (foundByNumber) {
              finalAccountName = foundByNumber.accountName;
              finalGroupName = foundByNumber.groupName;
            }
          }
          
          addInvoice({
            date: mapped.date,
            invoiceNumber: mapped.invoiceNumber || String(invoices.length + successCount + 1).padStart(4, '0'),
            accountName: finalAccountName,
            groupName: finalGroupName,
            amount: isReturn ? -Math.abs(mapped.amount) : mapped.amount,
            currency: mapped.currency,
            type: mapped.type,
            reference: mapped.reference,
            description: mapped.description || (isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'),
          });
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} ${isReturn ? 'مرتجع' : 'فاتورة'} بنجاح`);
      }
    } catch (error) {
      toast.error('فشل في استيراد الملف');
    }
  };

  const columns = [
    {
      key: 'invoiceNumber',
      header: isReturn ? 'رقم المرتجع' : 'رقم الفاتورة',
      render: (invoice: Invoice) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">#{invoice.invoiceNumber}</span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      render: (invoice: Invoice) => invoice.date,
    },
    {
      key: 'type',
      header: 'النوع',
      render: (invoice: Invoice) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          invoice.type === 'cash' 
            ? 'bg-success/20 text-success' 
            : 'bg-warning/20 text-warning'
        }`}>
          {invoice.type === 'cash' ? 'نقدي' : 'آجل'}
        </span>
      ),
    },
    {
      key: 'accountName',
      header: 'اسم الحساب',
      render: (invoice: Invoice) => (
        <span className="font-semibold">{invoice.accountName}</span>
      ),
    },
    {
      key: 'description',
      header: 'البيان',
      render: (invoice: Invoice) => invoice.description || '-',
    },
    {
      key: 'reference',
      header: 'المرجع',
      render: (invoice: Invoice) => invoice.reference || '-',
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (invoice: Invoice) => invoice.currency,
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (invoice: Invoice) => (
        <span className={`font-bold ${isReturn ? 'text-destructive' : 'text-success'}`}>
          {Math.abs(invoice.amount).toLocaleString()}
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
            const typeInvoices = invoices.filter(inv => isReturn ? inv.amount < 0 : inv.amount >= 0);
            const existingNumbers = typeInvoices.map(inv => inv.invoiceNumber);
            const newNumber = getNextSequentialNumber(existingNumbers);
            
            setFormData({
              date: new Date().toISOString().split('T')[0],
              invoiceNumber: newNumber,
              type: 'cash',
              groupName: '',
              accountNumber: '',
              accountName: '',
              amount: '',
              currency: '',
              reference: '',
              description: '',
            });
            setIsAdding(true);
          }}
          onEdit={selectedInvoice ? handleEdit : undefined}
          onDelete={selectedInvoice ? handleDelete : undefined}
          onImport={handleImport}
          showDuplicate
          showCalculator
          onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
          searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={isReturn ? "بحث في المرتجعات..." : "بحث في الفواتير..."}
        importTitle={isReturn ? 'استيراد المرتجعات' : 'استيراد الفواتير'}
        importColumns={[
          'التاريخ',
          'رقم الفاتورة',
          'النوع (نقدي/آجل)',
          'اسم المجموعة',
          'رقم الحساب',
          'اسم الحساب',
          'المبلغ',
          'رمز العملة',
          'رقم المرجع',
          'البيان',
        ]}
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
                <ShoppingCart className="w-5 h-5" />
                {editingInvoice 
                  ? (isReturn ? 'تعديل مرتجع' : 'تعديل فاتورة') 
                  : (isReturn ? 'مرتجع مبيعات جديد' : 'فاتورة مبيعات جديدة')}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">التاريخ</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {isReturn ? 'رقم المرتجع' : 'رقم الفاتورة'}
                </label>
                <Input
                  value={formData.invoiceNumber}
                  readOnly
                  className="text-left bg-secondary"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">النوع</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => {
                    const newType = val as 'cash' | 'credit';
                    if (newType === 'cash') {
                      setFormData(prev => ({ 
                        ...prev, 
                        type: newType,
                        groupName: 'الصندوق',
                        accountName: '',
                        description: isReturn ? 'مرتجع مبيعات نقدية' : 'مبيعات نقدية'
                      }));
                    } else {
                      setFormData(prev => ({ 
                        ...prev, 
                        type: newType,
                        groupName: 'العملاء',
                        accountName: '',
                        description: isReturn ? 'مرتجع فاتورة آجلة' : 'عليكم جملة فاتورة آجلة'
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="credit">آجل</SelectItem>
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
                  onSelect={(val, acc) => setFormData(prev => ({ ...prev, accountName: val, accountNumber: acc?.accountNumber || prev.accountNumber }))}
                  placeholder="ابحث عن الحساب..."
                  disabled={!formData.groupName}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  {isReturn ? 'المبلغ الدائن' : 'المبلغ المدين'}
                </label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="text-left"
                  dir="ltr"
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

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم المرجع</label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  onBlur={() => {
                    const existingRefs = invoices
                      .filter(inv => inv.id !== editingInvoice?.id && (isReturn ? inv.amount < 0 : inv.amount >= 0))
                      .map(inv => inv.reference).filter(Boolean) as string[];
                    warnIfDuplicate(formData.reference, existingRefs);
                  }}
                  placeholder="رقم المرجع"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">البيان</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات'}
                />
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

        {/* Invoices Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredInvoices}
          columns={columns}
          onRowClick={(invoice) => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
          selectedId={selectedInvoice?.id}
          getItemId={(invoice) => invoice.id}
          emptyIcon={<ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle={isReturn ? 'لا توجد مرتجعات' : 'لا توجد فواتير'}
            emptyDescription={`اضغط على 'إضافة' لإنشاء ${isReturn ? 'مرتجع' : 'فاتورة'} جديدة`}
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
