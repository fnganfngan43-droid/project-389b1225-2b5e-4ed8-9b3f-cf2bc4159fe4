import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounting } from '@/contexts/AccountingContext';
import { Calculator, LogIn, LogOut, User, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';

export function WelcomeScreen() {
  const { settings, isLoggedIn, login, logout, password } = useAccounting();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginClick = () => {
    if (password) {
      // Password is set, show password input
      setShowPasswordInput(true);
    } else {
      // No password, login directly
      login();
    }
  };

  const handlePasswordSubmit = () => {
    if (enteredPassword === password) {
      login();
      setShowPasswordInput(false);
      setEnteredPassword('');
    } else {
      toast.error('عذراً، كلمة المرور خاطئة');
    }
  };

  const handleCancelPassword = () => {
    setShowPasswordInput(false);
    setEnteredPassword('');
  };

  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl animate-pulse-soft animation-delay-500" />
      </div>

      {/* Logo */}
      <div className="relative z-10 animate-slide-up">
        <div className="w-32 h-32 rounded-full gradient-gold shadow-glow flex items-center justify-center mb-8 animate-float">
          <Calculator className="w-16 h-16 text-accent-foreground" />
        </div>
      </div>

      {/* Title */}
      <div className="text-center relative z-10 animate-slide-up animation-delay-100">
        <h1 className="text-4xl font-bold text-primary-foreground mb-2">
          رفيق المحاسب
        </h1>
        <p className="text-primary-foreground/80 text-lg mb-2">
          Accountant Companion
        </p>
        <p className="text-primary-foreground/60 text-sm max-w-xs mx-auto">
          برنامج محاسبي متكامل لإدارة حساباتك بسهولة واحترافية
        </p>
      </div>

      {/* Welcome message */}
      <div className="mt-10 p-6 bg-card/10 backdrop-blur-sm rounded-2xl border border-primary-foreground/20 max-w-sm w-full animate-slide-up animation-delay-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary-foreground/70 text-sm">مرحباً بك</p>
            <p className="text-primary-foreground font-bold text-lg">{settings.userName}</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-8 flex flex-col gap-4 w-full max-w-sm animate-slide-up animation-delay-300">
        {!isLoggedIn ? (
          <>
            {!showPasswordInput ? (
              <Button
                onClick={handleLoginClick}
                size="xl"
                variant="accent"
                className="w-full"
              >
                <LogIn className="w-5 h-5" />
                الدخول
                {password && <Lock className="w-4 h-4 mr-2" />}
              </Button>
            ) : (
              <div className="space-y-4 animate-slide-up">
                <div className="p-4 bg-card/10 backdrop-blur-sm rounded-xl border border-primary-foreground/20">
                  <label className="text-primary-foreground text-sm mb-2 block">أدخل كلمة المرور</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={enteredPassword}
                      onChange={(e) => setEnteredPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="bg-background/80 pl-10"
                      onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePasswordSubmit}
                    size="lg"
                    variant="accent"
                    className="flex-1"
                  >
                    <LogIn className="w-5 h-5" />
                    دخول
                  </Button>
                  <Button
                    onClick={handleCancelPassword}
                    size="lg"
                    variant="outline"
                    className="flex-1 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button
            onClick={logout}
            size="xl"
            variant="outline"
            className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="w-5 h-5" />
            الخروج
          </Button>
        )}
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-primary-foreground/40 text-sm">
        الإصدار 1.0.0
      </p>
    </div>
  );
}
