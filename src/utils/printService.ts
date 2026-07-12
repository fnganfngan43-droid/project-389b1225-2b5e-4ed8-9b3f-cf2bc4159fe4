import { Voucher, Settings } from '@/types/accounting';
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
    object-fit: cover;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.5);
  }
  .header-left {
    text-align: left;
    flex: 1;
    direction: ltr;
  }
  .header h1, .header h2, .header p {
    margin: 2px 0;
    color: #000000;
  }
  .header h1 {
    font-size: 18px;
    font-weight: bold;
    color: #000000;
  }
  .header h2 {
    font-size: 14px;
    color: #1a1a1a;
  }
  .header p {
    font-size: 12px;
    color: #333333;
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
    background: #87CEEB !important;
    color: #000000 !important;
    padding: 12px 8px;
    font-size: 14px;
    text-align: center;
    border: 1px solid #000;
    font-weight: bold;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .report-table td {
    padding: 10px 8px;
    border: 1px solid #000;
    font-size: 13px;
    text-align: center;
    color: #000000;
  }
  .report-table tr:nth-child(even) {
    background: #f9fafb;
  }
  .report-table tr:hover {
    background: #f0fdfa;
  }
  .report-table .debit {
    color: #000000;
    font-weight: bold;
  }
  .report-table .credit {
    color: #000000;
    font-weight: bold;
  }
  .report-table .balance-positive {
    color: #000000;
    font-weight: bold;
  }
  .report-table .balance-negative {
    color: #000000;
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
    body { padding: 0; margin: 0; }
    
    @page { 
      size: A4;
      margin: 8mm; 
    }
    
    /* Page border frame - appears on every printed page */
    .page-frame {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 3px solid #0d9488;
      border-radius: 10px;
      pointer-events: none;
      z-index: 9999;
    }
    
    /* Remove outer wrappers so table pagination works */
    .page-border { 
      border: none !important; 
      box-shadow: none !important;
      padding: 0 !important;
      background: none !important;
      border-radius: 0 !important;
    }
    .print-container { 
      border: none !important; 
      border-radius: 0 !important;
      overflow: visible !important;
    }
    
    /* CRITICAL: Repeat outer table header/footer on every page */
    .print-doc { 
      width: 100%; 
      border-collapse: collapse;
    }
    .print-doc > thead { display: table-header-group !important; }
    .print-doc > tfoot { display: table-footer-group !important; }
    
    /* Inner report table header also repeats on every page */
    .report-table { 
      page-break-inside: auto;
    }
    .report-table thead { display: table-header-group !important; }
    
    /* Avoid breaking inside rows */
    tr { page-break-inside: avoid; }
    
    /* Header border in print */
    .report-header-wrapper {
      border: 2px solid #0d9488;
      border-radius: 10px;
      overflow: hidden;
      margin: 4px 8px 3px 8px;
    }
    
    /* Compact header for print to save space */
    .report-header-wrapper .header {
      padding: 10px 15px;
    }
    .report-header-wrapper .header h1 {
      font-size: 14px;
    }
    .report-header-wrapper .header h2 {
      font-size: 11px;
    }
    .report-header-wrapper .header p {
      font-size: 10px;
    }
    .report-header-wrapper .header-center img {
      max-width: 65px;
      max-height: 65px;
    }
    
    /* Report info section - compact */
    .report-info-wrapper {
      margin: 0 8px;
      padding: 3px 10px;
    }
    .report-info-wrapper .voucher-type {
      font-size: 14px !important;
      padding: 5px !important;
      margin-bottom: 5px !important;
    }
    .report-info-wrapper .info-row {
      padding: 3px 0 !important;
    }
    
    /* Footer area for page numbers */
    .page-footer-content {
      text-align: center;
      font-size: 10px;
      color: #666;
      padding: 4px 8px;
      border-top: 1px solid #e2e8f0;
      margin: 0 8px;
    }
  }
`;

const getReportPrintStyles = () => `
  /* Outer document table for thead/tfoot repetition */
  .print-doc {
    width: 100%;
    border-collapse: collapse;
  }
  .print-doc > thead > tr > td,
  .print-doc > tfoot > tr > td,
  .print-doc > tbody > tr > td {
    padding: 0;
    border: none;
    vertical-align: top;
  }
  
  /* Header border styling */
  .report-header-wrapper {
    border: 2px solid #0d9488;
    border-radius: 10px;
    overflow: hidden;
    margin: 5px 0 5px 0;
  }
  .report-header {
    margin: 0;
  }
  
  /* Report info section */
  .report-info-wrapper {
    padding: 5px 15px;
  }
  .report-info-wrapper .voucher-type {
    font-size: 18px;
    padding: 8px;
    margin-bottom: 10px;
  }
  .report-info-wrapper .info-row {
    padding: 6px 0;
  }
  
  /* Footer area */
  .page-footer-content {
    text-align: center;
    font-size: 11px;
    color: #666;
    padding: 6px 0;
    border-top: 1px solid #e2e8f0;
  }
  
  /* Balance rows */
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
  
  /* Report table overrides for multi-page */
  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
  }
  .report-table th {
    background: #87CEEB;
    color: #000000;
    padding: 10px 6px;
    font-size: 13px;
    text-align: center;
    border: 1px solid #000;
    font-weight: bold;
  }
  .report-table td {
    padding: 8px 6px;
    border: 1px solid #000;
    font-size: 13px;
    text-align: center;
    color: #000000;
  }
  .report-table tr:nth-child(even) {
    background: #f9fafb;
  }
  .report-table .debit {
    color: #000000;
    font-weight: bold;
  }
  .report-table .credit {
    color: #000000;
    font-weight: bold;
  }
  .report-table .balance-positive {
    color: #000000;
    font-weight: bold;
  }
  .report-table .balance-negative {
    color: #000000;
    font-weight: bold;
  }
  .totals-row {
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important;
    font-weight: bold;
    font-size: 13px !important;
  }
  .totals-row td {
    border-top: 2px solid #0d9488 !important;
  }
`;

// Build the header HTML block used in thead
const buildHeaderBlock = (settings: Settings) => `
  <div class="report-header-wrapper">
    <div class="header report-header">
      <div class="header-right">
        <h1>${e(settings.headerArabic[0])}</h1>
        <h2>${e(settings.headerArabic[1])}</h2>
        <p>${e(settings.headerArabic[2])}</p>
      </div>
      <div class="header-center">
        ${settings.logo ? `<img src="${escapeUrl(settings.logo)}" alt="Logo" style="border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); object-fit: cover;" />` : ''}
      </div>
      <div class="header-left">
        <h1>${e(settings.headerEnglish[0])}</h1>
        <h2>${e(settings.headerEnglish[1])}</h2>
        <p>${e(settings.headerEnglish[2])}</p>
      </div>
    </div>
  </div>
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
      <title>${e(voucherTypeName)} - ${e(voucher.voucherNumber)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>${getCommonStyles()}</style>
    </head>
    <body>
      <div class="page-border">
      <div class="print-container">
        <div class="header">
          <div class="header-right">
            <h1>${e(settings.headerArabic[0])}</h1>
            <h2>${e(settings.headerArabic[1])}</h2>
            <p>${e(settings.headerArabic[2])}</p>
          </div>
          <div class="header-center">
            ${settings.logo ? `<img src="${escapeUrl(settings.logo)}" alt="Logo" style="border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); object-fit: cover;" />` : ''}
          </div>
          <div class="header-left">
            <h1>${e(settings.headerEnglish[0])}</h1>
            <h2>${e(settings.headerEnglish[1])}</h2>
            <p>${e(settings.headerEnglish[2])}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="voucher-type">${e(voucherTypeName)}</div>
          
          <div class="info-row">
            <span class="info-label">رقم السند:</span>
            <span class="info-value">#${e(voucher.voucherNumber)}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">التاريخ:</span>
            <span class="info-value">${e(voucher.date)}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">اسم الحساب:</span>
            <span class="info-value">${e(voucher.accountName)}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">المجموعة:</span>
            <span class="info-value">${e(voucher.groupName)}</span>
          </div>
          
          ${voucher.reference ? `
          <div class="info-row">
            <span class="info-label">رقم المرجع:</span>
            <span class="info-value">${e(voucher.reference)}</span>
          </div>
          ` : ''}
          
          <div class="info-row">
            <span class="info-label">البيان:</span>
            <span class="info-value">${e(voucher.description)}</span>
          </div>
          
          <div class="amount-box">
            <div class="amount-label">${e(amountLabel)}</div>
            <div class="amount-value">${e(voucher.amount.toLocaleString())}</div>
            <div class="amount-currency">${e(voucher.currency)}</div>
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

  const stripLeadingZeros = (str?: string) => {
    if (!str || str === '-') return '-';
    return str.replace(/^0+/, '') || '0';
  };

  const transactionsRows = transactions.map(t => `
    <tr${t.isPreviousBalance ? ' class="previous-balance-row"' : ''}>
      <td>${e(t.date)}</td>
      <td${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${e(t.type)}</td>
      <td${t.isPreviousBalance ? ' style="color: #dc2626;"' : ''}>${e(stripLeadingZeros(t.documentNumber))}</td>
      <td${t.isPreviousBalance ? ' style="color: #dc2626;"' : ''}>${e(t.description)}</td>
      <td>${e(t.reference || '-')}</td>
      <td class="debit"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.debit > 0 ? e(t.debit.toLocaleString()) : '-'}</td>
      <td class="credit"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${t.credit > 0 ? e(t.credit.toLocaleString()) : '-'}</td>
      <td class="${t.balance >= 0 ? 'balance-positive' : 'balance-negative'}"${t.isPreviousBalance ? ' style="color: #dc2626; font-weight: bold;"' : ''}>${e(t.balance.toLocaleString())}</td>
    </tr>
  `).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${e(title)} - ${e(accountName)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        ${getReportPrintStyles()}
      </style>
    </head>
    <body>
      <!-- Page border frame - fixed position appears on every printed page -->
      <div class="page-frame"></div>
      
      <div class="page-border">
      <div class="print-container">
        <table class="print-doc">
          <!-- THEAD: الترويسة + معلومات التقرير - تتكرر في كل صفحة -->
          <thead>
            <tr>
              <td>
                ${buildHeaderBlock(settings)}
                <div class="report-info-wrapper">
                  <div class="voucher-type">${e(title)}</div>
                  <div class="info-row">
                    <span class="info-label">اسم الحساب:</span>
                    <span class="info-value">${e(accountName)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">العملة:</span>
                    <span class="info-value">${e(getCurrencyFullName(currency))}</span>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          <!-- TFOOT: تذييل الصفحة مع ترقيم - يتكرر في كل صفحة -->
          <tfoot>
            <tr>
              <td>
                <div class="page-footer-content">
                  <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</span>
                  <span style="margin: 0 15px;">|</span>
                  <span class="page-number-text">صفحة <span class="current-page"></span> من <span class="total-pages"></span></span>
                </div>
              </td>
            </tr>
          </tfoot>

          <tbody>
            <tr>
              <td>
                <div class="content" style="padding: 10px 15px;">
                  ${transactions.length > 0 ? `
                    <table class="report-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>النوع</th>
                        <th>رقم المستند</th>
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
                        <td colspan="5">الإجمالي</td>
                        <td class="debit">${e(totals.debit.toLocaleString())}</td>
                        <td class="credit">${e(totals.credit.toLocaleString())}</td>
                        <td class="${totals.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${e(totals.balance.toLocaleString())}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Balance in numbers -->
                  <div class="balance-row numbers">
                    <span class="balance-text ${isDebit ? 'debit' : 'credit'}">
                      ${e(balanceLabel)}: ${e(absBalance.toLocaleString())} ${e(getCurrencyFullName(currency))}
                    </span>
                  </div>

                  <!-- Balance in Arabic words -->
                  <div class="balance-row words">
                    <span class="balance-text ${isDebit ? 'debit' : 'credit'}">
                      ${e(balanceLabel)}: ${e(numberToArabicWords(absBalance))} ${e(getCurrencyFullName(currency))}
                    </span>
                  </div>
                  ` : `
                  <div style="text-align: center; padding: 40px; color: #666;">
                    لا توجد معاملات لهذا الحساب
                  </div>
                  `}

                  ${settings.footerNote ? `
                  <div style="text-align: center; padding: 12px; margin: 15px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
                  </div>
                  ` : ''}

                  <div class="footer">
                    <div class="signature-box">
                      <div class="signature-line">توقيع المدير</div>
                    </div>
                    <div class="signature-box">
                      <div class="signature-line">توقيع المحاسب</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

export function printSummaryReport({ title, groupName, dateFrom, dateTo, currencyData, settings }: PrintSummaryReportData) {
  // Build a separate table for each currency
  const currencyTables = currencyData.map(cd => {
    const isDebit = cd.totalBalance >= 0;
    const balanceLabel = isDebit ? 'عليكم رصيد' : 'لكم رصيد';
    const absBalance = Math.abs(cd.totalBalance);
    const currencyName = getCurrencyFullName(cd.currency);

    const rows = cd.accounts.map(acc => `
      <tr>
        <td>${e(acc.accountNumber)}</td>
        <td style="text-align: right;">${e(acc.accountName)}</td>
        <td style="text-align: center;">${e(cd.currency)}</td>
        <td class="debit">${acc.totalDebit > 0 ? e(acc.totalDebit.toLocaleString()) : '-'}</td>
        <td class="credit">${acc.totalCredit > 0 ? e(acc.totalCredit.toLocaleString()) : '-'}</td>
        <td class="${acc.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${e(acc.balance.toLocaleString())}</td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom: 20px;">
        <div style="background: #87CEEB; text-align: center; font-weight: bold; padding: 8px; border: 1px solid #000; font-size: 14px;">
          ${e(currencyName)}
        </div>
        <table class="report-table" style="margin-top: 0;">
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
            ${rows}
            <tr class="totals-row">
              <td colspan="3">إجمالي ${e(currencyName)}</td>
              <td class="debit">${e(cd.totalDebit.toLocaleString())}</td>
              <td class="credit">${e(cd.totalCredit.toLocaleString())}</td>
              <td class="${cd.totalBalance >= 0 ? 'balance-positive' : 'balance-negative'}">${e(cd.totalBalance.toLocaleString())}</td>
            </tr>
            <tr>
              <td colspan="6" style="background: #f0fdfa; text-align: center; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
                ${e(balanceLabel)}: ${e(absBalance.toLocaleString())} ${e(currencyName)}
              </td>
            </tr>
            <tr>
              <td colspan="6" style="background: #f8fafc; text-align: center; font-weight: bold; color: ${isDebit ? '#16a34a' : '#dc2626'};">
                ${e(balanceLabel)}: ${e(numberToArabicWords(absBalance))} ${e(currencyName)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${e(title)} - ${e(groupName)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        ${getReportPrintStyles()}
      </style>
    </head>
    <body>
      <div class="page-frame"></div>
      <div class="page-border">
      <div class="print-container">
        <table class="print-doc">
          <thead>
            <tr>
              <td>
                ${buildHeaderBlock(settings)}
                <div class="report-info-wrapper">
                  <div class="voucher-type">${e(title)}</div>
                  <div class="info-row">
                    <span class="info-label">المجموعة:</span>
                    <span class="info-value">${e(groupName)}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">الفترة:</span>
                    <span class="info-value">من ${e(dateFrom)} إلى ${e(dateTo)}</span>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td>
                <div class="page-footer-content">
                  <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</span>
                  <span style="margin: 0 15px;">|</span>
                  <span class="page-number-text">صفحة <span class="current-page"></span> من <span class="total-pages"></span></span>
                </div>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                <div class="content" style="padding: 10px 15px;">
                  ${currencyData.length > 0 ? currencyTables : `
                  <div style="text-align: center; padding: 40px; color: #666;">
                    لا توجد حسابات لهذه المجموعة
                  </div>
                  `}

                  ${settings.footerNote ? `
                  <div style="text-align: center; padding: 12px; margin: 15px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
                  </div>
                  ` : ''}

                  <div class="footer">
                    <div class="signature-box">
                      <div class="signature-line">توقيع المدير</div>
                    </div>
                    <div class="signature-box">
                      <div class="signature-line">توقيع المحاسب</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

export interface PrintReconciliationReportData {
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

export function printReconciliationReport({
  title,
  groupName,
  currencyName,
  dateFrom,
  dateTo,
  rows,
  totalAmount,
  settings,
}: PrintReconciliationReportData) {
  const rowsHTML = rows.map(r => `
    <tr>
      <td>${e(r.accountNumber || '-')}</td>
      <td style="text-align: right;">${e(r.accountName)}</td>
      <td style="text-align: center;">${e(r.currency)}</td>
      <td class="${r.amount >= 0 ? 'debit' : 'credit'}">${e(r.amount.toLocaleString())}</td>
      <td style="text-align: center;">${e(r.toDate)}</td>
    </tr>
  `).join('');

  const printContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${e(title)} - ${e(groupName)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        ${getCommonStyles()}
        ${getReportPrintStyles()}
      </style>
    </head>
    <body>
      <div class="page-frame"></div>
      <div class="page-border">
      <div class="print-container">
        <table class="print-doc">
          <thead>
            <tr>
              <td>
                ${buildHeaderBlock(settings)}
                <div class="report-info-wrapper">
                  <div class="voucher-type">${e(title)}</div>
                  <div class="info-row">
                    <span class="info-label">المجموعة:</span>
                    <span class="info-value">${e(groupName)}</span>
                  </div>
                  ${currencyName ? `
                  <div class="info-row">
                    <span class="info-label">العملة:</span>
                    <span class="info-value">${e(currencyName)}</span>
                  </div>
                  ` : ''}
                  <div class="info-row">
                    <span class="info-label">الفترة:</span>
                    <span class="info-value">من ${e(dateFrom)} إلى ${e(dateTo)}</span>
                  </div>
                </div>
              </td>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td>
                <div class="page-footer-content">
                  <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</span>
                  <span style="margin: 0 15px;">|</span>
                  <span class="page-number-text">صفحة <span class="current-page"></span> من <span class="total-pages"></span></span>
                </div>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr>
              <td>
                <div class="content" style="padding: 10px 15px;">
                  ${rows.length > 0 ? `
                  <table class="report-table">
                    <thead>
                      <tr>
                        <th>رقم الحساب</th>
                        <th>اسم الحساب</th>
                        <th>العملة</th>
                        <th>المبلغ</th>
                        <th>إلى تاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHTML}
                      <tr class="totals-row">
                        <td colspan="3">الإجمالي</td>
                        <td class="${totalAmount >= 0 ? 'debit' : 'credit'}">${e(totalAmount.toLocaleString())}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                  ` : `
                  <div style="text-align: center; padding: 40px; color: #666;">
                    لا توجد مطابقات لهذه المجموعة
                  </div>
                  `}

                  ${settings.footerNote ? `
                  <div style="text-align: center; padding: 12px; margin: 15px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <span style="font-size: 13px; color: #333; font-weight: 500;">${e(settings.footerNote)}</span>
                  </div>
                  ` : ''}

                  <div class="footer">
                    <div class="signature-box">
                      <div class="signature-line">توقيع المدير</div>
                    </div>
                    <div class="signature-box">
                      <div class="signature-line">توقيع المحاسب</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </div>
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

async function openPrintWindow(content: string) {
  const { printHTML } = await import('./webviewPrint');
  printHTML(content, (doc) => {
    injectPageNumbers({ document: doc } as unknown as Window);
  });
}

/**
 * Calculate the approximate number of pages and inject page numbers
 * into all .total-pages and .current-page elements
 */
function injectPageNumbers(win: Window) {
  try {
    const doc = win.document;
    const body = doc.body;
    
    // A4 printable height at 96 DPI with 10mm margins ≈ 1047px
    // Subtract some for header/footer repetition
    const A4_HEIGHT_PX = 1047;
    const contentHeight = body.scrollHeight;
    const totalPages = Math.max(1, Math.ceil(contentHeight / A4_HEIGHT_PX));
    
    // Set total pages in all footer instances
    const totalEls = doc.querySelectorAll('.total-pages');
    totalEls.forEach(el => {
      el.textContent = String(totalPages);
    });
    
    // For the current page, we set 1 as default (browser handles actual pagination)
    // In tfoot repetition, each page gets the same tfoot content
    const currentEls = doc.querySelectorAll('.current-page');
    currentEls.forEach((el, index) => {
      el.textContent = String(index + 1 || 1);
    });
    
    // If we can't detect individual pages, at least show total
    if (currentEls.length <= 1) {
      currentEls.forEach(el => {
        el.textContent = '1';
      });
    }
  } catch (e) {
    // Silently fail - page numbers are non-critical
    console.warn('Could not inject page numbers:', e);
  }
}
