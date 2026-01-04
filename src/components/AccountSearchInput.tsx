import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Account } from '@/types/accounting';
import { Search } from 'lucide-react';

interface AccountSearchInputProps {
  accounts: Account[];
  value: string;
  onSelect: (accountName: string) => void;
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
      onSelect(exactMatch.accountName);
    }
  };

  const handleSelect = (accountName: string) => {
    setSearchTerm(accountName);
    onSelect(accountName);
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
          className="pr-10"
          disabled={disabled}
        />
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
