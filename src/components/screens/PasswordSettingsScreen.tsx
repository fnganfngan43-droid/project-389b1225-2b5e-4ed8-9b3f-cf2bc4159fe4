import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounting } from '@/contexts/AccountingContext';
import { Lock, Plus, Edit, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'none' | 'add' | 'edit';

export function PasswordSettingsScreen() {
  const { password, setPassword } = useAccounting();
  const [mode, setMode] = useState<Mode>('none');
  
  // Add password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Edit password fields
  const [oldPassword, setOldPassword] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  
  // Show/hide password toggles
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showEditNewPassword, setShowEditNewPassword] = useState(false);

  const handleAddPassword = () => {
    if (!newPassword.trim()) {
      toast.error('الرجاء إدخال كلمة المرور');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('كلمة المرور غير متطابقة');
      return;
    }
    if (newPassword.length < 4) {
      toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    
    setPassword(newPassword);
    toast.success('تم حفظ كلمة المرور بنجاح');
    setMode('none');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleEditPassword = () => {
    if (!oldPassword.trim()) {
      toast.error('الرجاء إدخال كلمة المرور السابقة');
      return;
    }
    if (oldPassword !== password) {
      toast.error('كلمة المرور السابقة غير صحيحة');
      return;
    }
    if (!editNewPassword.trim()) {
      toast.error('الرجاء إدخال كلمة المرور الجديدة');
      return;
    }
    if (editNewPassword.length < 4) {
      toast.error('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      return;
    }
    
    setPassword(editNewPassword);
    toast.success('تم تعديل كلمة المرور بنجاح');
    setMode('none');
    setOldPassword('');
    setEditNewPassword('');
  };

  const cancelMode = () => {
    setMode('none');
    setNewPassword('');
    setConfirmPassword('');
    setOldPassword('');
    setEditNewPassword('');
  };

  return (
    <div className="p-4 max-w-md mx-auto" dir="rtl">
      <Card className="shadow-elegant">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="w-5 h-5 text-primary" />
            إعدادات كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            {password ? (
              <p className="text-sm text-primary font-medium">✓ كلمة المرور مفعّلة</p>
            ) : (
              <p className="text-sm text-muted-foreground">لم يتم تعيين كلمة مرور</p>
            )}
          </div>

          {/* Buttons */}
          {mode === 'none' && (
            <div className="flex flex-col gap-3">
              {!password && (
                <Button
                  onClick={() => setMode('add')}
                  className="w-full"
                  variant="default"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة كلمة مرور
                </Button>
              )}
              {password && (
                <Button
                  onClick={() => setMode('edit')}
                  className="w-full"
                  variant="outline"
                >
                  <Edit className="w-4 h-4 ml-2" />
                  تعديل كلمة المرور
                </Button>
              )}
            </div>
          )}

          {/* Add Password Form */}
          {mode === 'add' && (
            <div className="space-y-4 animate-slide-up">
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddPassword} className="flex-1">
                  <Save className="w-4 h-4 ml-2" />
                  حفظ
                </Button>
                <Button onClick={cancelMode} variant="outline" className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          )}

          {/* Edit Password Form */}
          {mode === 'edit' && (
            <div className="space-y-4 animate-slide-up">
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور السابقة</label>
                <div className="relative">
                  <Input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور السابقة"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Input
                    type={showEditNewPassword ? 'text' : 'password'}
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditNewPassword(!showEditNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showEditNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleEditPassword} className="flex-1">
                  <Save className="w-4 h-4 ml-2" />
                  حفظ
                </Button>
                <Button onClick={cancelMode} variant="outline" className="flex-1">
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
