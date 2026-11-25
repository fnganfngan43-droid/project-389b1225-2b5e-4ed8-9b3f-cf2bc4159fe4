// Inventory module: pure logic + localStorage store.
import { useEffect, useState } from 'react';

export type UnitLevel = 'الوحدة الرئيسية' | 'وحدة البيع' | 'وحدة الشراء' | 'أصغر مستوى';
export const UNIT_LEVELS: UnitLevel[] = ['الوحدة الرئيسية', 'وحدة البيع', 'وحدة الشراء', 'أصغر مستوى'];

export interface MeasureUnit { id: string; code: string; name: string; defaultPack: number; kind: 'عددية' | 'قياسية' }
export interface ItemGroup { id: string; level: 1 | 2 | 3; name: string; parentId?: string }
export interface WarehouseGroup { id: string; number: string; name: string; kind: 'رئيسي' | 'فرعي'; branch: string }
export interface Warehouse { id: string; number: string; name: string; code: string; currency: string; groupId: string; keeperName: string; keeperNumber: string; footer: string }
export interface ItemUnit { unit: string; pack: number; level: UnitLevel }
export interface Item { id: string; number: string; name: string; mainGroupId: string; subGroupId: string; detailGroupId: string; units: ItemUnit[] }
export interface OpeningLine { id: string; itemNumber: string; itemName: string; unit: string; warehouse: string; qty: number; unitCost: number }
export interface OpeningStock { id: string; number: string; date: string; warehouse: string; currency: string; rate: number; reference: string; description: string; lines: OpeningLine[] }
export interface AccountLink { field: string; accountNumber: string; accountName: string }
export interface LinkRow { id: string; groupId: string; links: AccountLink[] }
export interface InventorySettings {
  costMethod: 'المتوسط المرجح' | 'FIFO' | 'LIFO';
  allowNegative: boolean; barcode: boolean; itemUnits: boolean; serial: boolean; batches: boolean;
  updateCost: 'تلقائي عند الحفظ' | 'يدوي'; requireWarehouse: boolean; printUnitCost: boolean;
  belowCost: 'تنبيه قبل الموافقة' | 'نعم اسمح' | 'لا اسمح'; editPriceAfterSave: boolean; totalDiscount: boolean;
  codeMethod: 'تلقائي' | 'يدوي'; codeDigits: number; requireGroup: boolean; itemImage: boolean; minAlert: boolean;
  lockAfter: string; partialCount: boolean; printCountDiff: boolean;
}
export const LINK_FIELDS = ['حساب المخزون', 'حساب المبيعات', 'حساب تكلفة المبيعات', 'حساب مردود المبيعات', 'حساب تكلفة مردود المبيعات', 'حساب الخصم المسموح به', 'حساب مردود مبيعات سنوات سابقة', 'حساب تكلفة مردود سنوات سابقة', 'حساب الخصم المكتسب', 'حساب تكلفة الكمية المجانية', 'حساب تكلفة مردود الكمية المجانية', 'حساب تكلفة مشتريات الكمية المجانية', 'حساب وسيط مبيعات مؤجلة الدفع', 'حساب وسيط تكلفة مبيعات', 'حساب تكلفة الكميات التعويضية'];
export const DEFAULT_SETTINGS: InventorySettings = {
  costMethod: 'المتوسط المرجح', allowNegative: false, barcode: true, itemUnits: true, serial: false, batches: false,
  updateCost: 'تلقائي عند الحفظ', requireWarehouse: true, printUnitCost: false, belowCost: 'تنبيه قبل الموافقة', editPriceAfterSave: false, totalDiscount: true,
  codeMethod: 'تلقائي', codeDigits: 6, requireGroup: true, itemImage: true, minAlert: true, lockAfter: '', partialCount: true, printCountDiff: true,
};

export interface InventoryData { settings: InventorySettings; settingsSaved: boolean; links: LinkRow[]; units: MeasureUnit[]; groups: ItemGroup[]; whGroups: WarehouseGroup[]; warehouses: Warehouse[]; items: Item[]; openings: OpeningStock[] }
const KEY = 'inventory_v1';
const empty = (): InventoryData => ({ settings: DEFAULT_SETTINGS, settingsSaved: false, links: [], units: [], groups: [], whGroups: [], warehouses: [], items: [], openings: [] });
const load = (): InventoryData => { try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return empty(); } };
export const uid = () => Math.random().toString(36).slice(2, 10);

let shared: InventoryData | null = null;
const subs = new Set<(d: InventoryData) => void>();
export function useInventory() {
  if (!shared) shared = load();
  const [data, setData] = useState<InventoryData>(shared);
  useEffect(() => { subs.add(setData); return () => { subs.delete(setData); }; }, []);
  const update = (fn: (d: InventoryData) => InventoryData) => {
    shared = fn(shared!); localStorage.setItem(KEY, JSON.stringify(shared)); subs.forEach(s => s(shared!));
  };
  return { data, update };
}

/** Next auto number starting at 1. */
export const nextNumber = (nums: string[]) => String(nums.reduce((m, n) => Math.max(m, parseInt(n) || 0), 0) + 1);

/** How many smallest units each unit contains. Pack of each row = count of the previous unit. */
export function unitFactors(units: ItemUnit[]): Record<string, number> {
  const out: Record<string, number> = {}; let f = 1;
  units.forEach((u, i) => { f = i === 0 ? 1 : f * (u.pack || 1); out[u.unit] = f; });
  return out;
}
export const toBaseQty = (item: Item | undefined, unit: string, qty: number) => qty * ((item && unitFactors(item.units)[unit]) || 1);

/** First pack must be the smallest (1) and later packs must be > 1. */
export function validateUnits(units: ItemUnit[]): string | null {
  if (!units.length) return 'أضف وحدة واحدة على الأقل';
  if (units[0].pack !== 1) return 'عبوة الوحدة الأولى يجب أن تكون 1 (أصغر وحدة)';
  if (units.slice(1).some(u => !(u.pack > 1))) return 'عبوة كل وحدة بعد الأولى يجب أن تكون أكبر من 1';
  if (new Set(units.map(u => u.unit)).size !== units.length) return 'وحدة مكررة';
  return null;
}

export interface Movement { docNumber: string; date: string; description: string; type: string; inQty: number; outQty: number; balance: number; unitCost: number; price: number }
interface SalesLine { itemNumber: string; unit: string; qty: number; unitCost: number; price: number }
interface SalesDoc { invoiceNumber: string; date: string; isReturn?: boolean; customerName?: string; payAccountName?: string; lines: SalesLine[] }

/** Stock = opening + purchases + returns − sales. Quantities in the smallest unit. */
export function itemMovements(item: Item, openings: OpeningStock[], sales: SalesDoc[], warehouse?: string): Movement[] {
  const raw: Omit<Movement, 'balance'>[] = [];
  openings.forEach(o => o.lines.filter(l => l.itemNumber === item.number && (!warehouse || (l.warehouse || o.warehouse) === warehouse)).forEach(l => {
    const f = toBaseQty(item, l.unit, 1);
    raw.push({ docNumber: o.number, date: o.date, description: 'المخزون الافتتاحي', type: 'رصيد افتتاحي', inQty: l.qty * f, outQty: 0, unitCost: l.unitCost / f, price: 0 });
  }));
  sales.forEach(s => s.lines.filter(l => l.itemNumber === item.number).forEach(l => {
    const f = toBaseQty(item, l.unit, 1); const q = l.qty * f;
    raw.push({ docNumber: s.invoiceNumber, date: s.date, description: s.customerName || s.payAccountName || '', type: s.isReturn ? 'مرتجع مبيعات' : 'فاتورة مبيعات', inQty: s.isReturn ? q : 0, outQty: s.isReturn ? 0 : q, unitCost: l.unitCost / f, price: l.price / f });
  }));
  raw.sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  return raw.map(m => { bal += m.inQty - m.outQty; return { ...m, balance: bal }; });
}
export function loadSalesDocs(): SalesDoc[] { try { return JSON.parse(localStorage.getItem('sales_invoices_v2') || '[]'); } catch { return []; } }
