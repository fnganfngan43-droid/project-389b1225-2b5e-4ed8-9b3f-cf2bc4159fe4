import * as XLSX from '@datalens-tech/xlsx';
import { smartDownload } from '@/utils/webviewPrint';
import { Settings } from '@/types/accounting';

// Convert currency symbol to full name
const getCurrencyFullName = (symbol: string): string => {
  const currencyMap: { [key: string]: string } = {
    'ر.س': 'ريال سعودي',
    'ر.ي': 'ريال يمني',
    '$': 'دولار أمريكي',
    '€': 'يورو',
    '£': 'جنيه إسترليني',
    'د.إ': 'درهم إماراتي',
    'د.ك': 'دينار كويتي',
    'ر.ع': 'ريال عماني',
    'ر.ق': 'ريال قطري',
    'د.ب': 'دينار بحريني',
    'ج.م': 'جنيه مصري',
    'د.ج': 'دينار جزائري',
    'د.ل': 'دينار ليبي',
    'د.ت': 'دينار تونسي',
    'د.م': 'درهم مغربي',
  };
  return currencyMap[symbol] || symbol;
};

// Convert number to Arabic words
const numberToArabicWords = (num: number): string => {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  const absNum = Math.abs(Math.floor(num));
  
  if (absNum < 20) return ones[absNum];
  
  if (absNum < 100) {
    const ten = Math.floor(absNum / 10);
    const one = absNum % 10;
    if (one === 0) return tens[ten];
    return ones[one] + ' و' + tens[ten];
  }
  
  if (absNum < 1000) {
    const hundred = Math.floor(absNum / 100);
    const remainder = absNum % 100;
    if (remainder === 0) return hundreds[hundred];
    return hundreds[hundred] + ' و' + numberToArabicWords(remainder);
  }
  
  if (absNum < 1000000) {
    const thousand = Math.floor(absNum / 1000);
    const remainder = absNum % 1000;
    let result = '';
    if (thousand === 1) result = 'ألف';
    else if (thousand === 2) result = 'ألفان';
    else if (thousand >= 3 && thousand <= 10) result = numberToArabicWords(thousand) + ' آلاف';
    else result = numberToArabicWords(thousand) + ' ألف';
    
    if (remainder === 0) return result;
    return result + ' و' + numberToArabicWords(remainder);
  }
  
  if (absNum < 1000000000) {
    const million = Math.floor(absNum / 1000000);
    const remainder = absNum % 1000000;
    let result = '';
    if (million === 1) result = 'مليون';
    else if (million === 2) result = 'مليونان';
    else if (million >= 3 && million <= 10) result = numberToArabicWords(million) + ' ملايين';
    else result = numberToArabicWords(million) + ' مليون';
    
    if (remainder === 0) return result;
    return result + ' و' + numberToArabicWords(remainder);
  }
  
  return absNum.toLocaleString('ar-EG');
};

interface AnalyticalTransaction {
  date: string;
  type: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface AnalyticalReportData {
  title: string;
  accountName: string;
  currency: string;
  dateFrom: string;
  dateTo: string;
  transactions: AnalyticalTransaction[];
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
  settings: Settings;
}

interface SummaryAccount {
  accountName: string;
  accountNumber: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface SummaryCurrencyData {
  currency: string;
  accounts: SummaryAccount[];
  totalDebit: number;
  totalCredit: number;
  totalBalance: number;
}

interface SummaryReportData {
  title: string;
  groupName: string;
  dateFrom: string;
  dateTo: string;
  currencyData: SummaryCurrencyData[];
  settings: Settings;
}

export function exportAnalyticalReportToExcel(data: AnalyticalReportData): void {
  const { title, accountName, currency, dateFrom, dateTo, transactions, totals, settings } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Build data array (RTL - columns from right to left)
  const wsData: any[][] = [];
  
  // Header rows
  wsData.push([settings.headerArabic[0] || 'رفيق المحاسب']);
  wsData.push([settings.headerArabic[1] || '']);
  wsData.push([settings.headerArabic[2] || '']);
  wsData.push([]);
  wsData.push([title]);
  wsData.push([]);
  wsData.push([`اسم الحساب: ${accountName}`]);
  wsData.push([`العملة: ${getCurrencyFullName(currency)}`]);
  wsData.push([`من تاريخ: ${dateFrom}`, '', `إلى تاريخ: ${dateTo}`]);
  wsData.push([]);
  
  // Table header (RTL order - from right to left)
  wsData.push(['الرصيد', 'دائن', 'مدين', 'المرجع', 'البيان', 'نوع العملية', 'التاريخ', 'م']);
  
  // Table data (RTL order)
  transactions.forEach((t, index) => {
    wsData.push([
      t.balance,
      t.credit || '',
      t.debit || '',
      t.reference || '',
      t.description,
      t.type,
      t.date,
      index + 1
    ]);
  });
  
  // Totals row
  wsData.push([]);
  wsData.push([totals.balance, totals.credit, totals.debit, 'المجموع', '', '', '', '']);
  
  // Balance in words
  wsData.push([]);
  const balanceType = totals.balance >= 0 ? 'مدين' : 'دائن';
  wsData.push([`الرصيد بالأحرف: ${numberToArabicWords(Math.abs(totals.balance))} ${getCurrencyFullName(currency)} (${balanceType})`]);
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set RTL direction for the sheet
  if (!ws['!sheetViews']) ws['!sheetViews'] = [{}];
  ws['!sheetViews'][0].rightToLeft = true;
  
  // Set column widths (RTL order)
  ws['!cols'] = [
    { wch: 15 },  // الرصيد
    { wch: 15 },  // دائن
    { wch: 15 },  // مدين
    { wch: 15 },  // المرجع
    { wch: 30 },  // البيان
    { wch: 15 },  // نوع العملية
    { wch: 12 },  // التاريخ
    { wch: 5 },   // م
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'كشف تحليلي');
  
  // Set workbook to RTL
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [{}];
  wb.Workbook.Views[0].RTL = true;
  
  // Generate filename
  const filename = `كشف_تحليلي_${accountName}_${currency}_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, filename);
}

export function exportSummaryReportToExcel(data: SummaryReportData): void {
  const { title, groupName, dateFrom, dateTo, currencyData, settings } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Build data array (RTL - columns from right to left)
  const wsData: any[][] = [];
  
  // Header rows
  wsData.push([settings.headerArabic[0] || 'رفيق المحاسب']);
  wsData.push([settings.headerArabic[1] || '']);
  wsData.push([settings.headerArabic[2] || '']);
  wsData.push([]);
  wsData.push([title]);
  wsData.push([]);
  wsData.push([`المجموعة: ${groupName}`]);
  wsData.push([`من تاريخ: ${dateFrom}`, '', `إلى تاريخ: ${dateTo}`]);
  wsData.push([]);
  
  // For each currency
  currencyData.forEach((currData, currIndex) => {
    if (currIndex > 0) {
      wsData.push([]);
      wsData.push([]);
    }
    
    wsData.push([`العملة: ${getCurrencyFullName(currData.currency)}`]);
    wsData.push([]);
    
    // Table header (RTL order - from right to left)
    wsData.push(['الرصيد', 'دائن', 'مدين', 'اسم الحساب', 'رقم الحساب', 'م']);
    
    // Table data (RTL order)
    currData.accounts.forEach((acc, index) => {
      wsData.push([
        acc.balance,
        acc.totalCredit || '',
        acc.totalDebit || '',
        acc.accountName,
        acc.accountNumber,
        index + 1
      ]);
    });
    
    // Totals row
    wsData.push([]);
    wsData.push([currData.totalBalance, currData.totalCredit, currData.totalDebit, 'المجموع', '', '']);
    
    // Balance in words
    wsData.push([]);
    const balanceType = currData.totalBalance >= 0 ? 'مدين' : 'دائن';
    wsData.push([`الرصيد بالأحرف: ${numberToArabicWords(Math.abs(currData.totalBalance))} ${getCurrencyFullName(currData.currency)} (${balanceType})`]);
  });
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set RTL direction for the sheet
  if (!ws['!sheetViews']) ws['!sheetViews'] = [{}];
  ws['!sheetViews'][0].rightToLeft = true;
  
  // Set column widths (RTL order)
  ws['!cols'] = [
    { wch: 15 },  // الرصيد
    { wch: 15 },  // دائن
    { wch: 15 },  // مدين
    { wch: 30 },  // اسم الحساب
    { wch: 15 },  // رقم الحساب
    { wch: 5 },   // م
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'كشف إجمالي');
  
  // Set workbook to RTL
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [{}];
  wb.Workbook.Views[0].RTL = true;
  
  // Generate filename
  const filename = `كشف_إجمالي_${groupName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Download file
  XLSX.writeFile(wb, filename);
}
