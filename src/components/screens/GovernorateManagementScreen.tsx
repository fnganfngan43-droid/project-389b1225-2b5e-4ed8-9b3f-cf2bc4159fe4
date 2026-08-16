import { useState } from 'react';
import { useAccounting } from '@/contexts/AccountingContext';
import { Governorate } from '@/types/accounting';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { matchesSearch, SearchColumn } from '@/utils/searchFilter';

const SEARCH_COLUMNS: SearchColumn[] = [
  { key: 'name', header: 'اسم المحافظة' },
  { key: 'city', header: 'المدينة' },
];

export function GovernorateManagementScreen() {
  const { governorates, addGovernorate, updateGovernorate, deleteGovernorate, accounts } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState<Governorate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    city: '',
  });

  const filteredGovernorates = governorates.filter(gov =>
    matchesSearch(gov, searchTerm, searchColumn, SEARCH_COLUMNS)
  );

  const resetForm = () => {
    setFormData({ name: '', city: '' });
    setIsAdding(false);
    setSelectedGovernorate(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المحافظة');
      return;
    }

    // Check for duplicate name
    const isDuplicate = governorates.some(g => 
      g.name === formData.name.trim() && g.id !== selectedGovernorate?.id
    );
    if (isDuplicate) {
      toast.error('اسم المحافظة موجود مسبقاً');
      return;
    }

    if (selectedGovernorate) {
      updateGovernorate(selectedGovernorate.id, {
        name: formData.name.trim(),
        city: formData.city.trim() || undefined,
      });
      toast.success('تم تعديل المحافظة بنجاح');
    } else {
      addGovernorate({
        name: formData.name.trim(),
        city: formData.city.trim() || undefined,
      });
      toast.success('تم إضافة المحافظة بنجاح');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (selectedGovernorate) {
      setFormData({
        name: selectedGovernorate.name,
        city: selectedGovernorate.city || '',
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedGovernorate) {
      // Check if governorate is used in any account
      const usedInAccounts = accounts.some(a => a.governorate === selectedGovernorate.name);

      if (usedInAccounts) {
        toast.error(`عذراً، المحافظة "${selectedGovernorate.name}" مستخدمة ولا يمكن حذفها`);
        return;
      }

      deleteGovernorate(selectedGovernorate.id);
      setSelectedGovernorate(null);
      toast.success('تم حذف المحافظة بنجاح');
    }
  };

  const columns = [
    { 
      key: 'name', 
      header: 'اسم المحافظة', 
      render: (item: Governorate) => item.name 
    },
    { 
      key: 'city', 
      header: 'المدينة', 
      render: (item: Governorate) => (
        <span className="text-muted-foreground">{item.city || '-'}</span>
      )
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <ActionToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
          searchColumns={SEARCH_COLUMNS}
          searchColumn={searchColumn}
          onSearchColumnChange={setSearchColumn}
        searchPlaceholder="بحث في المحافظات..."
        onAdd={() => {
          resetForm();
          setIsAdding(true);
        }}
        onEdit={selectedGovernorate ? handleEdit : undefined}
        onDelete={selectedGovernorate ? handleDelete : undefined}
      />

      {isAdding && (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              {selectedGovernorate ? 'تعديل محافظة' : 'إضافة محافظة جديدة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="governorateName">اسم المحافظة</Label>
                <Input
                  id="governorateName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: صنعاء"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="governorateCity">المدينة (اختياري)</Label>
                <Input
                  id="governorateCity"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="مثال: صنعاء القديمة"
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
            <MapPin className="w-4 h-4 text-primary" />
            قائمة المحافظات ({filteredGovernorates.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollableTable
            columns={columns}
            data={filteredGovernorates}
            selectedId={selectedGovernorate?.id}
            onRowClick={(item) => setSelectedGovernorate(item)}
            getItemId={(item) => item.id}
            emptyTitle="لا توجد محافظات"
            emptyDescription="اضغط على إضافة لإنشاء محافظة جديدة"
          />
        </CardContent>
      </Card>
    </div>
  );
}
