import { describe, test as it } from 'node:test';
import { strict as assert } from 'node:assert';
import { itemMovements, toBaseQty, unitFactors, validateUnits, Item } from './inventory';

const item: Item = { id: 'i', number: 'A1', name: 'x', mainGroupId: '', subGroupId: '', detailGroupId: '', units: [
  { unit: 'حبة', pack: 1, level: 'أصغر مستوى' }, { unit: 'درزن', pack: 12, level: 'وحدة البيع' }, { unit: 'طرد', pack: 24, level: 'وحدة الشراء' }] };

describe('inventory', () => {
  it('dozen = 12 pieces, carton = 24 dozens = 288 pieces', () => {
    assert.deepEqual(unitFactors(item.units), { 'حبة': 1, 'درزن': 12, 'طرد': 288 });
    assert.equal(toBaseQty(item, 'طرد', 2), 576);
  });
  it('first pack must be 1', () => { assert.ok(validateUnits([{ unit: 'درزن', pack: 12, level: 'وحدة البيع' }])); });
  it('stock = opening + returns − sales', () => {
    const m = itemMovements(item, [{ id: 'o', number: '1', date: '2026-01-01', warehouse: 'W', currency: '', rate: 1, reference: '', description: '', lines: [{ id: 'l', itemNumber: 'A1', itemName: 'x', unit: 'درزن', warehouse: 'W', qty: 10, unitCost: 120 }] }],
      [{ invoiceNumber: 'S1', date: '2026-01-02', lines: [{ itemNumber: 'A1', unit: 'حبة', qty: 30, unitCost: 10, price: 15 }] },
       { invoiceNumber: 'R1', date: '2026-01-03', isReturn: true, lines: [{ itemNumber: 'A1', unit: 'حبة', qty: 5, unitCost: 10, price: 15 }] }]);
    assert.equal(m.at(-1)!.balance, 120 - 30 + 5);
  });
});
