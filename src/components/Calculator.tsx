import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
}

export function Calculator({ onClose }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);

  const handleNumber = (num: string) => {
    if (resetNext) {
      setDisplay(num);
      setResetNext(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleOperation = (op: string) => {
    const current = parseFloat(display);
    if (previousValue !== null && operation && !resetNext) {
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(current);
    }
    setOperation(op);
    setResetNext(true);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const current = parseFloat(display);
      const result = calculate(previousValue, current, operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setResetNext(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setResetNext(false);
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercent = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const handleBackspace = () => {
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const btnClass = "h-12 text-lg font-semibold rounded-xl transition-all active:scale-95";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-2xl shadow-xl w-80 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
          <span className="font-bold text-base">الآلة الحاسبة</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-primary-foreground hover:bg-primary-foreground/20">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Display */}
        <div className="px-4 py-4 bg-secondary/50">
          <div className="text-xs text-muted-foreground h-5 text-left" dir="ltr">
            {previousValue !== null ? `${previousValue} ${operation}` : ''}
          </div>
          <div className="text-3xl font-bold text-foreground text-left truncate" dir="ltr">
            {display}
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-4 gap-1.5 p-3">
          <Button variant="secondary" className={btnClass} onClick={handleClear}>C</Button>
          <Button variant="secondary" className={btnClass} onClick={handleBackspace}>⌫</Button>
          <Button variant="secondary" className={btnClass} onClick={handlePercent}>%</Button>
          <Button variant="warning" className={btnClass} onClick={() => handleOperation('÷')}>÷</Button>

          <Button variant="outline" className={btnClass} onClick={() => handleNumber('7')}>7</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('8')}>8</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('9')}>9</Button>
          <Button variant="warning" className={btnClass} onClick={() => handleOperation('×')}>×</Button>

          <Button variant="outline" className={btnClass} onClick={() => handleNumber('4')}>4</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('5')}>5</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('6')}>6</Button>
          <Button variant="warning" className={btnClass} onClick={() => handleOperation('-')}>-</Button>

          <Button variant="outline" className={btnClass} onClick={() => handleNumber('1')}>1</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('2')}>2</Button>
          <Button variant="outline" className={btnClass} onClick={() => handleNumber('3')}>3</Button>
          <Button variant="warning" className={btnClass} onClick={() => handleOperation('+')}>+</Button>

          <Button variant="outline" className={`${btnClass} col-span-2`} onClick={() => handleNumber('0')}>0</Button>
          <Button variant="outline" className={btnClass} onClick={handleDecimal}>.</Button>
          <Button variant="default" className={btnClass} onClick={handleEquals}>=</Button>
        </div>
      </div>
    </div>
  );
}
