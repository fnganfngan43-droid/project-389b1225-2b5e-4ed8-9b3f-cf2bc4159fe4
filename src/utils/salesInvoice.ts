export type PayType = 'cash' | 'bank' | 'credit';

export interface InvoiceLine {
  id: string;
  itemNumber: string;
  itemName: string;
  unit: string;
  stock: number;
  qty: number;
  unitCost: number; // in invoice currency
  price: number;
  discount: number;
}

export interface SalesInvoiceDoc {
  id: string;
  invoiceNumber: string;
  date: string;
  payType: PayType;
  isReturn?: boolean;
  payAccountNumber: string;
  payAccountName: string;
  customerNumber: string;
  customerName: string;
  phone: string;
  currency: string;
  rate: number;
  reference: string;
  lines: InvoiceLine[];
  userName: string;
  savedAt: string;
}

export interface JournalLine { account: string; debit: number; credit: number; description: string }

export const lineTotal = (l: InvoiceLine) => l.qty * l.price - l.discount;

export function invoiceTotals(lines: InvoiceLine[]) {
  const qty = lines.reduce((s, l) => s + l.qty, 0);
  const gross = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const cost = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  return { qty, gross, discount, net: gross - discount, cost };
}

export const isBelowCost = (l: InvoiceLine) => l.unitCost > 0 && l.price < l.unitCost;

/** Builds the two automatic entries (sales + cost). Returns reverse them. */
export function buildJournal(inv: SalesInvoiceDoc): JournalLine[][] {
  const t = invoiceTotals(inv.lines);
  const n = inv.invoiceNumber;
  const debitAcc = inv.payType === 'credit' ? (inv.customerName || 'العميل') : (inv.payAccountName || (inv.payType === 'bank' ? 'البنك' : 'الصندوق'));
  const label = inv.isReturn ? 'مرتجع' : (inv.payType === 'credit' ? 'مبيعات آجلة' : 'مبيعات نقدية');
  const sales: JournalLine[] = [
    { account: debitAcc, debit: t.net, credit: 0, description: `${label} فاتورة رقم ${n}` },
  ];
  if (t.discount > 0) sales.push({ account: 'خصم مسموح به', debit: t.discount, credit: 0, description: `خصم فاتورة رقم ${n}` });
  sales.push({ account: inv.isReturn ? 'مردود المبيعات' : 'إيرادات المبيعات', debit: 0, credit: t.gross, description: `${label} فاتورة رقم ${n}` });
  const cost: JournalLine[] = t.cost > 0 ? [
    { account: inv.isReturn ? 'تكلفة المردود' : 'تكلفة المبيعات', debit: t.cost, credit: 0, description: `تكلفة فاتورة رقم ${n}` },
    { account: 'المخزون', debit: 0, credit: t.cost, description: `تكلفة فاتورة رقم ${n}` },
  ] : [];
  const flip = (e: JournalLine[]) => e.map(l => ({ ...l, debit: l.credit, credit: l.debit }));
  const entries = [sales, cost].filter(e => e.length);
  return inv.isReturn ? entries.map(flip) : entries;
}
