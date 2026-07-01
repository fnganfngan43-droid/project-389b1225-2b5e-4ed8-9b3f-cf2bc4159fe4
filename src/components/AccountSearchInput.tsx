import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Account } from '@/types/accounting';
import { Search, X } from 'lucide-react';

interface AccountSearchInputProps {
  accounts: Account[];
  value: string;
  onSelect: (accountName: string, account?: Account) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AccountSearchInput({ 
  accounts, 
  value, 
  onSelect, 
  placeholder = "ابحث عن الحساب...",
  disabled = false
}: AccountSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.accountName.includes(searchTerm) && searchTerm !== acc.accountName
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowSuggestions(true);
    
    // If exact match, select it
    const exactMatch = accounts.find(acc => acc.accountName === newValue);
    if (exactMatch) {
      onSelect(exactMatch.accountName, exactMatch);
    }
  };

  const handleSelect = (accountName: string) => {
    setSearchTerm(accountName);
    const account = accounts.find(acc => acc.accountName === accountName);
    onSelect(accountName, account);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onSelect('', undefined);
    setShowSuggestions(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="pr-10 pl-8"
          disabled={disabled}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            aria-label="مسح"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {showSuggestions && filteredAccounts.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredAccounts.map(acc => (
            <div
              key={acc.id}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelect(acc.accountName)}
            >
              {acc.accountName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
