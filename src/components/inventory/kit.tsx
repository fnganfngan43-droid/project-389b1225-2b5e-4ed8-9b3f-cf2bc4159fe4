import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const inputCls = 'w-full h-10 rounded-md border border-input bg-card px-2 text-sm text-foreground';

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return <label className={cn('flex flex-col gap-1 text-xs font-semibold text-foreground', full && 'col-span-2')}>{label}{children}</label>;
}
export function Sel({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; placeholder?: string }) {
  return <select className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}
export function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <Sel value={value ? 'نعم' : 'لا'} onChange={v => onChange(v === 'نعم')} options={['نعم', 'لا']} />;
}
/** Overlay form that opens from the top of the screen. */
export function Panel({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return <div className="fixed inset-0 z-50 bg-foreground/40 flex items-start justify-center" onClick={onClose}>
    <div className="bg-background w-full max-w-2xl max-h-[92vh] overflow-auto rounded-b-xl border-2 border-border shadow-lg" onClick={e => e.stopPropagation()}>
      <div className="sticky top-0 z-10 gradient-primary text-primary-foreground flex items-center justify-between px-3 py-2">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose} aria-label="إغلاق" className="p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-3 grid grid-cols-2 gap-3">{children}</div>
      {footer && <div className="p-3 pt-0 flex gap-2 justify-end">{footer}</div>}
    </div>
  </div>;
}
export function Bar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2 p-2 bg-card border-b border-border shrink-0">{children}</div>;
}
export function Btn({ children, onClick, disabled, variant = 'outline' }: { children: ReactNode; onClick: () => void; disabled?: boolean; variant?: 'outline' | 'default' | 'destructive' }) {
  return <Button size="sm" variant={variant} onClick={onClick} disabled={disabled} className="min-h-[40px]">{children}</Button>;
}
/** Scrollable table with a sticky header row. */
export function DataTable<T extends { id: string }>({ cols, rows, selected, onSelect, onDouble }: {
  cols: { label: string; render: (r: T) => ReactNode }[]; rows: T[]; selected?: string | null; onSelect?: (id: string) => void; onDouble?: (r: T) => void;
}) {
  return <div className="flex-1 overflow-auto min-h-0 m-2 border border-border rounded-md bg-card">
    <table className="w-max min-w-full text-[13px] text-foreground border-collapse">
      <thead><tr>{cols.map(c => <th key={c.label} className="sticky top-0 z-10 bg-[hsl(var(--table-header))] border border-border px-2 py-2 font-bold whitespace-nowrap">{c.label}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={cols.length} className="text-center p-4 text-muted-foreground border border-border">لا توجد بيانات</td></tr>}
        {rows.map(r => <tr key={r.id} onClick={() => onSelect?.(r.id)} onDoubleClick={() => onDouble?.(r)}
          className={cn('cursor-pointer', selected === r.id && 'bg-primary/20')}>
          {cols.map(c => <td key={c.label} className="border border-border px-2 py-1.5 whitespace-nowrap">{c.render(r)}</td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
