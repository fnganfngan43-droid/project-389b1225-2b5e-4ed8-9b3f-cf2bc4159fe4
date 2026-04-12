import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Account } from '@/types/accounting';
import { Hash, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AccountNumberInputProps {
  accounts: Account[];
  value: string;
  onChange: (value: string) => void;
  onAccountFound: (account: Account) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AccountNumberInput({
  accounts,
  value,
  onChange,
  onAccountFound,
  placeholder = "رقم الحساب",
  disabled = false,
}: AccountNumberInputProps) {
  const [status, setStatus] = useState<'idle' | 'found' | 'not-found'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    if (!value.trim()) {
      setStatus('idle');
      return;
    }

    const found = accounts.find(a => a.accountNumber === value.trim());
    if (found) {
      setStatus('found');
      onAccountFound(found);
      toast.success(`تم العثور على الحساب: ${found.accountName}`);
    } else {
      setStatus('not-found');
      toast.error('رقم الحساب غير موجود في الدليل المحاسبي');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setStatus('idle');
  };

  return (
    <div className="relative">
      <Hash className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`pr-10 text-left ${
          status === 'found' ? 'border-success ring-1 ring-success/30' :
          status === 'not-found' ? 'border-destructive ring-1 ring-destructive/30' : ''
        }`}
        dir="ltr"
        disabled={disabled}
      />
      {status === 'found' && (
        <CheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-success" />
      )}
      {status === 'not-found' && (
        <XCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-destructive" />
      )}
    </div>
  );
}
