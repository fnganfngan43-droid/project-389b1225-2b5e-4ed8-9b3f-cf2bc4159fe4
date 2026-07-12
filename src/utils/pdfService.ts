import { generatePdfBlobFromHtml } from './pdfMakeService';
import { Settings } from '@/types/accounting';
import { e, escapeUrl } from './htmlEscape';

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

interface ReportPDFData {
  title: string;
  accountName: string;
  currency: string;
  transactions: Array<{
    date: string;
    type: string;
    documentNumber?: string;
    description: string;
    reference?: string;
    debit: number;
    credit: number;
    balance: number;
    isPreviousBalance?: boolean;
  }>;
  settings: Settings;
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
}

interface SummaryPDFData {
  title: string;
  groupName: string;
  dateFrom: string;
  dateTo: string;
  currencyData: Array<{
    currency: string;
    accounts: Array<{
      accountName: string;
      accountNumber: string;
      totalDebit: number;
      totalCredit: number;
      balance: number;
    }>;
    totalDebit: number;
    totalCredit: number;
    totalBalance: number;
  }>;
  settings: Settings;
}

// Generate header HTML for multi-page support
const getHeaderHTML = (settings: Settings): string => {
  return `
    <div class="report-header" style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center;">
      <div style="text-align: right; flex: 1;">
        <h1 style="font-size: 18px; font-weight: bold; margin: 2px 0; color: #000000;">${e(settings.headerArabic[0])}</h1>
        <h2 style="font-size: 14px; color: #1a1a1a; margin: 2px 0;">${e(settings.headerArabic[1])}</h2>
        <p style="font-size: 12px; color: #333333; margin: 2px 0;">${e(settings.headerArabic[2])}</p>
      </div>
      ${settings.logo ? `<div style="flex: 0 0 100px; display: flex; justify-content: center; align-items: center;"><img src="${escapeUrl(settings.logo)}" alt="Logo" style="max-width: 80px; max-height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);" /></div>` : ''}
      <div style="text-align: left; flex: 1; direction: ltr;">
        <h1 style="font-size: 18px; font-weight: bold; margin: 2px 0; color: #000000;">${e(settings.headerEnglish[0])}</h1>
        <h2 style="font-size: 14px; color: #1a1a1a; margin: 2px 0;">${e(settings.headerEnglish[1])}</h2>
        <p style="font-size: 12px; color: #333333; margin: 2px 0;">${e(settings.headerEnglish[2])}</p>
      </div>
    </div>
  `;
};

const getReportHTML = (data: ReportPDFData): string => {
  const { title, accountName, currency, transactions, settings, totals } = data;
  
  const isDebit = totals.balance >= 0;
  const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
  const absBalance = Math.abs(totals.balance);

  const stripLeadingZeros = (str?: string) => {
    if (!str || str === '-') return '-';
    return str.replace(/^0+/, '') || '0';
  };
  
  const transactionsRows = transactions.map(t => `
    <tr${t.isPreviousBalance ? ' style="background: #fef3f2;"' : ''}>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(t.date)}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626; font-weight: bold;' : ''}">${e(t.type)}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(stripLeadingZeros(t.documentNumber))}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; font-size: 13px; color: #000000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(t.description)}</td>

      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;">${e(t.reference || '-')}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold;">${t.debit > 0 ? e(t.debit.toLocaleString()) : '-'}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold;">${t.credit > 0 ? e(t.credit.toLocaleString()) : '-'}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: ${t.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${e(t.balance.toLocaleString())}</td>
    </tr>
  `).join('');

  const tableHeaderHTML = `
    <tr>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">التاريخ</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">النوع</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">رقم المستند</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">البيان</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">المرجع</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">مدين</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">دائن</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">الرصيد</th>
    </tr>
  `;

  // Build rows as individual sections for PDF pagination
  const rowSections = transactions.map((t, i) => `
    <div data-pdf-section="row-${i}" style="width: 100%;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr${t.isPreviousBalance ? ' style="background: #fef3f2;"' : ''}>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(t.date)}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626; font-weight: bold;' : ''}">${e(t.type)}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(stripLeadingZeros(t.documentNumber))}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; font-size: 13px; color: #000000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${e(t.description)}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;">${e(t.reference || '-')}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold;">${t.debit > 0 ? e(t.debit.toLocaleString()) : '-'}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold;">${t.credit > 0 ? e(t.credit.toLocaleString()) : '-'}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: ${t.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${e(t.balance.toLocaleString())}</td>
        </tr>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; padding: 20px; }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header Section -->
        <div data-pdf-section="header">
          ${getHeaderHTML(settings)}
          <div style="padding: 15px 25px;">
            <div style="text-align: center; font-size: 22px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 10px; margin-bottom: 15px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);">
              ${e(title)}
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">اسم الحساب:</span>
              <span style="font-weight: bold; font-size: 16px;">${e(accountName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">العملة:</span>
              <span style="font-weight: bold; font-size: 16px;">${e(getCurrencyFullName(currency))}</span>
            </div>
          </div>
        </div>
        
        <!-- Table Header Section (repeatable) -->
        <div data-pdf-section="table-header" style="width: 100%; padding: 0 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${tableHeaderHTML}
          </table>
        </div>
        
        <!-- Table Rows -->
        <div style="padding: 0 25px;">
          ${rowSections}
        </div>
        
        <!-- Totals Section -->
        <div data-pdf-section="totals" style="padding: 0 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); font-weight: bold; font-size: 14px;">
              <td colspan="5" style="padding: 10px 8px; border: 1px solid #000; text-align: center; border-top: 3px solid #0d9488;">الإجمالي</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold; border-top: 3px solid #0d9488;">${e(totals.debit.toLocaleString())}</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold; border-top: 3px solid #0d9488;">${e(totals.credit.toLocaleString())}</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: ${totals.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; border-top: 3px solid #0d9488;">${e(totals.balance.toLocaleString())}</td>
            </tr>
          </table>
        </div>
        
        <!-- Balance Section -->
        <div data-pdf-section="balance" style="padding: 10px 25px;">
          <div style="padding: 15px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
            <span style="font-size: 14px; font-weight: bold; color: #000000;">
              ${e(balanceLabel)}: ${e(absBalance.toLocaleString())} ${e(getCurrencyFullName(currency))}
            </span>
          </div>
          <div style="padding: 15px; background: #f8fafc; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
            <span style="font-size: 14px; font-weight: bold; color: #000000;">
              ${e(balanceLabel)}: ${e(numberToArabicWords(absBalance))} ${e(getCurrencyFullName(currency))}
            </span>
          </div>
        </div>
        
        ${settings.footerNote ? `
        <div data-pdf-section="footer-note" style="padding: 0 25px;">
          <div style="text-align: center; padding: 12px; margin: 10px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
          </div>
        </div>
        ` : ''}
        
        <!-- Signatures -->
        <div data-pdf-section="signatures" style="padding: 0 25px;">
          <div style="display: flex; justify-content: space-between; padding: 20px; border-top: 2px solid #eee; margin-top: 15px;">
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المدير</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المحاسب</div>
            </div>
          </div>
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getSummaryReportHTML = (data: SummaryPDFData): string => {
  const { title, groupName, dateFrom, dateTo, currencyData, settings } = data;
  
  const currencySections = currencyData.map((cd, ci) => {
    const isDebit = cd.totalBalance >= 0;
    const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
    const absBalance = Math.abs(cd.totalBalance);
    
    const accountRowSections = cd.accounts.map((acc, ai) => `
      <div data-pdf-section="row-${ci}-${ai}" style="width: 100%;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000;">${e(acc.accountNumber)}</td>
            <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: right; color: #000;">${e(acc.accountName)}</td>
            <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000000; font-weight: bold;">${acc.totalDebit > 0 ? e(acc.totalDebit.toLocaleString()) : '-'}</td>
            <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000000; font-weight: bold;">${acc.totalCredit > 0 ? e(acc.totalCredit.toLocaleString()) : '-'}</td>
            <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000000; font-weight: bold;">${e(acc.balance.toLocaleString())}</td>
          </tr>
        </table>
      </div>
    `).join('');

    return `
      <div data-pdf-section="currency-title-${ci}" style="padding: 0 25px;">
        <h3 style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 10px 15px; border-radius: 8px; margin-bottom: 5px;">
          العملة: ${e(cd.currency)}
        </h3>
      </div>
      
      <div data-pdf-section="table-header" style="width: 100%; padding: 0 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">رقم الحساب</th>
            <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">اسم الحساب</th>
            <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">مدين</th>
            <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">دائن</th>
            <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">الرصيد</th>
          </tr>
        </table>
      </div>
      
      <div style="padding: 0 25px;">
        ${accountRowSections}
      </div>
      
      <div data-pdf-section="totals-${ci}" style="padding: 0 25px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); font-weight: bold; font-size: 14px;">
            <td colspan="2" style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; border-top: 3px solid #0d9488;">الإجمالي</td>
            <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: #16a34a; font-weight: bold; border-top: 3px solid #0d9488;">${e(cd.totalDebit.toLocaleString())}</td>
            <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: #dc2626; font-weight: bold; border-top: 3px solid #0d9488;">${e(cd.totalCredit.toLocaleString())}</td>
            <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: ${cd.totalBalance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; border-top: 3px solid #0d9488;">${e(cd.totalBalance.toLocaleString())}</td>
          </tr>
        </table>
      </div>
      
      <div data-pdf-section="balance-${ci}" style="padding: 10px 25px;">
        <div style="padding: 15px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
          <span style="font-size: 14px; font-weight: bold; color: #000000;">
            ${e(balanceLabel)}: ${e(absBalance.toLocaleString())} ${e(getCurrencyFullName(cd.currency))}
          </span>
        </div>
        <div style="padding: 15px; background: #f8fafc; border: 2px solid #0d9488; border-radius: 8px; text-align: center;">
          <span style="font-size: 14px; font-weight: bold; color: #000000;">
            ${e(balanceLabel)}: ${e(numberToArabicWords(absBalance))} ${e(getCurrencyFullName(cd.currency))}
          </span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; padding: 20px; }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto;">
        <!-- Header Section -->
        <div data-pdf-section="header">
          ${getHeaderHTML(settings)}
          <div style="padding: 15px 25px;">
            <div style="text-align: center; font-size: 22px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 10px; margin-bottom: 15px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);">
              ${e(title)}
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">المجموعة:</span>
              <span style="font-weight: bold; font-size: 16px;">${e(groupName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">الفترة:</span>
              <span style="font-weight: bold; font-size: 16px;">من ${e(dateFrom)} إلى ${e(dateTo)}</span>
            </div>
          </div>
        </div>
        
        ${currencyData.length > 0 ? currencySections : `
        <div data-pdf-section="empty" style="text-align: center; padding: 40px; color: #666;">
          لا توجد حسابات لهذه المجموعة
        </div>
        `}
        
        ${settings.footerNote ? `
        <div data-pdf-section="footer-note" style="padding: 0 25px;">
          <div style="text-align: center; padding: 12px; margin: 10px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
          </div>
        </div>
        ` : ''}
        
        <div data-pdf-section="signatures" style="padding: 0 25px;">
          <div style="display: flex; justify-content: space-between; padding: 20px; border-top: 2px solid #eee; margin-top: 15px;">
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المدير</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المحاسب</div>
            </div>
          </div>
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// pdfmake-based PDF generation (WebView-compatible: no html2canvas/window.print).
async function generateSectionBasedPDF(htmlContent: string): Promise<Blob> {
  return generatePdfBlobFromHtml(htmlContent, { title: 'تقرير' });
}

export async function generateReportPDF(data: ReportPDFData): Promise<Blob> {
  const htmlContent = getReportHTML(data);
  return generateSectionBasedPDF(htmlContent);
}

export async function generateSummaryReportPDF(data: SummaryPDFData): Promise<Blob> {
  const htmlContent = getSummaryReportHTML(data);
  return generateSectionBasedPDF(htmlContent);
}

interface ReconciliationPDFData {
  title: string;
  groupName: string;
  currencyName?: string;
  dateFrom: string;
  dateTo: string;
  rows: Array<{
    accountNumber: string;
    accountName: string;
    currency: string;
    amount: number;
    toDate: string;
  }>;
  totalAmount: number;
  settings: Settings;
}

const getReconciliationReportHTML = (data: ReconciliationPDFData): string => {
  const { title, groupName, currencyName, dateFrom, dateTo, rows, totalAmount, settings } = data;

  const rowSections = rows.map((r, i) => `
    <div data-pdf-section="row-${i}" style="width: 100%;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000;">${e(r.accountNumber || '-')}</td>
          <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: right; color: #000;">${e(r.accountName)}</td>
          <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000;">${e(r.currency)}</td>
          <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000000; font-weight: bold;">${e(r.amount.toLocaleString())}</td>
          <td style="padding: 10px 8px; border: 1px solid #000; font-size: 13px; text-align: center; color: #000;">${e(r.toDate)}</td>
        </tr>
      </table>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; padding: 20px; }
        table { border-collapse: collapse; }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto;">
        <div data-pdf-section="header">
          ${getHeaderHTML(settings)}
          <div style="padding: 15px 25px;">
            <div style="text-align: center; font-size: 22px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 10px; margin-bottom: 15px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);">
              ${e(title)}
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">المجموعة:</span>
              <span style="font-weight: bold; font-size: 16px;">${e(groupName)}</span>
            </div>
            ${currencyName ? `
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">العملة:</span>
              <span style="font-weight: bold; font-size: 16px;">${e(currencyName)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">الفترة:</span>
              <span style="font-weight: bold; font-size: 16px;">من ${e(dateFrom)} إلى ${e(dateTo)}</span>
            </div>
          </div>
        </div>

        <div data-pdf-section="table-header" style="width: 100%; padding: 0 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">رقم الحساب</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">اسم الحساب</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">العملة</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">المبلغ</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 14px; text-align: center; border: 1px solid #000; font-weight: bold;">إلى تاريخ</th>
            </tr>
          </table>
        </div>

        <div style="padding: 0 25px;">
          ${rowSections}
        </div>

        <div data-pdf-section="totals" style="padding: 0 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); font-weight: bold; font-size: 14px;">
              <td colspan="3" style="padding: 10px 8px; border: 1px solid #000; text-align: center; border-top: 3px solid #0d9488;">الإجمالي</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: ${totalAmount >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; border-top: 3px solid #0d9488;">${e(totalAmount.toLocaleString())}</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; border-top: 3px solid #0d9488;"></td>
            </tr>
          </table>
        </div>

        ${settings.footerNote ? `
        <div data-pdf-section="footer-note" style="padding: 0 25px;">
          <div style="text-align: center; padding: 12px; margin: 10px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
          </div>
        </div>
        ` : ''}

        <div data-pdf-section="signatures" style="padding: 0 25px;">
          <div style="display: flex; justify-content: space-between; padding: 20px; border-top: 2px solid #eee; margin-top: 15px;">
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المدير</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المحاسب</div>
            </div>
          </div>
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function generateReconciliationReportPDF(data: ReconciliationPDFData): Promise<Blob> {
  const htmlContent = getReconciliationReportHTML(data);
  return generateSectionBasedPDF(htmlContent);
}

export async function sharePDFViaWhatsApp(pdfBlob: Blob, filename: string): Promise<void> {
  // Create a file from the blob
  const file = new File([pdfBlob], filename, { type: 'application/pdf' });
  
  // Check if Web Share API is available and supports file sharing
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: filename,
        text: 'تقرير محاسبي',
      });
      return;
    } catch (error) {
      console.log('Web Share API failed, falling back to download');
    }
  }
  
  // Fallback: Download the PDF and open WhatsApp with a message
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Open WhatsApp with a message indicating PDF was downloaded
  const message = encodeURIComponent('تم تحميل التقرير كملف PDF. يرجى إرفاقه يدوياً.');
  window.open(`https://wa.me/?text=${message}`, '_blank');
}
