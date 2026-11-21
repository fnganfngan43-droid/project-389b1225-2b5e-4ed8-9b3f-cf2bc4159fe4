import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import type { AnalyticEntity, AnalyticType, ChartAccount } from '../types/accounting';
import { getGeneralAnalyticName, getLinkedAnalyticEntities, getSubAccounts } from './subAccountSelection';

function subAccount(analyticType: AnalyticType, accountNumber = '1101'): ChartAccount {
  return { id: accountNumber, accountName: 'الحساب الفرعي', accountNumber, rank: 4, kind: 'فرعي', analyticType };
}

function entity(analyticType: AnalyticType, parentAccountNumber: string, entityName: string): AnalyticEntity {
  return { id: entityName, analyticType, parentAccountNumber, parentAccountName: 'الحساب الفرعي', entityName, entityNumber: '1', currencies: ['ر.ي'] };
}

describe('operation account selection', () => {
  test('search includes only subsidiary chart accounts', () => {
    const sub = subAccount('عام');
    assert.deepEqual(getSubAccounts([sub, { ...sub, id: 'main', kind: 'رئيسي' }]), [sub]);
  });

  test('general accounts use the saved analytic name, not the subsidiary name', () => {
    assert.equal(getGeneralAnalyticName({ ...subAccount('عام'), analyticName: 'المصروف التحليلي' }), 'المصروف التحليلي');
    assert.equal(getGeneralAnalyticName(subAccount('عام')), '');
  });

  for (const type of ['عميل', 'صناديق', 'بنوك', 'موردين'] as const) {
    test(`${type}: suggestions match both selected parent number and analytic type`, () => {
      const linked = entity(type, '1101', 'مرتبط');
      const wrongType = type === 'عميل' ? 'بنوك' : 'عميل';
      assert.deepEqual(getLinkedAnalyticEntities(subAccount(type), [
        linked, entity(type, '1102', 'حساب آخر'), entity(wrongType, '1101', 'نوع آخر'),
      ]), [linked]);
    });
  }

  test('unselected and general accounts have no searchable entities', () => {
    const entities = [entity('عميل', '1101', 'عميل')];
    assert.deepEqual(getLinkedAnalyticEntities(undefined, entities), []);
    assert.deepEqual(getLinkedAnalyticEntities(subAccount('عام'), entities), []);
  });
});