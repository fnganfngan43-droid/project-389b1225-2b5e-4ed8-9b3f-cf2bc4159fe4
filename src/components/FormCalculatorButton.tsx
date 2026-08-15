import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator as CalculatorIcon } from 'lucide-react';
import { Calculator } from '@/components/Calculator';

export function FormCalculatorButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="الآلة الحاسبة"
        onClick={() => setOpen(true)}
      >
        <CalculatorIcon className="w-4 h-4" />
      </Button>
      {open && <Calculator onClose={() => setOpen(false)} />}
    </>
  );
}
