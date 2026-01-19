import { useState } from 'react';
import { useAccounting } from '@/contexts/AccountingContext';
import { AccountGroup } from '@/types/accounting';
import { ActionToolbar } from '@/components/ActionToolbar';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, X, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

export function AccountGroupManagementScreen() {
  const { groups, addGroup, updateGroup, deleteGroup, accounts } = useAccounting();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AccountGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    initialNumber: '',
  });

  const filteredGroups = groups.filter(group =>
    group.name.includes(searchTerm) ||
    group.initialNumber.includes(searchTerm)
  );

  const resetForm = () => {
    setFormData({ name: '', initialNumber: '' });
    setIsAdding(false);
    setSelectedGroup(null);
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.initialNumber.trim()) {
      toast.error('يرجى إدخال اسم المجموعة ورقم البداية');
      return;
    }

    // Check for duplicate name
    const isDuplicateName = groups.some(g => 
      g.name === formData.name.trim() && g.id !== selectedGroup?.id
    );
    if (isDuplicateName) {
      toast.error('اسم المجموعة موجود مسبقاً');
      return;
    }

    // Check for duplicate initial number
    const isDuplicateNumber = groups.some(g => 
      g.initialNumber === formData.initialNumber.trim() && g.id !== selectedGroup?.id
    );
    if (isDuplicateNumber) {
      toast.error('رقم البداية موجود مسبقاً');
      return;
    }

    if (selectedGroup) {
      updateGroup(selectedGroup.id, {
        name: formData.name.trim(),
        initialNumber: formData.initialNumber.trim(),
      });
      toast.success('تم تعديل المجموعة بنجاح');
    } else {
      addGroup({
        name: formData.name.trim(),
        initialNumber: formData.initialNumber.trim(),
      });
      toast.success('تم إضافة المجموعة بنجاح');
    }
    resetForm();
  };

  const handleEdit = () => {
    if (selectedGroup) {
      setFormData({
        name: selectedGroup.name,
        initialNumber: selectedGroup.initialNumber,
      });
      setIsAdding(true);
    }
  };

  const handleDelete = () => {
    if (selectedGroup) {
      // Check if group is used in any account
      const usedInAccounts = accounts.some(a => a.groupName === selectedGroup.name);

      if (usedInAccounts) {
        toast.error(`عذراً، المجموعة "${selectedGroup.name}" لها حسابات مرتبطة ولا يمكن حذفها`);
        return;
      }

      deleteGroup(selectedGroup.id);
      setSelectedGroup(null);
      toast.success('تم حذف المجموعة بنجاح');
    }
  };

  const columns = [
    { 
      key: 'name', 
      header: 'اسم المجموعة', 
      render: (item: AccountGroup) => item.name 
    },
    { 
      key: 'initialNumber', 
      header: 'رقم البداية', 
      render: (item: AccountGroup) => (
        <span className="font-mono text-primary">{item.initialNumber}</span>
      )
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      <ActionToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="بحث في المجموعات..."
        onAdd={() => {
          resetForm();
          setIsAdding(true);
        }}
        onEdit={selectedGroup ? handleEdit : undefined}
        onDelete={selectedGroup ? handleDelete : undefined}
      />

      {isAdding && (
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-primary" />
              {selectedGroup ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupName">اسم المجموعة</Label>
                <Input
                  id="groupName"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="مثال: العملاء"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialNumber">رقم البداية</Label>
                <Input
                  id="initialNumber"
                  value={formData.initialNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, initialNumber: e.target.value }))}
                  placeholder="مثال: 21000"
                  className="text-right"
                  dir="ltr"
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
            <FolderTree className="w-4 h-4 text-primary" />
            قائمة المجموعات ({filteredGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollableTable
            columns={columns}
            data={filteredGroups}
            selectedId={selectedGroup?.id}
            onRowClick={(item) => setSelectedGroup(item)}
            getItemId={(item) => item.id}
            emptyTitle="لا توجد مجموعات"
            emptyDescription="اضغط على إضافة لإنشاء مجموعة جديدة"
          />
        </CardContent>
      </Card>
    </div>
  );
}
