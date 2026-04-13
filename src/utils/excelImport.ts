import * as XLSX from '@datalens-tech/xlsx';

export interface ExcelImportResult<T> {
  data: T[];
  errors: string[];
  successCount: number;
}

export function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Skip first row (header) and return data from second row
        const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));
        resolve(dataRows);
      } catch (error) {
        reject(new Error('فشل في قراءة ملف Excel'));
      }
    };
    
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

// Chart of Accounts import mapping
// Columns: اسم المجموعة | رقم الحساب | اسم الحساب | رقم الجوال | العملة | المحافظة
export function mapAccountRow(row: any[]): {
  groupName: string;
  accountNumber: string;
  accountName: string;
  phone: string;
  currency: string;
  governorate: string;
} | null {
  if (!row[0] || !row[2]) return null;
  
  return {
    groupName: String(row[0] || ''),
    accountNumber: String(row[1] || ''),
    accountName: String(row[2] || ''),
    phone: String(row[3] || ''),
    currency: String(row[4] || ''),
    governorate: String(row[5] || ''),
  };
}

// Opening Balance import mapping
// Columns: التاريخ | رمز العملة | اسم المجموعة | رقم الحساب | اسم الحساب | مدين | دائن
export function mapOpeningBalanceRow(row: any[]): {
  date: string;
  currency: string;
  groupName: string;
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
} | null {
  if (!row[4]) return null;
  
  return {
    date: formatDate(row[0]),
    currency: String(row[1] || ''),
    groupName: String(row[2] || ''),
    accountNumber: String(row[3] || ''),
    accountName: String(row[4] || ''),
    debit: parseFloat(row[5]) || 0,
    credit: parseFloat(row[6]) || 0,
  };
}

// Voucher (Receipt/Payment) import mapping
// Columns: رقم السند | التاريخ | اسم المجموعة المدين | رقم الحساب المدين | اسم الحساب المدين | رمز العملة المدين | المبلغ مدين | البيان المدين | رقم المرجع المدين | اسم المجموعة الدائن | رقم الحساب الدائن | اسم الحساب الدائن | رمز العملة الدائن | المبلغ الدائن | البيان الدائن | رقم المرجع الدائن
export function mapVoucherRow(row: any[]): {
  voucherNumber: string;
  date: string;
  debitGroupName: string;
  debitAccountNumber: string;
  debitAccountName: string;
  debitCurrency: string;
  debitAmount: number;
  debitDescription: string;
  debitReference: string;
  creditGroupName: string;
  creditAccountNumber: string;
  creditAccountName: string;
  creditCurrency: string;
  creditAmount: number;
  creditDescription: string;
  creditReference: string;
} | null {
  if (!row[4] && !row[11]) return null;
  
  return {
    voucherNumber: String(row[0] || ''),
    date: formatDate(row[1]),
    debitGroupName: String(row[2] || ''),
    debitAccountNumber: String(row[3] || ''),
    debitAccountName: String(row[4] || ''),
    debitCurrency: String(row[5] || ''),
    debitAmount: parseFloat(row[6]) || 0,
    debitDescription: String(row[7] || ''),
    debitReference: String(row[8] || ''),
    creditGroupName: String(row[9] || ''),
    creditAccountNumber: String(row[10] || ''),
    creditAccountName: String(row[11] || ''),
    creditCurrency: String(row[12] || ''),
    creditAmount: parseFloat(row[13]) || 0,
    creditDescription: String(row[14] || ''),
    creditReference: String(row[15] || ''),
  };
}

// Sales/Invoice import mapping
// Columns: التاريخ | رقم الفاتورة | النوع | اسم المجموعة | رقم الحساب | اسم الحساب | المبلغ | رمز العملة | رقم المرجع | البيان
export function mapInvoiceRow(row: any[]): {
  date: string;
  invoiceNumber: string;
  type: 'cash' | 'credit';
  groupName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
} | null {
  if (!row[5]) return null;
  
  const typeValue = String(row[2] || 'نقدي').toLowerCase();
  
  return {
    date: formatDate(row[0]),
    invoiceNumber: String(row[1] || ''),
    type: typeValue.includes('آجل') || typeValue.includes('credit') ? 'credit' : 'cash',
    groupName: String(row[3] || ''),
    accountNumber: String(row[4] || ''),
    accountName: String(row[5] || ''),
    amount: parseFloat(row[6]) || 0,
    currency: String(row[7] || ''),
    reference: String(row[8] || ''),
    description: String(row[9] || ''),
  };
}

// Discount import mapping
// Columns: التاريخ | رقم الخصم | النوع | اسم المجموعة | رقم الحساب | اسم الحساب | المبلغ | رمز العملة | رقم المرجع | البيان
export function mapDiscountRow(row: any[]): {
  date: string;
  discountNumber: string;
  type: 'cash' | 'credit';
  groupName: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
} | null {
  if (!row[5]) return null;
  
  const typeValue = String(row[2] || 'نقدي').toLowerCase();
  
  return {
    date: formatDate(row[0]),
    discountNumber: String(row[1] || ''),
    type: typeValue.includes('آجل') || typeValue.includes('credit') ? 'credit' : 'cash',
    groupName: String(row[3] || ''),
    accountNumber: String(row[4] || ''),
    accountName: String(row[5] || ''),
    amount: parseFloat(row[6]) || 0,
    currency: String(row[7] || ''),
    reference: String(row[8] || ''),
    description: String(row[9] || ''),
  };
}

function formatDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // If it's a number (Excel date serial)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  // If it's already a string date
  const dateStr = String(value);
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Try to parse other formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  
  return new Date().toISOString().split('T')[0];
}
