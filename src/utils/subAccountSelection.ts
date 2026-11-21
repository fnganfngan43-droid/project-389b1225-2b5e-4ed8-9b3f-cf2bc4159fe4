import type { AnalyticEntity, ChartAccount } from '@/types/accounting';

export function getSubAccounts(accounts: ChartAccount[]): ChartAccount[] {
  return accounts.filter((account) => account.kind === 'فرعي');
}

export function getLinkedAnalyticEntities(
  account: ChartAccount | undefined,
  entities: AnalyticEntity[],
): AnalyticEntity[] {
  if (!account || account.kind !== 'فرعي' || !account.analyticType || account.analyticType === 'عام') return [];
  return entities.filter((entity) =>
    entity.analyticType === account.analyticType &&
    entity.parentAccountNumber === account.accountNumber
  );
}

export function getGeneralAnalyticName(account: ChartAccount | undefined): string {
  if (!account || account.kind !== 'فرعي' || (account.analyticType && account.analyticType !== 'عام')) return '';
  return account.analyticName || '';
}