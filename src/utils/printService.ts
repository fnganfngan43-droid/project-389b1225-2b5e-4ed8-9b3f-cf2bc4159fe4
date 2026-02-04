import { Voucher, Settings } from '@/types/accounting';

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

interface PrintVoucherData {
  voucher: Voucher;
  settings: Settings;
}

interface PrintReportData {
  title: string;
  accountName: string;
  currency: string;
  transactions: Array<{
    date: string;
    type: string;
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

interface PrintSummaryReportData {
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

const getCommonStyles = () => `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Tajawal', 'Arial', sans-serif;
    direction: rtl;
    background: #fff;
    color: #1a1a1a;
    padding: 15px;
  }
  .page-border {
    border: 3px solid #0d9488;
    border-radius: 16px;
    padding: 10px;
    background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%);
    box-shadow: 0 4px 20px rgba(13, 148, 136, 0.15);
  }
  .print-container {
    max-width: 800px;
    margin: 0 auto;
    border: 2px solid #0d9488;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
  }
  .header {
    background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-right {
    text-align: right;
    flex: 1;
  }
  .header-center {
    flex: 0 0 100px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .header-center img {
    max-width: 80px;
    max-height: 80px;
    object-fit: contain;
  }
  .header-left {
    text-align: left;
    flex: 1;
    direction: ltr;
  }
  .header h1, .header h2, .header p {
    margin: 2px 0;
  }
  .header h1 {
    font-size: 18px;
    font-weight: bold;
  }
  .header h2 {
    font-size: 14px;
    opacity: 0.9;
  }
  .header p {
    font-size: 12px;
    opacity: 0.8;
  }
  .content {
    padding: 25px;
  }
  .voucher-type {
    text-align: center;
    font-size: 22px;
    font-weight: bold;
    color: #0d9488;
    border: 2px solid #0d9488;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
  }
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px dashed #ccc;
  }
  .info-row:last-child {
    border-bottom: none;
  }
  .info-label {
    color: #666;
    font-size: 14px;
  }
  .info-value {
    font-weight: bold;
    font-size: 16px;
  }
  .amount-box {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
    border: 2px solid #0d9488;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    margin: 20px 0;
  }
  .amount-label {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
  }
  .amount-value {
    font-size: 32px;
    font-weight: bold;
    color: #0d9488;
  }
  .amount-currency {
    font-size: 18px;
    color: #666;
    margin-top: 5px;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    padding: 20px;
    border-top: 2px solid #eee;
    margin-top: 20px;
  }
  .signature-box {
    text-align: center;
    width: 45%;
  }
  .signature-line {
    border-top: 2px solid #333;
    margin-top: 50px;
    padding-top: 10px;
    font-size: 14px;
    color: #666;
  }
  .print-date {
    text-align: center;
    font-size: 12px;
    color: #999;
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #eee;
  }
  
  /* Report specific styles */
  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  }
  .report-table th {
    background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
    color: white;
    padding: 12px 8px;
    font-size: 13px;
    text-align: center;
    border: 1px solid #0d9488;
  }
  .report-table td {
    padding: 10px 8px;
    border: 1px solid #ddd;
    font-size: 12px;
    text-align: center;
  }
  .report-table tr:nth-child(even) {
    background: #f9fafb;
  }
  .report-table tr:hover {
    background: #f0fdfa;
  }
  .report-table .debit {
    color: #16a34a;
    font-weight: bold;
  }
  .report-table .credit {
    color: #dc2626;
    font-weight: bold;
  }
  .report-table .balance-positive {
    color: #16a34a;
    font-weight: bold;
  }
  .report-table .balance-negative {
    color: #dc2626;
    font-weight: bold;
  }
  .previous-balance-row {
    background: #fef3f2 !important;
  }
  .previous-balance-row td {
    color: #dc2626;
  }
  .totals-row {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important;
    font-weight: bold;
    font-size: 14px !important;
  }
  .totals-row td {
    border-top: 3px solid #0d9488 !important;
  }
  .summary-box {
    display: flex;
    justify-content: space-around;
    background: #f8fafc;
    border-radius: 12px;
    padding: 20px;
    margin: 20px 0;
    border: 1px solid #e2e8f0;
  }
  .summary-item {
    text-align: center;
  }
  .summary-label {
    font-size: 14px;
    color: #666;
    margin-bottom: 5px;
  }
  .summary-value {
    font-size: 20px;
    font-weight: bold;
  }
  .summary-value.debit { color: #16a34a; }
  .summary-value.credit { color: #dc2626; }
  .summary-value.balance { color: #0d9488; }
  
  @media print {
    body { padding: 10px; }
    .page-border { 
      border: 2px solid #0d9488; 
      box-shadow: none;
      padding: 8px;
    }
    .print-container { border: 1px solid #0d9488; }
    @page { margin: 8mm; }
  }
`;

export function printVoucher({ voucher, settings }: PrintVoucherData) {
  const voucherTypeName = voucher.type === 'receipt' ? 'سند قبض' : 'سند صرف';
  const amountLabel = voucher.type === 'receipt' ? 'المبلغ المستلم' : 'المبلغ المصروف';
  
  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${voucherTypeName} - ${voucher.voucherNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>${getCommonStyles()}</style>
    </head>
    <body>
      <div class="page-border">
      <div class="print-container">
        <div class="header">
          <div class="header-right">
            <h1>${settings.headerArabic[0]}</h1>
            <h2>${settings.headerArabic[1]}</h2>
            <p>${settings.headerArabic[2]}</p>
          </div>
          <div class="header-center">
            ${settings.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
          </div>
          <div class="header-left">
            <h1>${settings.headerEnglish[0]}</h1>
            <h2>${settings.headerEnglish[1]}</h2>
            <p>${settings.headerEnglish[2]}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="voucher-type">${voucherTypeName}</div>
          
          <div class="info-row">
            <span class="info-label">رقم السند:</span>
            <span class="info-value">#${voucher.voucherNumber}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${voucher.date}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">اسم الحساب:</span>
            <span class="info-value">${voucher.accountName}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">المجموعة:</span>
            <span class="info-value">${voucher.groupName}</span>
          </div>
          
          ${voucher.reference ? `
          <div class="info-row">
            <span class="info-label">رقم المرجع:</span>
            <span class="info-value">${voucher.reference}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="info-label">البيان:</span>
            <span class="info-value">${voucher.description}</span>
          </div>
          
          <div class="amount-box">
            <div class="amount-label">${amountLabel}</div>
            <div class="amount-value">${voucher.amount.toLocaleString()}</div>
            <div class="amount-currency">${voucher.currency}</div>
          </div>
          
          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">توقيع المستلم</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">توقيع المحاسب</div>
            </div>
          </div>
          
          <div class="print-date">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

export function printReport({ title, accountName, currency, transactions, settings, totals }: PrintReportData) {
  const isDebit = totals.balance >= 0;
  const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
  const absBalance = Math.abs(totals.balance);

  const transactionsRows = transactions.map(t => `
    <tr${t.isPreviousBalance ? ' class="previous-balance-row"' : ''}>
      <td>${t.date}</td>
      <td${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.type}</td>
      <td${t.isPreviousBalance ? ' style="color: #dc2626;"' : ''}>${t.description}</td>
      <td>${t.reference || '-'}</td>
      <td class="debit"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
      <td class="credit"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
      <td class="${t.balance >= 0 ? 'balance-positive' : 'balance-negative'}"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.balance.toLocaleString()}</td>
    </tr>
  `).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${accountName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        .balance-row {
          padding: 15px;
          border: 2px solid #0d9488;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 10px;
        }
        .balance-row.numbers {
          background: #f0fdfa;
        }
        .balance-row.words {
          background: #f8fafc;
        }
        .balance-text {
          font-size: 16px;
          font-weight: bold;
        }
        .balance-text.debit { color: #16a34a; }
        .balance-text.credit { color: #dc2626; }
      </style>
    </head>
    <body>
      <div class="page-border">
      <div class="print-container">
        <div class="header">
          <div class="header-right">
            <h1>${settings.headerArabic[0]}</h1>
            <h2>${settings.headerArabic[1]}</h2>
            <p>${settings.headerArabic[2]}</p>
          </div>
          <div class="header-center">
            ${settings.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
          </div>
          <div class="header-left">
            <h1>${settings.headerEnglish[0]}</h1>
            <h2>${settings.headerEnglish[1]}</h2>
            <p>${settings.headerEnglish[2]}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="voucher-type">${title}</div>
          
          <div class="info-row">
            <span class="info-label">اسم الحساب:</span>
            <span class="info-value">${accountName}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">العملة:</span>
            <span class="info-value">${getCurrencyFullName(currency)}</span>
          </div>
          
          ${transactions.length > 0 ? `
          <table class="report-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>البيان</th>
                <th>المرجع</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsRows}
              <tr class="totals-row">
                <td colspan="4">الإجمالي</td>
                <td class="debit">${totals.debit.toLocaleString()}</td>
                <td class="credit">${totals.credit.toLocaleString()}</td>
                <td class="${totals.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${totals.balance.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <!-- Balance in numbers row -->
          <div class="balance-row numbers">
            <span class="balance-text ${isDebit ? 'debit' : 'credit'}">
              ${balanceLabel}: ${absBalance.toLocaleString()} ${getCurrencyFullName(currency)}
            </span>
          </div>
          
          <!-- Balance in Arabic words row -->
          <div class="balance-row words">
            <span class="balance-text ${isDebit ? 'debit' : 'credit'}">
              ${balanceLabel}: ${numberToArabicWords(absBalance)} ${getCurrencyFullName(currency)}
            </span>
          </div>
          ` : `
          <div style="text-align: center; padding: 40px; color: #666;">
            لا توجد معاملات لهذا الحساب
          </div>
          `}
          
          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">توقيع المدير</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">توقيع المحاسب</div>
            </div>
          </div>
          
          <div class="print-date">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

export function printSummaryReport({ title, groupName, dateFrom, dateTo, currencyData, settings }: PrintSummaryReportData) {
  // Build all account rows across all currencies for the table
  const allAccountRows: string[] = [];
  
  currencyData.forEach(cd => {
    cd.accounts.forEach(acc => {
      allAccountRows.push(`
        <tr>
          <td>${acc.accountNumber}</td>
          <td style="text-align: right;">${acc.accountName}</td>
          <td style="text-align: center;">${cd.currency}</td>
          <td class="debit">${acc.totalDebit > 0 ? acc.totalDebit.toLocaleString() : '-'}</td>
          <td class="credit">${acc.totalCredit > 0 ? acc.totalCredit.toLocaleString() : '-'}</td>
          <td class="${acc.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${acc.balance.toLocaleString()}</td>
        </tr>
      `);
    });
  });

  // Build totals and balance summary for each currency
  const currencySummaries = currencyData.map(cd => {
    const isDebit = cd.totalBalance >= 0;
    const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
    const absBalance = Math.abs(cd.totalBalance);

    return `
      <tr class="totals-row">
        <td colspan="3">إجمالي ${getCurrencyFullName(cd.currency)}</td>
        <td class="debit">${cd.totalDebit.toLocaleString()}</td>
        <td class="credit">${cd.totalCredit.toLocaleString()}</td>
        <td class="${cd.totalBalance >= 0 ? 'balance-positive' : 'balance-negative'}">${cd.totalBalance.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="6" style="background: #f0fdfa; text-align: center; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
          ${balanceLabel}: ${absBalance.toLocaleString()} ${getCurrencyFullName(cd.currency)}
        </td>
      </tr>
      <tr>
        <td colspan="6" style="background: #f8fafc; text-align: center; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
          ${balanceLabel}: ${numberToArabicWords(absBalance)} ${getCurrencyFullName(cd.currency)}
        </td>
      </tr>
    `;
  }).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - ${groupName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        
        /* Multi-page print styles */
        @media print {
          body { 
            padding: 0; 
            margin: 0;
          }
          .page-border { 
            border: none; 
            box-shadow: none;
            padding: 0;
            background: none;
          }
          .print-container { 
            border: none;
            box-shadow: none;
          }
          
          /* Page setup */
          @page { 
            size: A4;
            margin: 10mm;
          }
          
          /* Repeat header on every page */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          
          /* Page border decoration */
          .print-page {
            border: 3px solid #0d9488;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          
          /* Avoid breaking inside rows */
          tr { page-break-inside: avoid; }
          
          /* Page number footer */
          .page-footer {
            position: fixed;
            bottom: 5mm;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        }
        
        /* Screen styles for page numbers */
        .page-number-container {
          display: none;
        }
        
        @media print {
          .page-number-container {
            display: block;
            position: running(pageNumber);
          }
        }
        
        /* Report table with repeated header */
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .report-table th {
          background: linear-gradient(135deg, #0d9488 0%, #115e59 100%);
          color: white;
          padding: 10px 6px;
          font-size: 12px;
          text-align: center;
          border: 1px solid #0d9488;
        }
        .report-table td {
          padding: 8px 6px;
          border: 1px solid #ddd;
          font-size: 11px;
          text-align: center;
        }
        .report-table tr:nth-child(even) {
          background: #f9fafb;
        }
        .report-table .debit {
          color: #16a34a;
          font-weight: bold;
        }
        .report-table .credit {
          color: #dc2626;
          font-weight: bold;
        }
        .report-table .balance-positive {
          color: #16a34a;
          font-weight: bold;
        }
        .report-table .balance-negative {
          color: #dc2626;
          font-weight: bold;
        }
        .totals-row {
          background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important;
          font-weight: bold;
          font-size: 12px !important;
        }
        .totals-row td {
          border-top: 2px solid #0d9488 !important;
        }
      </style>
    </head>
    <body>
      <div class="page-border">
      <div class="print-container">
        <!-- Main header section that repeats -->
        <div class="header report-header">
          <div class="header-right">
            <h1>${settings.headerArabic[0]}</h1>
            <h2>${settings.headerArabic[1]}</h2>
            <p>${settings.headerArabic[2]}</p>
          </div>
          <div class="header-center">
            ${settings.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
          </div>
          <div class="header-left">
            <h1>${settings.headerEnglish[0]}</h1>
            <h2>${settings.headerEnglish[1]}</h2>
            <p>${settings.headerEnglish[2]}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="voucher-type">${title}</div>
          
          <div class="info-row">
            <span class="info-label">المجموعة:</span>
            <span class="info-value">${groupName}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">الفترة:</span>
            <span class="info-value">من ${dateFrom} إلى ${dateTo}</span>
          </div>
          
          ${currencyData.length > 0 ? `
          <table class="report-table">
            <thead>
              <tr>
                <th>رقم الحساب</th>
                <th>اسم الحساب</th>
                <th>العملة</th>
                <th>مدين</th>
                <th>دائن</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              ${allAccountRows.join('')}
              ${currencySummaries}
            </tbody>
          </table>
          ` : `
          <div style="text-align: center; padding: 40px; color: #666;">
            لا توجد حسابات لهذه المجموعة
          </div>
          `}
          
          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">توقيع المدير</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">توقيع المحاسب</div>
            </div>
          </div>
          
          <div class="print-date">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}
          </div>
        </div>
      </div>
      </div>
      
      <script>
        // Add page numbers dynamically before printing
        window.onbeforeprint = function() {
          // The browser will handle page breaks and thead repetition automatically
        };
        
        window.onafterprint = function() {
          // Clean up if needed
        };
      </script>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

function openPrintWindow(content: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then add page numbers and print
    setTimeout(() => {
      // Inject page numbering CSS that works across browsers
      const style = printWindow.document.createElement('style');
      style.textContent = `
        @media print {
          @page {
            size: A4;
            margin: 12mm 10mm 20mm 10mm;
            
            @bottom-center {
              content: counter(page) " / " counter(pages);
              font-family: 'Tajawal', Arial, sans-serif;
              font-size: 11px;
              color: #666;
            }
          }
          
          /* Page border for each printed page */
          html {
            height: 100%;
          }
          
          body {
            border: 3px solid #0d9488;
            border-radius: 8px;
            padding: 10px;
            min-height: calc(100% - 6px);
            box-sizing: border-box;
          }
          
          /* Ensure tables don't break awkwardly */
          tr {
            page-break-inside: avoid;
          }
          
          /* thead repeats on each page */
          thead {
            display: table-header-group;
          }
          
          /* Remove empty pages */
          .print-container {
            page-break-after: auto;
          }
        }
      `;
      printWindow.document.head.appendChild(style);
      
      printWindow.print();
    }, 600);
  }
}
