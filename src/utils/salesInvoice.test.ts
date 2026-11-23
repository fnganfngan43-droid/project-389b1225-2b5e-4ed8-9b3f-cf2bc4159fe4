import { describe, it, expect } from 'vitest';
import { buildJournal, invoiceTotals, isBelowCost, InvoiceLine, SalesInvoiceDoc } from './salesInvoice';

const line = (o: Partial<InvoiceLine>): InvoiceLine => ({ id: '1', itemNumber: '1', itemName: 'x', unit: 'حبة', stock: 0, qty: 1, unitCost: 0, price: 0, discount: 0, ...o });
const doc = (o: Partial<SalesInvoiceDoc>): SalesInvoiceDoc => ({ id: 'a', invoiceNumber: 'INV-001', date: '', payType: 'cash', payAccountNumber: '', payAccountName: 'الصندوق الرئيسي', customerNumber: '', customerName: 'علي', phone: '', currency: 'YER', rate: 1, reference: '', userName: '', savedAt: '', lines: [line({ qty: 1, price: 5000, discount: 400, unitCost: 3500 })], ...o });

describe('sales invoice', () => {
  it('cash invoice 5000 - discount 400: box debit 4600, sales credit 5000', () => {
    const [sales] = buildJournal(doc({}));
    expect(sales[0]).toMatchObject({ account: 'الصندوق الرئيسي', debit: 4600 });
    expect(sales[1]).toMatchObject({ account: 'خصم مسموح به', debit: 400 });
    expect(sales[2]).toMatchObject({ account: 'إيرادات المبيعات', credit: 5000 });
  });
  it('cost entry 3500 debit cost of sales, credit inventory', () => {
    const [, cost] = buildJournal(doc({}));
    expect(cost[0]).toMatchObject({ debit: 3500 });
    expect(cost[1]).toMatchObject({ account: 'المخزون', credit: 3500 });
  });
  it('credit invoice debits the customer', () => {
    expect(buildJournal(doc({ payType: 'credit' }))[0][0].account).toBe('علي');
  });
  it('return reverses entries', () => {
    const [sales] = buildJournal(doc({ isReturn: true }));
    expect(sales[0].credit).toBe(4600);
  });
  it('total = qty x price', () => {
    expect(invoiceTotals([line({ qty: 10, price: 12 })]).net).toBe(120);
  });
  it('flags price below cost', () => {
    expect(isBelowCost(line({ price: 9, unitCost: 10 }))).toBe(true);
    expect(isBelowCost(line({ price: 10, unitCost: 10 }))).toBe(false);
  });
});
