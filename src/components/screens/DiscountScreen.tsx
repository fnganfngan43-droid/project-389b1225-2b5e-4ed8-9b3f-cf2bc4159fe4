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

  const filteredDiscounts = discounts.filter(d => 
    d.accountName.includes(searchTerm) || 
    d.discountNumber.includes(searchTerm)
  );

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    discountNumber: String(discounts.length + 1).padStart(4, '0'),
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
    resetForm();
  };

  const handleDelete = () => {
    if (selectedDiscount) {
      setDiscounts(prev => prev.filter(d => d.id !== selectedDiscount.id));
      setSelectedDiscount(null);
      toast.success('تم حذف الخصم بنجاح');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      discountNumber: String(discounts.length + 2).padStart(4, '0'),
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

  return (
    <div className="flex flex-col h-full">
      <ActionToolbar
        onAdd={() => setIsAdding(true)}
        onDelete={selectedDiscount ? handleDelete : undefined}
        onImport={() => toast.info('سيتم إضافة خاصية الاستيراد قريباً')}
        showDuplicate
        onDuplicate={() => toast.info('سيتم إضافة هذه الخاصية قريباً')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في الخصومات..."
      />

      {/* Add Form */}
      {isAdding && (
        <Card className="m-4 animate-slide-up border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5" />
                خصم جديد
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

      {/* Discounts List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredDiscounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Percent className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">لا توجد خصومات</p>
              <p className="text-sm">اضغط على "إضافة" لإنشاء خصم جديد</p>
            </div>
          ) : (
            filteredDiscounts.map((discount, index) => (
              <Card
                key={discount.id}
                onClick={() => setSelectedDiscount(selectedDiscount?.id === discount.id ? null : discount)}
                className={`cursor-pointer transition-all duration-200 animate-slide-up ${
                  selectedDiscount?.id === discount.id 
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
                          #{discount.discountNumber}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          discount.type === 'cash' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-warning/20 text-warning'
                        }`}>
                          {discount.type === 'cash' ? 'نقدي' : 'آجل'}
                        </span>
                        <span className="text-xs text-muted-foreground">{discount.date}</span>
                      </div>
                      <p className="font-semibold text-foreground">{discount.accountName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{discount.description}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-accent">
                        {discount.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{discount.currency}</p>
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
