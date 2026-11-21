import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useAccounting } from '@/contexts/AccountingContext';
import { getGeneralAnalyticName, getLinkedAnalyticEntities, getSubAccounts } from '@/utils/subAccountSelection';

interface SimpleSearchProps {
  options: string[];
  value: string;
  onSelect: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function SimpleSearchInput({ options, value, onSelect, placeholder, disabled }: SimpleSearchProps) {
  const [term, setTerm] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setTerm(value), [value]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const suggestions = options.filter((o) => o.includes(term) && o !== term);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={term}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pr-10 pl-8"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setTerm(v);
            setOpen(true);
            onSelect(options.includes(v) ? v : '');
          }}
        />
        {term && !disabled && (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            onClick={() => {
              setTerm('');
              onSelect('');
              setOpen(false);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent text-muted-foreground"
            aria-label="مسح"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((o) => (
            <Button
              type="button"
              variant="ghost"
              key={o}
              className="w-full justify-start px-3 py-2 text-sm h-auto whitespace-normal text-right"
              onClick={() => {
                setTerm(o);
                onSelect(o);
                setOpen(false);
              }}
            >
              {o}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SubAccountFieldsProps {
  /** اسم الحساب الفرعي المختار */
  subAccountName: string;
  /** اسم الحساب التحليلي المختار */
  analyticName: string;
  onChange: (next: { subAccountName: string; analyticName: string }) => void;
}

/** حقلان: الحساب الفرعي (من الدليل المحاسبي) + الحساب التحليلي */
export function SubAccountFields({ subAccountName, analyticName, onChange }: SubAccountFieldsProps) {
  const { chartAccounts, analyticEntities } = useAccounting();

  const subAccounts = useMemo(
    () => getSubAccounts(chartAccounts),
    [chartAccounts]
  );

  const selected = useMemo(
    () => subAccounts.find((a) => a.accountName === subAccountName),
    [subAccounts, subAccountName]
  );

  const analyticType = selected?.analyticType;
  const isGeneral = !analyticType || analyticType === 'عام';

  const entityNames = useMemo(
    () =>
      getLinkedAnalyticEntities(selected, analyticEntities).map((e) => e.entityName),
    [analyticEntities, selected]
  );

  // للحساب العام: تنزيل اسم الحساب التحليلي تلقائياً
  useEffect(() => {
    if (!selected) return;
    if (isGeneral) {
      const auto = getGeneralAnalyticName(selected);
      if (analyticName !== auto) onChange({ subAccountName, analyticName: auto });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isGeneral, analyticName]);

  return (
    <>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب الفرعي</label>
        <SimpleSearchInput
          options={subAccounts.map((a) => a.accountName)}
          value={subAccountName}
          placeholder="ابحث عن الحساب الفرعي..."
          onSelect={(val) => onChange({ subAccountName: val, analyticName: '' })}
        />
      </div>
      <div>
        <label className="text-sm text-muted-foreground mb-1 block">الحساب التحليلي</label>
        {isGeneral ? (
          <Input
            value={analyticName}
            readOnly
            placeholder="يظهر تلقائياً"
            className="bg-muted/40"
          />
        ) : (
          <SimpleSearchInput
            options={entityNames}
            value={analyticName}
            placeholder={`ابحث في ${analyticType}...`}
            disabled={!selected}
            onSelect={(val) => onChange({ subAccountName, analyticName: val })}
          />
        )}
      </div>
    </>
  );
}
