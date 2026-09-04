export interface Account {
  id: string;
  accountNumber: string;
  accountName: string;
  groupName: string;
  currency: string;
  phone?: string;
  governorate?: string;
  balance: number;
  type: 'debit' | 'credit';
}

export interface AccountGroup {
  id: string;
  name: string;
  initialNumber: string;
}

export interface Currency {
  id: string;
  name: string;
  symbol: string;
}

export interface Governorate {
  id: string;
  name: string;
  city?: string;
}

export interface Voucher {
  id: string;
  voucherNumber: string;
  date: string;
  // Debit side
  debitAccountName: string;
  debitGroupName: string;
  debitAmount: number;
  debitCurrency: string;
  debitReference?: string;
  debitDescription?: string;
  // Credit side
  creditAccountName: string;
  creditGroupName: string;
  creditAmount: number;
  creditCurrency: string;
  creditReference?: string;
  creditDescription?: string;
  // Legacy support
  accountName?: string;
  groupName?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  description?: string;
  type: 'receipt' | 'payment';
}

export interface CurrencyExchange {
  id: string;
  date: string;
  exchangeNumber: string;
  fromAccountName: string;
  fromGroupName: string;
  fromAmount: number;
  fromCurrency: string;
  toAccountName: string;
  toGroupName: string;
  toAmount: number;
  toCurrency: string;
  reference?: string;
  description: string;
}

export interface OpeningBalance {
  id: string;
  date: string;
  accountName: string;
  currency: string;
  debit: number;
  credit: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  accountName: string;
  groupName: string;
  amount: number;
  currency: string;
  type: 'cash' | 'credit';
  reference?: string;
  description: string;
}

export interface DiscountEntry {
  id: string;
  date: string;
  discountNumber: string;
  accountName: string;
  groupName: string;
  amount: number;
  currency: string;
  type: 'cash' | 'credit';
  reference?: string;
  description: string;
}

export interface Settings {
  userName: string;
  headerArabic: string[];
  headerEnglish: string[];
  logo?: string;
  footerNote?: string;
  voucherFooterNote?: string;
}

export interface Reconciliation {
  id: string;
  reconciliationNumber: string;
  groupName: string;
  accountName: string;
  currency: string;
  fromDate: string;
  toDate: string;
  amount: number;
}

export type ScreenType = 
  | 'home'
  | 'purchases'
  | 'inventory'
  | 'sales' 
  | 'payment' 
  | 'receipt' 
  | 'opening-balance' 
  | 'chart-of-accounts' 
  | 'reports' 
  | 'discount' 
  | 'sales-return'
  | 'currency-exchange'
  | 'currency-management'
  | 'governorate-management'
  | 'group-management'
  | 'password-settings'
  | 'invoice-voucher-report'
  | 'reconciliation'
  | 'setup'
  | 'operations';
