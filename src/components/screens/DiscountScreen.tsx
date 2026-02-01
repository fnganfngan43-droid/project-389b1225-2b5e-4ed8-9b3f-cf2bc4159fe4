import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionToolbar } from '@/components/ActionToolbar';
import { useAccounting } from '@/contexts/AccountingContext';
import { parseExcelFile, mapDiscountRow } from '@/utils/excelImport';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { getNextSequentialNumber } from '@/utils/sequentialNumber';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X, Percent } from 'lucide-react';
import { toast } from 'sonner';

interface DiscountEntry {
  id: string;
  date: string;
  discountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  type: 'cash' | 'credit';
  reference?: string;
  description: string;
}

export function DiscountScreen() {
  const { accounts, groups, currencies } = useAccounting();
  const [discounts, setDiscounts] = useState<DiscountEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountEntry | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<DiscountEntry | null>(null);

  const filteredDiscounts = discounts.filter(d => 
    d.accountName.includes(searchTerm) || 
    d.discountNumber.includes(searchTerm)
  );

  // Calculate next sequential number based on existing discounts
  const nextDiscountNumber = useMemo(() => {
    const existingNumbers = discounts.map(d => d.discountNumber);
    return getNextSequentialNumber(existingNumbers);
  }, [discounts]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    discountNumber: nextDiscountNumber,
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

    if (editingDiscount) {
      setDiscounts(prev => prev.map(d => 
        d.id === editingDiscount.id 
          ? {
              ...d,
              date: formData.date,
              discountNumber: formData.discountNumber,
              accountName: formData.accountName,
              amount: parseFloat(formData.amount),
              currency: formData.currency,
              type: formData.type,
              reference: formData.reference,
              description: formData.description || 'خصم',
            }
          : d
      ));
      toast.success('تم تحديث الخصم بنجاح');
    } else {
      const newDiscount: DiscountEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: formData.date,
        discountNumber: formData.discountNumber,
        accountName: formData.accountName,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        reference: formData.reference,
        description: formData.description || 'خصم',
      };
      setDiscounts(prev => [...prev, newDiscount]);
      toast.success('تم حفظ الخصم بنجاح');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (selectedDiscount) {
      const account = accounts.find(a => a.accountName === selectedDiscount.accountName);
      setEditingDiscount(selectedDiscount);
      setFormData({
        date: selectedDiscount.date,
        discountNumber: selectedDiscount.discountNumber,
        type: selectedDiscount.type,
        groupName: account?.groupName || '',
        accountName: selectedDiscount.accountName,
        amount: selectedDiscount.amount.toString(),
        currency: selectedDiscount.currency,
        reference: selectedDiscount.reference || '',
        description: selectedDiscount.description,
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedDiscount) {
      setDiscounts(prev => prev.filter(d => d.id !== selectedDiscount.id));
      setSelectedDiscount(null);
      toast.success('تم حذف الخصم بنجاح');
    }
  };

  const resetForm = () => {
    const existingNumbers = discounts.map(d => d.discountNumber);
    const newNumber = getNextSequentialNumber(existingNumbers);
    
    setFormData({
      date: new Date().toISOString().split('T')[0],
      discountNumber: newNumber,
      type: 'cash',
      groupName: '',
      accountName: '',
      amount: '',
      currency: '',
      reference: '',
      description: '',
    });
    setIsAdding(false);
    setEditingDiscount(null);
  };

  const handleImport = async (file: File) => {
    try {
      const rows = await parseExcelFile(file);
      let successCount = 0;

      for (const row of rows) {
        const mapped = mapDiscountRow(row);
        if (mapped && mapped.accountName) {
          const newDiscount: DiscountEntry = {
            id: Math.random().toString(36).substr(2, 9),
            date: mapped.date,
            discountNumber: mapped.discountNumber || String(discounts.length + successCount + 1).padStart(4, '0'),
            accountName: mapped.accountName,
            amount: mapped.amount,
            currency: mapped.currency,
            type: mapped.type,
            reference: mapped.reference,
            description: mapped.description || 'خصم',
          };
          setDiscounts(prev => [...prev, newDiscount]);
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم استيراد ${successCount} خصم بنجاح`);
      }
    } catch (error) {
      toast.error('فشل في استيراد الملف');
    }
  };

  const columns = [
    {
      key: 'discountNumber',
      header: 'رقم الخصم',
      render: (discount: DiscountEntry) => (
        <span className="font-mono text-sm bg-secondary px-2 py-1 rounded">#{discount.discountNumber}</span>
      ),
    },
    {
      key: 'date',
      header: 'التاريخ',
      render: (discount: DiscountEntry) => discount.date,
    },
    {
      key: 'type',
      header: 'النوع',
      render: (discount: DiscountEntry) => (
        <span className={`text-xs px-2 py-1 rounded-full ${
          discount.type === 'cash' 
            ? 'bg-success/20 text-success' 
            : 'bg-warning/20 text-warning'
        }`}>
          {discount.type === 'cash' ? 'نقدي' : 'آجل'}
        </span>
      ),
    },
    {
      key: 'accountName',
      header: 'اسم الحساب',
      render: (discount: DiscountEntry) => (
        <span className="font-semibold">{discount.accountName}</span>
      ),
    },
    {
      key: 'description',
      header: 'البيان',
      render: (discount: DiscountEntry) => discount.description || '-',
    },
    {
      key: 'reference',
      header: 'المرجع',
      render: (discount: DiscountEntry) => discount.reference || '-',
    },
    {
      key: 'currency',
      header: 'العملة',
      render: (discount: DiscountEntry) => discount.currency,
    },
    {
      key: 'amount',
      header: 'المبلغ',
      render: (discount: DiscountEntry) => (
        <span className="font-bold text-accent">
          {discount.amount.toLocaleString()}
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
            const existingNumbers = discounts.map(d => d.discountNumber);
            const newNumber = getNextSequentialNumber(existingNumbers);
            
            setFormData({
              date: new Date().toISOString().split('T')[0],
              discountNumber: newNumber,
              type: 'cash',
              groupName: '',
              accountName: '',
              amount: '',
              currency: '',
              reference: '',
              description: '',
            });
            setIsAdding(true);
          }}
          onEdit={selectedDiscount ? handleEdit : undefined}
          onDelete={selectedDiscount ? handleDelete : undefined}
          onImport={handleImport}
          showDuplicate
          onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="بحث في الخصومات..."
          importTitle="استيراد الخصومات"
          importColumns={[
            'التاريخ',
            'رقم الخصم',
            'النوع (نقدي/آجل)',
            'اسم المجموعة',
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
          <Card className="animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                {editingDiscount ? 'تعديل خصم' : 'خصم جديد'}
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
                <label className="text-sm text-muted-foreground mb-1 block">رقم الخصم</label>
                <Input
                  value={formData.discountNumber}
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
                <Select 
                  value={formData.accountName} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, accountName: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.accountName}>
                        {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">المبلغ المدين</label>
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
                  placeholder="خصم"
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

        {/* Discounts Table */}
        <div className="min-h-[300px]">
          <ScrollableTable
          data={filteredDiscounts}
          columns={columns}
          onRowClick={(discount) => setSelectedDiscount(selectedDiscount?.id === discount.id ? null : discount)}
          selectedId={selectedDiscount?.id}
          getItemId={(discount) => discount.id}
          emptyIcon={<Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />}
            emptyTitle="لا توجد خصومات"
            emptyDescription="اضغط على 'إضافة' لإنشاء خصم جديد"
          />
        </div>
      </div>
    </div>
  );
}
