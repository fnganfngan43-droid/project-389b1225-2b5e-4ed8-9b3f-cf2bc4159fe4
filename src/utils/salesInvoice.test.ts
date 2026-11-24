import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildJournal, invoiceTotals, isBelowCost, InvoiceLine, SalesInvoiceDoc } from './salesInvoice';

const line = (o: Partial<InvoiceLine>): InvoiceLine => ({ id: '1', itemNumber: '1', itemName: 'x', unit: 'حبة', stock: 0, qty: 1, unitCost: 0, price: 0, discount: 0, ...o });
const doc = (o: Partial<SalesInvoiceDoc>): SalesInvoiceDoc => ({ id: 'a', invoiceNumber: 'INV-001', date: '', payType: 'cash', payAccountNumber: '', payAccountName: 'الصندوق الرئيسي', customerNumber: '', customerName: 'علي', phone: '', currency: 'YER', rate: 1, reference: '', userName: '', savedAt: '', lines: [line({ qty: 1, price: 5000, discount: 400, unitCost: 3500 })], ...o });

describe('sales invoice', () => {
  it('cash 5000 - discount 400: box debit 4600, discount 400, sales credit 5000', () => {
    const [s] = buildJournal(doc({}));
    assert.equal(s[0].debit, 4600); assert.equal(s[1].debit, 400); assert.equal(s[2].credit, 5000);
  });
  it('cost entry 3500', () => {
    const [, c] = buildJournal(doc({}));
    assert.equal(c[0].debit, 3500); assert.equal(c[1].credit, 3500);
  });
  it('credit invoice debits customer', () => assert.equal(buildJournal(doc({ payType: 'credit' }))[0][0].account, 'علي'));
  it('return reverses', () => assert.equal(buildJournal(doc({ isReturn: true }))[0][0].credit, 4600));
  it('total = qty x price', () => assert.equal(invoiceTotals([line({ qty: 10, price: 12 })]).net, 120));
  it('below cost', () => { assert.ok(isBelowCost(line({ price: 9, unitCost: 10 }))); assert.ok(!isBelowCost(line({ price: 10, unitCost: 10 }))); });
});
