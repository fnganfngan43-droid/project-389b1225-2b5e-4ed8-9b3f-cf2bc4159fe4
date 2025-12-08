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
  accountName: string;
  groupName: string;
  amount: number;
  currency: string;
  reference?: string;
  description: string;
  type: 'receipt' | 'payment';
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

export interface Settings {
  userName: string;
  headerArabic: string[];
  headerEnglish: string[];
  logo?: string;
  footerNote?: string;
}

export type ScreenType = 
  | 'sales' 
  | 'payment' 
  | 'receipt' 
  | 'opening-balance' 
  | 'chart-of-accounts' 
  | 'reports' 
  | 'discount' 
  | 'sales-return'
  | 'currency-exchange';
