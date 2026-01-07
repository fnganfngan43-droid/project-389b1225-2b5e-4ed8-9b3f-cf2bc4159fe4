import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { Invoice } from '@/types/accounting';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { parseExcelFile, mapInvoiceRow } from '@/utils/excelImport';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface SalesScreenProps {
  isReturn?: boolean;
}

export function SalesScreen({ isReturn = false }: SalesScreenProps) {
  const { invoices, accounts, groups, currencies, addInvoice, deleteInvoice } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(inv => 
    (isReturn ? inv.amount < 0 : inv.amount >= 0) && (
      inv.accountName.includes(searchTerm) || 
      inv.invoiceNumber.includes(searchTerm)
    )
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: String(filteredInvoices.length + 1).padStart(4, '0'),
    type: 'cash' as 'cash' | 'credit',
    groupName: '',
    accountName: '',
    amount: '',
    currency: '',
    reference: '',
    description: '',
  });

  const filteredAccounts = accounts.filter(a => a.groupName === formData.groupName);

  const handleSave = () => {
    if (!formData.accountName || !formData.amount || !formData.currency) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

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
    resetForm();
  };

  const handleDelete = () => {
    if (selectedInvoice) {
      deleteInvoice(selectedInvoice.id);
      setSelectedInvoice(null);
      toast.success('تم الحذف بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: String(filteredInvoices.length + 2).padStart(4, '0'),
      type: 'cash',
      groupName: '',
      accountName: '',
      amount: '',
      currency: '',
      reference: '',
      description: '',
    });
    setIsAdding(false);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;

      for (const row of rows) {
        const mapped = mapInvoiceRow(row);
        if (mapped && mapped.accountName) {
          addInvoice({
            date: mapped.date,
            invoiceNumber: mapped.invoiceNumber || String(invoices.length + successCount + 1).padStart(4, '0'),
            accountName: mapped.accountName,
            groupName: mapped.groupName,
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
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onDelete={selectedInvoice ? handleDelete : undefined}
        onImport={handleImport}
        showDuplicate
        onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={isReturn ? "بحث في المرتجعات..." : "بحث في الفواتير..."}
      />

      {/* Add Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {isReturn ? 'مرتجع مبيعات جديد' : 'فاتورة مبيعات جديدة'}
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
                  onValueChange={(val) => setFormData(prev => ({ ...prev, type: val as 'cash' | 'credit' }))}
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
                  onSelect={(val) => setFormData(prev => ({ ...prev, accountName: val }))}
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
      )}

      {/* Invoices Table */}
      <div className="flex-1 overflow-hidden p-4">
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
  );
}
