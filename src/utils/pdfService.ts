import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Settings } from '@/types/accounting';

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
        <h1 style="font-size: 18px; font-weight: bold; margin: 2px 0; color: #000000;">${settings.headerArabic[0]}</h1>
        <h2 style="font-size: 14px; color: #1a1a1a; margin: 2px 0;">${settings.headerArabic[1]}</h2>
        <p style="font-size: 12px; color: #333333; margin: 2px 0;">${settings.headerArabic[2]}</p>
      </div>
      ${settings.logo ? `<div style="flex: 0 0 100px; display: flex; justify-content: center; align-items: center;"><img src="${settings.logo}" alt="Logo" style="max-width: 80px; max-height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);" /></div>` : ''}
      <div style="text-align: left; flex: 1; direction: ltr;">
        <h1 style="font-size: 18px; font-weight: bold; margin: 2px 0; color: #000000;">${settings.headerEnglish[0]}</h1>
        <h2 style="font-size: 14px; color: #1a1a1a; margin: 2px 0;">${settings.headerEnglish[1]}</h2>
        <p style="font-size: 12px; color: #333333; margin: 2px 0;">${settings.headerEnglish[2]}</p>
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
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${t.date}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626; font-weight: bold;' : ''}">${t.type}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${stripLeadingZeros(t.documentNumber)}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${t.description}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;">${t.reference || '-'}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold;">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold;">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; color: ${t.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${t.balance.toLocaleString()}</td>
    </tr>
  `).join('');

  const tableHeaderHTML = `
    <tr>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">التاريخ</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">النوع</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">رقم المستند</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">البيان</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">المرجع</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">مدين</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">دائن</th>
      <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">الرصيد</th>
    </tr>
  `;

  // Build rows as individual sections for PDF pagination
  const rowSections = transactions.map((t, i) => `
    <div data-pdf-section="row-${i}" style="width: 100%;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr${t.isPreviousBalance ? ' style="background: #fef3f2;"' : ''}>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${t.date}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626; font-weight: bold;' : ''}">${t.type}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${stripLeadingZeros(t.documentNumber)}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;${t.isPreviousBalance ? ' color: #dc2626;' : ''}">${t.description}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #000;">${t.reference || '-'}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold;">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold;">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
          <td style="padding: 8px; border: 1px solid #000; text-align: center; color: ${t.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${t.balance.toLocaleString()}</td>
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
        <!-- Header Section -->
        <div data-pdf-section="header">
          ${getHeaderHTML(settings)}
          <div style="padding: 15px 25px;">
            <div style="text-align: center; font-size: 22px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 10px; margin-bottom: 15px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);">
              ${title}
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">اسم الحساب:</span>
              <span style="font-weight: bold; font-size: 16px;">${accountName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc;">
              <span style="color: #666; font-size: 14px;">العملة:</span>
              <span style="font-weight: bold; font-size: 16px;">${getCurrencyFullName(currency)}</span>
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
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: #16a34a; font-weight: bold; border-top: 3px solid #0d9488;">${totals.debit.toLocaleString()}</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: #dc2626; font-weight: bold; border-top: 3px solid #0d9488;">${totals.credit.toLocaleString()}</td>
              <td style="padding: 10px 8px; border: 1px solid #000; text-align: center; color: ${totals.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; border-top: 3px solid #0d9488;">${totals.balance.toLocaleString()}</td>
            </tr>
          </table>
        </div>
        
        <!-- Balance Section -->
        <div data-pdf-section="balance" style="padding: 10px 25px;">
          <div style="padding: 15px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
              ${balanceLabel}: ${absBalance.toLocaleString()} ${getCurrencyFullName(currency)}
            </span>
          </div>
          <div style="padding: 15px; background: #f8fafc; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
            <span style="font-size: 16px; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
              ${balanceLabel}: ${numberToArabicWords(absBalance)} ${getCurrencyFullName(currency)}
            </span>
          </div>
        </div>
        
        ${settings.footerNote ? `
        <div data-pdf-section="footer-note" style="padding: 0 25px;">
          <div style="text-align: center; padding: 12px; margin: 10px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${settings.footerNote}</span>
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
  
  const currencyTables = currencyData.map(cd => {
    const isDebit = cd.totalBalance >= 0;
    const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
    const absBalance = Math.abs(cd.totalBalance);
    
    const accountRows = cd.accounts.map(acc => `
      <tr>
        <td style="padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: center; color: #000;">${acc.accountNumber}</td>
        <td style="padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: right; color: #000;">${acc.accountName}</td>
        <td style="padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: center; color: #16a34a; font-weight: bold;">${acc.totalDebit > 0 ? acc.totalDebit.toLocaleString() : '-'}</td>
        <td style="padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: center; color: #dc2626; font-weight: bold;">${acc.totalCredit > 0 ? acc.totalCredit.toLocaleString() : '-'}</td>
        <td style="padding: 10px 8px; border: 1px solid #000; font-size: 12px; text-align: center; color: ${acc.balance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">${acc.balance.toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom: 30px;">
        <h3 style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 10px 15px; border-radius: 8px; margin-bottom: 10px;">
          العملة: ${cd.currency}
        </h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">رقم الحساب</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">اسم الحساب</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">مدين</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">دائن</th>
              <th style="background: #87CEEB; color: #000; padding: 12px 8px; font-size: 13px; text-align: center; border: 1px solid #000; font-weight: bold;">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            ${accountRows}
            <tr style="background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); font-weight: bold; font-size: 14px;">
              <td colspan="2" style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; border-top: 3px solid #0d9488;">الإجمالي</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: #16a34a; font-weight: bold; border-top: 3px solid #0d9488;">${cd.totalDebit.toLocaleString()}</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: #dc2626; font-weight: bold; border-top: 3px solid #0d9488;">${cd.totalCredit.toLocaleString()}</td>
              <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; color: ${cd.totalBalance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: bold; border-top: 3px solid #0d9488;">${cd.totalBalance.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- Balance in numbers row -->
        <div style="padding: 15px; background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 10px;">
          <span style="font-size: 16px; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
            ${balanceLabel}: ${absBalance.toLocaleString()} ${getCurrencyFullName(cd.currency)}
          </span>
        </div>
        
        <!-- Balance in Arabic words row -->
        <div style="padding: 15px; background: #f8fafc; border: 2px solid #0d9488; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 16px; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
            ${balanceLabel}: ${numberToArabicWords(absBalance)} ${getCurrencyFullName(cd.currency)}
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
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', Arial, sans-serif; direction: rtl; background: #fff; padding: 20px; }
        
        /* Print styles for multi-page header repetition */
        @media print {
          .report-header {
            position: running(header);
          }
          thead {
            display: table-header-group;
          }
          @page {
            @top-center {
              content: element(header);
            }
          }
        }
        
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        thead {
          display: table-header-group;
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; border: 2px solid #0d9488; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        ${getHeaderHTML(settings)}
        
        <!-- Content -->
        <div style="padding: 25px;">
          <div style="text-align: center; font-size: 22px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 10px; margin-bottom: 20px; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);">
            ${title}
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ccc;">
            <span style="color: #666; font-size: 14px;">المجموعة:</span>
            <span style="font-weight: bold; font-size: 16px;">${groupName}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ccc; margin-bottom: 20px;">
            <span style="color: #666; font-size: 14px;">الفترة:</span>
            <span style="font-weight: bold; font-size: 16px;">من ${dateFrom} إلى ${dateTo}</span>
          </div>
          
          ${currencyData.length > 0 ? currencyTables : `
          <div style="text-align: center; padding: 40px; color: #666;">
            لا توجد حسابات لهذه المجموعة
          </div>
          `}
          
          ${settings.footerNote ? `
          <div style="text-align: center; padding: 12px; margin: 15px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <span style="font-size: 13px; color: #333; font-weight: 500;">${settings.footerNote}</span>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="display: flex; justify-content: space-between; padding: 20px; border-top: 2px solid #eee; margin-top: 20px;">
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المدير</div>
            </div>
            <div style="text-align: center; width: 45%;">
              <div style="border-top: 2px solid #333; margin-top: 50px; padding-top: 10px; font-size: 14px; color: #666;">توقيع المحاسب</div>
            </div>
          </div>
          
          <div style="text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Shared PDF generation logic using section-based rendering
async function generateSectionBasedPDF(htmlContent: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '800px';
  iframe.style.height = '10000px';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }
  
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const borderRadius = 3;
  const usableWidth = pdfWidth - (margin * 2);
  const usableHeight = pdfHeight - (margin * 2);
  const SECTION_GAP = 1;
  
  const drawPageBorder = () => {
    pdf.setDrawColor(13, 148, 136);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(margin, margin, usableWidth, usableHeight, borderRadius, borderRadius);
  };

  const captureSection = async (el: HTMLElement) => {
    return await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
  };

  const headerEl = iframeDoc.querySelector('[data-pdf-section="header"]') as HTMLElement;
  const tableHeaderEl = iframeDoc.querySelector('[data-pdf-section="table-header"]') as HTMLElement;
  
  const headerCanvas = headerEl ? await captureSection(headerEl) : null;
  const tableHeaderCanvas = tableHeaderEl ? await captureSection(tableHeaderEl) : null;
  
  const allSections = Array.from(iframeDoc.querySelectorAll('[data-pdf-section]')) as HTMLElement[];
  
  const sectionCanvases: Array<{name: string; canvas: HTMLCanvasElement}> = [];
  for (const section of allSections) {
    const name = section.getAttribute('data-pdf-section') || '';
    if (name === 'header' || name === 'table-header') continue;
    const canvas = await captureSection(section);
    sectionCanvases.push({ name, canvas });
  }
  
  document.body.removeChild(iframe);
  
  const getImgDims = (canvas: HTMLCanvasElement) => {
    const scale = (usableWidth - 4) / (canvas.width / 2);
    return { width: usableWidth - 4, height: (canvas.height / 2) * scale };
  };
  
  const headerDims = headerCanvas ? getImgDims(headerCanvas) : null;
  const tableHeaderDims = tableHeaderCanvas ? getImgDims(tableHeaderCanvas) : null;
  
  let currentY = margin + 2;
  let pageNum = 0;
  
  const startNewPage = (includeRepeatable: boolean) => {
    if (pageNum > 0) pdf.addPage();
    pageNum++;
    drawPageBorder();
    currentY = margin + 2;
    
    if (includeRepeatable && headerCanvas && headerDims) {
      pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', margin + 2, currentY, headerDims.width, headerDims.height);
      currentY += headerDims.height + SECTION_GAP;
    }
    if (includeRepeatable && tableHeaderCanvas && tableHeaderDims) {
      pdf.addImage(tableHeaderCanvas.toDataURL('image/png'), 'PNG', margin + 2, currentY, tableHeaderDims.width, tableHeaderDims.height);
      currentY += tableHeaderDims.height + SECTION_GAP;
    }
  };
  
  // First page
  startNewPage(false);
  
  if (headerCanvas && headerDims) {
    pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', margin + 2, currentY, headerDims.width, headerDims.height);
    currentY += headerDims.height + SECTION_GAP;
  }
  
  if (tableHeaderCanvas && tableHeaderDims) {
    pdf.addImage(tableHeaderCanvas.toDataURL('image/png'), 'PNG', margin + 2, currentY, tableHeaderDims.width, tableHeaderDims.height);
    currentY += tableHeaderDims.height + SECTION_GAP;
  }
  
  for (const { name, canvas } of sectionCanvases) {
    const dims = getImgDims(canvas);
    const remainingSpace = (margin + usableHeight) - currentY;
    const isRow = name.startsWith('row-');
    
    if (dims.height > remainingSpace) {
      startNewPage(isRow);
    }
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + 2, currentY, dims.width, dims.height);
    currentY += dims.height;
    if (!isRow) currentY += SECTION_GAP;
  }
  
  return pdf.output('blob');
}

export async function generateReportPDF(data: ReportPDFData): Promise<Blob> {
  const htmlContent = getReportHTML(data);
  return generateSectionBasedPDF(htmlContent);
}

export async function generateSummaryReportPDF(data: SummaryPDFData): Promise<Blob> {
  const htmlContent = getSummaryReportHTML(data);
  return generateSectionBasedPDF(htmlContent);
}
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }
  
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
  
  // Wait for fonts to load
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Capture the header separately for repetition
  const headerElement = iframeDoc.querySelector('.report-header');
  let headerCanvas: HTMLCanvasElement | null = null;
  
  if (headerElement) {
    headerCanvas = await html2canvas(headerElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
  }
  
  const contentElement = iframeDoc.body;
  const canvas = await html2canvas(contentElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  });
  
  document.body.removeChild(iframe);
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // Page margin
  const borderRadius = 3;
  const usableWidth = pdfWidth - (margin * 2);
  const usableHeight = pdfHeight - (margin * 2);
  
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = usableWidth / (imgWidth / 2); // Scale to fit usable width
  
  // Calculate header height in PDF units
  const headerPdfHeight = headerCanvas ? (headerCanvas.height * ratio) / 2 : 0;
  const headerImgData = headerCanvas ? headerCanvas.toDataURL('image/png') : null;
  
  const imgData = canvas.toDataURL('image/png');
  
  // Calculate content height per page (excluding header on subsequent pages)
  const firstPageContentHeight = usableHeight;
  const subsequentPageContentHeight = usableHeight - headerPdfHeight - 5;
  
  // Calculate total scaled height of content
  const totalScaledHeight = (imgHeight * ratio) / 2;
  
  // Calculate number of pages needed
  let remainingHeight = totalScaledHeight;
  let pageCount = 1;
  remainingHeight -= firstPageContentHeight;
  while (remainingHeight > 0) {
    pageCount++;
    remainingHeight -= subsequentPageContentHeight;
  }
  
  // Draw page border function
  const drawPageBorder = (pdfDoc: jsPDF) => {
    pdfDoc.setDrawColor(13, 148, 136); // Teal color
    pdfDoc.setLineWidth(0.8);
    pdfDoc.roundedRect(margin, margin, usableWidth, usableHeight, borderRadius, borderRadius);
  };
  
  // Generate each page
  let currentYOffset = 0;
  
  for (let i = 0; i < pageCount; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    
    // Draw page border
    drawPageBorder(pdf);
    
    const contentStartY = margin + 2;
    
    if (i === 0) {
      // First page - show content from the beginning
      pdf.addImage(
        imgData, 
        'PNG', 
        margin + 2, 
        contentStartY, 
        usableWidth - 4, 
        (imgHeight * ratio) / 2
      );
      currentYOffset = firstPageContentHeight;
    } else {
      // Subsequent pages - add header first, then content
      if (headerImgData && headerCanvas) {
        const headerWidth = usableWidth - 4;
        pdf.addImage(headerImgData, 'PNG', margin + 2, contentStartY, headerWidth, headerPdfHeight);
      }
      
      // Calculate where to clip from the source image
      const sourceYStart = currentYOffset * 2 / ratio;
      
      // Create a temporary canvas to clip the portion we need
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const clipHeight = Math.min(subsequentPageContentHeight * 2 / ratio, imgHeight - sourceYStart);
        tempCanvas.width = imgWidth;
        tempCanvas.height = clipHeight;
        tempCtx.drawImage(
          canvas, 
          0, sourceYStart, imgWidth, clipHeight,
          0, 0, imgWidth, clipHeight
        );
        
        const clippedImgData = tempCanvas.toDataURL('image/png');
        const clippedHeight = (clipHeight * ratio) / 2;
        
        pdf.addImage(
          clippedImgData, 
          'PNG', 
          margin + 2, 
          contentStartY + headerPdfHeight + 3, 
          usableWidth - 4, 
          clippedHeight
        );
      }
      
      currentYOffset += subsequentPageContentHeight;
    }
  }
  
  return pdf.output('blob');
}

export async function generateSummaryReportPDF(data: SummaryPDFData): Promise<Blob> {
  const htmlContent = getSummaryReportHTML(data);
  
  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '800px';
  iframe.style.height = '10000px';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document');
  }
  
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
  
  // Wait for fonts to load
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Capture the header separately for repetition
  const headerElement = iframeDoc.querySelector('.report-header');
  let headerCanvas: HTMLCanvasElement | null = null;
  
  if (headerElement) {
    headerCanvas = await html2canvas(headerElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });
  }
  
  const contentElement = iframeDoc.body;
  const canvas = await html2canvas(contentElement, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  });
  
  document.body.removeChild(iframe);
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // Page margin
  const borderRadius = 3;
  const usableWidth = pdfWidth - (margin * 2);
  const usableHeight = pdfHeight - (margin * 2);
  
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = usableWidth / (imgWidth / 2); // Scale to fit usable width
  
  // Calculate header height in PDF units
  const headerPdfHeight = headerCanvas ? (headerCanvas.height * ratio) / 2 : 0;
  const headerImgData = headerCanvas ? headerCanvas.toDataURL('image/png') : null;
  
  const imgData = canvas.toDataURL('image/png');
  
  // Calculate content height per page (excluding header on subsequent pages)
  const firstPageContentHeight = usableHeight;
  const subsequentPageContentHeight = usableHeight - headerPdfHeight - 5;
  
  // Calculate total scaled height of content
  const totalScaledHeight = (imgHeight * ratio) / 2;
  
  // Calculate number of pages needed
  let remainingHeight = totalScaledHeight;
  let pageCount = 1;
  remainingHeight -= firstPageContentHeight;
  while (remainingHeight > 0) {
    pageCount++;
    remainingHeight -= subsequentPageContentHeight;
  }
  
  // Draw page border function
  const drawPageBorder = (pdfDoc: jsPDF) => {
    pdfDoc.setDrawColor(13, 148, 136); // Teal color
    pdfDoc.setLineWidth(0.8);
    pdfDoc.roundedRect(margin, margin, usableWidth, usableHeight, borderRadius, borderRadius);
  };
  
  // Generate each page
  let currentYOffset = 0;
  
  for (let i = 0; i < pageCount; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    
    // Draw page border
    drawPageBorder(pdf);
    
    const contentStartY = margin + 2;
    
    if (i === 0) {
      // First page - show content from the beginning
      pdf.addImage(
        imgData, 
        'PNG', 
        margin + 2, 
        contentStartY, 
        usableWidth - 4, 
        (imgHeight * ratio) / 2
      );
      currentYOffset = firstPageContentHeight;
    } else {
      // Subsequent pages - add header first, then content
      if (headerImgData && headerCanvas) {
        const headerWidth = usableWidth - 4;
        pdf.addImage(headerImgData, 'PNG', margin + 2, contentStartY, headerWidth, headerPdfHeight);
      }
      
      // Calculate where to clip from the source image
      const sourceYStart = currentYOffset * 2 / ratio;
      
      // Create a temporary canvas to clip the portion we need
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const clipHeight = Math.min(subsequentPageContentHeight * 2 / ratio, imgHeight - sourceYStart);
        tempCanvas.width = imgWidth;
        tempCanvas.height = clipHeight;
        tempCtx.drawImage(
          canvas, 
          0, sourceYStart, imgWidth, clipHeight,
          0, 0, imgWidth, clipHeight
        );
        
        const clippedImgData = tempCanvas.toDataURL('image/png');
        const clippedHeight = (clipHeight * ratio) / 2;
        
        pdf.addImage(
          clippedImgData, 
          'PNG', 
          margin + 2, 
          contentStartY + headerPdfHeight + 3, 
          usableWidth - 4, 
          clippedHeight
        );
      }
      
      currentYOffset += subsequentPageContentHeight;
    }
  }
  
  return pdf.output('blob');
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
