import { Voucher, Settings } from '@/types/accounting';

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
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  settings: Settings;
  totals: {
    debit: number;
    credit: number;
    balance: number;
  };
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
    padding: 20px;
  }
  .print-container {
    max-width: 800px;
    margin: 0 auto;
    border: 2px solid #0d9488;
    border-radius: 12px;
    overflow: hidden;
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
    body { padding: 0; }
    .print-container { border: none; }
    @page { margin: 10mm; }
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
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

export function printReport({ title, accountName, currency, transactions, settings, totals }: PrintReportData) {
  const transactionsRows = transactions.map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.type}</td>
      <td>${t.description}</td>
      <td>${t.reference || '-'}</td>
      <td class="debit">${t.debit > 0 ? t.debit.toLocaleString() : '-'}</td>
      <td class="credit">${t.credit > 0 ? t.credit.toLocaleString() : '-'}</td>
      <td class="${t.balance >= 0 ? 'balance-positive' : 'balance-negative'}">${t.balance.toLocaleString()}</td>
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
      <style>${getCommonStyles()}</style>
    </head>
    <body>
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
            <span class="info-value">${currency}</span>
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
          
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">إجمالي المدين</div>
              <div class="summary-value debit">${totals.debit.toLocaleString()} ${currency}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">إجمالي الدائن</div>
              <div class="summary-value credit">${totals.credit.toLocaleString()} ${currency}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">صافي الرصيد</div>
              <div class="summary-value balance">${totals.balance.toLocaleString()} ${currency}</div>
            </div>
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
    </body>
    </html>
  `;

  openPrintWindow(printContent);
}

function openPrintWindow(content: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
