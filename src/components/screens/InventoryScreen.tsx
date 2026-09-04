import { Boxes } from 'lucide-react';

export function InventoryScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="w-20 h-20 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-glow">
        <Boxes className="w-10 h-10" />
      </span>
      <h2 className="text-xl font-bold text-foreground">شاشة المخزون</h2>
      <p className="text-sm text-muted-foreground">هذه الشاشة قيد التطوير وستتوفر قريباً.</p>
    </div>
  );
}
