import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Account, 
  AccountGroup, 
  Currency, 
  Governorate, 
  Voucher, 
  OpeningBalance,
  Invoice,
  Settings 
} from '@/types/accounting';

interface AccountingContextType {
  // User & Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;

  // Accounts
  accounts: Account[];
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Groups
  groups: AccountGroup[];
  addGroup: (group: Omit<AccountGroup, 'id'>) => void;
  updateGroup: (id: string, group: Partial<AccountGroup>) => void;
  deleteGroup: (id: string) => void;

  // Currencies
  currencies: Currency[];
  addCurrency: (currency: Omit<Currency, 'id'>) => void;
  updateCurrency: (id: string, currency: Partial<Currency>) => void;
  deleteCurrency: (id: string) => void;

  // Governorates
  governorates: Governorate[];
  addGovernorate: (gov: Omit<Governorate, 'id'>) => void;

  // Vouchers
  vouchers: Voucher[];
  addVoucher: (voucher: Omit<Voucher, 'id'>) => void;
  updateVoucher: (id: string, voucher: Partial<Voucher>) => void;
  deleteVoucher: (id: string) => void;

  // Opening Balances
  openingBalances: OpeningBalance[];
  addOpeningBalance: (balance: Omit<OpeningBalance, 'id'>) => void;

  // Invoices
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial demo data
const initialGroups: AccountGroup[] = [
  { id: '1', name: 'العملاء', initialNumber: '21000' },
  { id: '2', name: 'الموردين', initialNumber: '22000' },
  { id: '3', name: 'البنوك', initialNumber: '11000' },
  { id: '4', name: 'الصندوق', initialNumber: '12000' },
  { id: '5', name: 'المصروفات', initialNumber: '41000' },
];

const initialCurrencies: Currency[] = [
  { id: '1', name: 'ريال يمني', symbol: 'ر.ي' },
  { id: '2', name: 'دولار أمريكي', symbol: '$' },
  { id: '3', name: 'ريال سعودي', symbol: 'ر.س' },
];

const initialGovernorates: Governorate[] = [
  { id: '1', name: 'صنعاء', city: 'صنعاء' },
  { id: '2', name: 'عدن', city: 'عدن' },
  { id: '3', name: 'تعز', city: 'تعز' },
];

const initialAccounts: Account[] = [
  { id: '1', accountNumber: '21001', accountName: 'محل الأمانة', groupName: 'العملاء', currency: 'ر.ي', balance: 150000, type: 'debit' },
  { id: '2', accountNumber: '21002', accountName: 'مؤسسة النور', groupName: 'العملاء', currency: 'ر.ي', balance: 85000, type: 'debit' },
  { id: '3', accountNumber: '22001', accountName: 'شركة السلام', groupName: 'الموردين', currency: 'ر.ي', balance: 200000, type: 'credit' },
  { id: '4', accountNumber: '11001', accountName: 'بنك اليمن', groupName: 'البنوك', currency: 'ر.ي', balance: 500000, type: 'debit' },
  { id: '5', accountNumber: '12001', accountName: 'الصندوق الرئيسي', groupName: 'الصندوق', currency: 'ر.ي', balance: 75000, type: 'debit' },
];

export function AccountingProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    userName: 'المستخدم',
    headerArabic: ['رفيق المحاسب', 'برنامج محاسبي متكامل', 'إدارة الحسابات بسهولة'],
    headerEnglish: ['Accountant Companion', 'Integrated Accounting System', 'Easy Account Management'],
  });

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [groups, setGroups] = useState<AccountGroup[]>(initialGroups);
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);
  const [governorates, setGovernorates] = useState<Governorate[]>(initialGovernorates);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const value: AccountingContextType = {
    settings,
    updateSettings: (newSettings) => setSettings(prev => ({ ...prev, ...newSettings })),
    isLoggedIn,
    login: () => setIsLoggedIn(true),
    logout: () => setIsLoggedIn(false),

    accounts,
    addAccount: (account) => setAccounts(prev => [...prev, { ...account, id: generateId() }]),
    updateAccount: (id, account) => setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...account } : a)),
    deleteAccount: (id) => setAccounts(prev => prev.filter(a => a.id !== id)),

    groups,
    addGroup: (group) => setGroups(prev => [...prev, { ...group, id: generateId() }]),
    updateGroup: (id, group) => setGroups(prev => prev.map(g => g.id === id ? { ...g, ...group } : g)),
    deleteGroup: (id) => setGroups(prev => prev.filter(g => g.id !== id)),

    currencies,
    addCurrency: (currency) => setCurrencies(prev => [...prev, { ...currency, id: generateId() }]),
    updateCurrency: (id, currency) => setCurrencies(prev => prev.map(c => c.id === id ? { ...c, ...currency } : c)),
    deleteCurrency: (id) => setCurrencies(prev => prev.filter(c => c.id !== id)),

    governorates,
    addGovernorate: (gov) => setGovernorates(prev => [...prev, { ...gov, id: generateId() }]),

    vouchers,
    addVoucher: (voucher) => setVouchers(prev => [...prev, { ...voucher, id: generateId() }]),
    updateVoucher: (id, voucher) => setVouchers(prev => prev.map(v => v.id === id ? { ...v, ...voucher } : v)),
    deleteVoucher: (id) => setVouchers(prev => prev.filter(v => v.id !== id)),

    openingBalances,
    addOpeningBalance: (balance) => setOpeningBalances(prev => [...prev, { ...balance, id: generateId() }]),

    invoices,
    addInvoice: (invoice) => setInvoices(prev => [...prev, { ...invoice, id: generateId() }]),
    updateInvoice: (id, invoice) => setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...invoice } : i)),
    deleteInvoice: (id) => setInvoices(prev => prev.filter(i => i.id !== id)),
  };

  return (
    <AccountingContext.Provider value={value}>
      {children}
    </AccountingContext.Provider>
  );
}

export function useAccounting() {
  const context = useContext(AccountingContext);
  if (!context) {
    throw new Error('useAccounting must be used within an AccountingProvider');
  }
  return context;
}
