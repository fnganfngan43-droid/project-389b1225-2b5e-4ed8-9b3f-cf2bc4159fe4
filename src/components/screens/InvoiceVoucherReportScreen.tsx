import { useState, useMemo } from 'react';
import { format, startOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccounting } from '@/contexts/AccountingContext';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Eye, Printer, Search, FileDown } from 'lucide-react';
import { toast } from 'sonner';

type OperationType = 'invoices' | 'returns' | 'receipts' | 'payments' | 'opening' | 'exchange' | 'discount';

const getFirstDayOfYear = () => format(startOfYear(new Date()), 'yyyy-MM-dd');
const getToday = () => format(new Date(), 'yyyy-MM-dd');

export function InvoiceVoucherReportScreen() {
  const { invoices, vouchers, currencies, settings, groups, accounts, openingBalances, currencyExchanges, discounts } = useAccounting();

  const [operationType, setOperationType] = useState<OperationType>('invoices');
  const [dateFrom, setDateFrom] = useState(getFirstDayOfYear());
  const [dateTo, setDateTo] = useState(getToday());
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [numberFrom, setNumberFrom] = useState('');
  const [numberTo, setNumberTo] = useState('');
  const [showReport, setShowReport] = useState(false);

  const filteredAccountsForSelect = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all') return accounts;
    return accounts.filter(a => a.groupName === selectedGroup);
  }, [accounts, selectedGroup]);

  const operationLabels: Record<OperationType, string> = {
    invoices: 'فواتير المبيعات',
    returns: 'مرتجعات المبيعات',
    receipts: 'سندات القبض',
    payments: 'سندات الصرف',
    opening: 'الأرصدة الافتتاحية',
    exchange: 'صرف عملة',
    discount: 'إشعارات الخصم',
  };

  const isInDateRange = (date: string) => {
    const d = new Date(date);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  };

  const isInNumberRange = (num: string) => {
    if (!numberFrom && !numberTo) return true;
    const n = parseInt((num || '').replace(/^0+/, '') || '0', 10);
    if (numberFrom && n < parseInt(numberFrom, 10)) return false;
    if (numberTo && n > parseInt(numberTo, 10)) return false;
    return true;
  };

  // Build the unfiltered-by-currency dataset depending on operation type
  const baseReportData = useMemo(() => {
    if (!showReport) return [] as any[];

    const matchGroup = (g?: string) => !selectedGroup || selectedGroup === 'all' || g === selectedGroup;
    const matchAccount = (a?: string) => !selectedAccount || selectedAccount === 'all' || a === selectedAccount;

    if (operationType === 'invoices' || operationType === 'returns') {
      return invoices.filter(inv => {
        const isReturn = inv.amount < 0;
        if (operationType === 'invoices' && isReturn) return false;
        if (operationType === 'returns' && !isReturn) return false;
        if (!isInDateRange(inv.date)) return false;
        if (!matchGroup(inv.groupName)) return false;
        if (!matchAccount(inv.accountName)) return false;
        if (!isInNumberRange(inv.invoiceNumber)) return false;
        return true;
      }).map(inv => ({
        id: inv.id,
        number: inv.invoiceNumber,
        date: inv.date,
        accountName: inv.accountName,
        groupName: inv.groupName,
        amount: Math.abs(inv.amount),
        currency: inv.currency,
        type: inv.type === 'cash' ? 'نقدي' : 'آجل',
        description: inv.description || '-',
        reference: inv.reference || '-',
      }));
    }

    if (operationType === 'receipts' || operationType === 'payments') {
      const voucherType = operationType === 'receipts' ? 'receipt' : 'payment';
      return vouchers.filter(v => {
        if (v.type !== voucherType) return false;
        if (!isInDateRange(v.date)) return false;
        const vGroup = voucherType === 'receipt' ? v.debitGroupName : v.creditGroupName;
        const vAccount = voucherType === 'receipt' ? v.debitAccountName : v.creditAccountName;
        if (!matchGroup(vGroup)) return false;
        if (!matchAccount(vAccount)) return false;
        if (!isInNumberRange(v.voucherNumber)) return false;
        return true;
      }).map(v => ({
        id: v.id,
        number: v.voucherNumber,
        date: v.date,
        accountName: voucherType === 'receipt' ? v.debitAccountName : v.creditAccountName,
        groupName: voucherType === 'receipt' ? v.debitGroupName : v.creditGroupName,
        amount: voucherType === 'receipt' ? v.debitAmount : v.creditAmount,
        currency: voucherType === 'receipt' ? v.debitCurrency : v.creditCurrency,
        type: '-',
        description: v.debitDescription || v.creditDescription || '-',
        reference: v.debitReference || v.creditReference || '-',
      }));
    }

    if (operationType === 'opening') {
      // Opening balances don't have group/number — match account only
      return openingBalances.filter(ob => {
        if (!isInDateRange(ob.date)) return false;
        const acc = accounts.find(a => a.accountName === ob.accountName);
        if (!matchGroup(acc?.groupName)) return false;
        if (!matchAccount(ob.accountName)) return false;
        return true;
      }).map(ob => {
        const acc = accounts.find(a => a.accountName === ob.accountName);
        const amt = ob.debit - ob.credit;
        return {
          id: ob.id,
          number: '-',
          date: ob.date,
          accountName: ob.accountName,
          groupName: acc?.groupName || '-',
          amount: Math.abs(amt),
          currency: ob.currency,
          type: amt >= 0 ? 'مدين' : 'دائن',
          description: 'رصيد افتتاحي',
          reference: '-',
        };
      });
    }

    if (operationType === 'exchange') {
      const rows: any[] = [];
      currencyExchanges.forEach(ex => {
        if (!isInDateRange(ex.date)) return;
        if (!isInNumberRange(ex.exchangeNumber)) return;
        // From side
        if (matchGroup(ex.fromGroupName) && matchAccount(ex.fromAccountName)) {
          rows.push({
            id: ex.id + '-from',
            number: ex.exchangeNumber,
            date: ex.date,
            accountName: ex.fromAccountName,
            groupName: ex.fromGroupName,
            amount: ex.fromAmount,
            currency: ex.fromCurrency,
            type: 'من',
            description: ex.description || 'صرف عملة',
            reference: ex.reference || '-',
          });
        }
        // To side
        if (matchGroup(ex.toGroupName) && matchAccount(ex.toAccountName)) {
          rows.push({
            id: ex.id + '-to',
            number: ex.exchangeNumber,
            date: ex.date,
            accountName: ex.toAccountName,
            groupName: ex.toGroupName,
            amount: ex.toAmount,
            currency: ex.toCurrency,
            type: 'إلى',
            description: ex.description || 'صرف عملة',
            reference: ex.reference || '-',
          });
        }
      });
      return rows;
    }

    if (operationType === 'discount') {
      return discounts.filter(d => {
        if (!isInDateRange(d.date)) return false;
        if (!matchGroup(d.groupName)) return false;
        if (!matchAccount(d.accountName)) return false;
        if (!isInNumberRange(d.discountNumber)) return false;
        return true;
      }).map(d => ({
        id: d.id,
        number: d.discountNumber,
        date: d.date,
        accountName: d.accountName,
        groupName: d.groupName,
        amount: d.amount,
        currency: d.currency,
        type: d.type === 'cash' ? 'نقدي' : 'آجل',
        description: d.description || 'خصم',
        reference: d.reference || '-',
      }));
    }

    return [];
  }, [showReport, operationType, invoices, vouchers, openingBalances, currencyExchanges, discounts, accounts, dateFrom, dateTo, selectedGroup, selectedAccount, numberFrom, numberTo]);

  // Apply currency filter
  const reportData = useMemo(() => {
    if (!selectedCurrency || selectedCurrency === 'all') return baseReportData;
    return baseReportData.filter(r => r.currency === selectedCurrency);
  }, [baseReportData, selectedCurrency]);

  // Group rows by currency for display when "all" is selected
  const groupedByCurrency = useMemo(() => {
    const map = new Map<string, any[]>();
    reportData.forEach(r => {
      const key = r.currency || '-';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).map(([currency, items]) => ({
      currency,
      items,
      total: items.reduce((s, x) => s + x.amount, 0),
    }));
  }, [reportData]);

  const totalAmount = useMemo(() => reportData.reduce((sum, item) => sum + item.amount, 0), [reportData]);

  const handleGenerateReport = () => {
    setShowReport(true);
    toast.success(`تم إنشاء تقرير ${operationLabels[operationType]}`);
  };

  const handlePrint = async () => {
    const { printHTML } = await import('@/utils/webviewPrint');
    const { e, escapeUrl } = await import('@/utils/htmlEscape');

    const renderTable = (currency: string, items: any[], total: number) => {
      const rows = items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${e(item.number)}</td>
          <td>${e(item.date)}</td>
          <td>${e(item.accountName)}</td>
          <td>${e(item.groupName)}</td>
          <td class="debit">${e(item.amount.toLocaleString())}</td>
          <td>${e(item.currency)}</td>
          <td>${e(item.description)}</td>
        </tr>
      `).join('');
      return `
        <div class="voucher-type">${e(operationLabels[operationType])} - العملة: ${e(currency)}</div>
        <table class="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>الرقم</th>
              <th>التاريخ</th>
              <th>الحساب</th>
              <th>المجموعة</th>
              <th>المبلغ</th>
              <th>العملة</th>
              <th>البيان</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="totals-row">
              <td colspan="5">الإجمالي</td>
              <td class="debit">${e(total.toLocaleString())}</td>
              <td>${e(currency)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      `;
    };

    const tablesHtml = (selectedCurrency && selectedCurrency !== 'all')
      ? renderTable(selectedCurrency, reportData, totalAmount)
      : groupedByCurrency.map(g => renderTable(g.currency, g.items, g.total)).join('<div style="height:12px"></div>');

    const filtersText = `من ${e(dateFrom)} إلى ${e(dateTo)}${selectedGroup && selectedGroup !== 'all' ? ' | المجموعة: ' + e(selectedGroup) : ''}${selectedAccount && selectedAccount !== 'all' ? ' | الحساب: ' + e(selectedAccount) : ''}${selectedCurrency && selectedCurrency !== 'all' ? ' | العملة: ' + e(selectedCurrency) : ''}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير ${e(operationLabels[operationType])}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Tajawal', 'Arial', sans-serif; direction: rtl; background: #fff; color: #1a1a1a; padding: 15px; }
          .page-border { border: 3px solid #0d9488; border-radius: 16px; padding: 10px; background: linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%); box-shadow: 0 4px 20px rgba(13, 148, 136, 0.15); }
          .print-container { max-width: 800px; margin: 0 auto; border: 2px solid #0d9488; border-radius: 12px; overflow: hidden; background: #fff; }
          .header { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
          .header-right { text-align: right; flex: 1; }
          .header-center { flex: 0 0 100px; display: flex; justify-content: center; align-items: center; }
          .header-center img { max-width: 80px; max-height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); }
          .header-left { text-align: left; flex: 1; direction: ltr; }
          .header h1, .header h2, .header p { margin: 2px 0; color: #000000; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header h2 { font-size: 14px; }
          .header p { font-size: 12px; }
          .report-header-wrapper { border: 2px solid #0d9488; border-radius: 10px; overflow: hidden; margin: 5px 0; }
          .report-info-wrapper { padding: 5px 15px; }
          .voucher-type { text-align: center; font-size: 16px; font-weight: bold; color: #0d9488; border: 2px solid #0d9488; border-radius: 8px; padding: 8px; margin: 10px 0; background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); }
          .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ccc; }
          .info-label { color: #666; font-size: 14px; }
          .info-value { font-weight: bold; font-size: 14px; }
          .content { padding: 10px 15px; }
          .report-table { width: 100%; border-collapse: collapse; margin: 5px 0 10px 0; }
          .report-table th { background: #87CEEB; color: #000; padding: 10px 6px; font-size: 12px; text-align: center; border: 1px solid #000; font-weight: bold; }
          .report-table td { padding: 8px 6px; border: 1px solid #000; font-size: 11px; text-align: center; color: #000; }
          .report-table tr:nth-child(even) { background: #f9fafb; }
          .report-table .debit { color: #16a34a; font-weight: bold; }
          .totals-row { background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%) !important; font-weight: bold; }
          .totals-row td { border-top: 2px solid #0d9488 !important; }
          .page-footer-content { text-align: center; font-size: 11px; color: #666; padding: 6px 0; border-top: 1px solid #e2e8f0; }
          .print-doc { width: 100%; border-collapse: collapse; }
          .print-doc > thead > tr > td, .print-doc > tfoot > tr > td, .print-doc > tbody > tr > td { padding: 0; border: none; vertical-align: top; }
          @media print {
            body { padding: 0; margin: 0; }
            @page { size: A4; margin: 10mm; }
            .page-frame { position: fixed; top: 0; left: 0; right: 0; bottom: 0; border: 3px solid #0d9488; border-radius: 10px; pointer-events: none; z-index: 9999; }
            .page-border { border: none; box-shadow: none; padding: 0; background: none; border-radius: 0; }
            .print-container { border: none; border-radius: 0; }
            .print-doc > thead { display: table-header-group; }
            .print-doc > tfoot { display: table-footer-group; }
            .report-table thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="page-frame"></div>
        <div class="page-border">
        <div class="print-container">
          <table class="print-doc">
            <thead>
              <tr><td>
                <div class="report-header-wrapper">
                  <div class="header">
                    <div class="header-right">
                      <h1>${e(settings.headerArabic[0])}</h1>
                      <h2>${e(settings.headerArabic[1])}</h2>
                      <p>${e(settings.headerArabic[2])}</p>
                    </div>
                    <div class="header-center">
                      ${settings.logo ? `<img src="${escapeUrl(settings.logo)}" alt="Logo" />` : ''}
                    </div>
                    <div class="header-left">
                      <h1>${e(settings.headerEnglish[0])}</h1>
                      <h2>${e(settings.headerEnglish[1])}</h2>
                      <p>${e(settings.headerEnglish[2])}</p>
                    </div>
                  </div>
                </div>
                <div class="report-info-wrapper">
                  <div class="info-row">
                    <span class="info-label">الفلاتر:</span>
                    <span class="info-value">${filtersText}</span>
                  </div>
                </div>
              </td></tr>
            </thead>
            <tfoot>
              <tr><td>
                <div class="page-footer-content">
                  <span>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG')}</span>
                </div>
              </td></tr>
            </tfoot>
            <tbody>
              <tr><td>
                <div class="content">
                  ${tablesHtml}
                  ${settings.footerNote ? `
                  <div style="text-align:center; padding:12px; margin:15px 0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                    <span style="font-size:13px; color:#333; font-weight:500;">${e(settings.footerNote)}</span>
                  </div>` : ''}
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
        </div>
      </body>
      </html>
    `;

    printHTML(htmlContent);
  };

  const columns = [
    { key: 'index', header: '#', render: (_: any, idx: number) => <span>{idx + 1}</span> },
    { key: 'number', header: 'الرقم', render: (item: any) => item.number },
    { key: 'date', header: 'التاريخ', render: (item: any) => item.date },
    { key: 'accountName', header: 'الحساب', render: (item: any) => item.accountName },
    { key: 'groupName', header: 'المجموعة', render: (item: any) => <span className="text-muted-foreground">{item.groupName}</span> },
    { key: 'amount', header: 'المبلغ', render: (item: any) => <span className="font-bold">{item.amount.toLocaleString()}</span> },
    { key: 'currency', header: 'العملة', render: (item: any) => item.currency },
    { key: 'description', header: 'البيان', render: (item: any) => <span className="text-muted-foreground">{item.description}</span> },
  ];

  const showSplitTables = !selectedCurrency || selectedCurrency === 'all';

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Filters */}
      <div className="shrink-0 bg-card border-b border-border p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Operation Type */}
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-xs">نوع العملية</Label>
            <Select value={operationType} onValueChange={(v) => { setOperationType(v as OperationType); setShowReport(false); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoices">فواتير المبيعات</SelectItem>
                <SelectItem value="returns">مرتجعات المبيعات</SelectItem>
                <SelectItem value="receipts">سندات القبض</SelectItem>
                <SelectItem value="payments">سندات الصرف</SelectItem>
                <SelectItem value="opening">الأرصدة الافتتاحية</SelectItem>
                <SelectItem value="exchange">صرف عملة</SelectItem>
                <SelectItem value="discount">إشعارات الخصم</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-sm" />
          </div>

          {/* Group */}
          <div className="space-y-1">
            <Label className="text-xs">المجموعة</Label>
            <Select value={selectedGroup} onValueChange={(v) => { setSelectedGroup(v); setSelectedAccount(''); }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label className="text-xs">الحساب</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {filteredAccountsForSelect.map(a => (
                  <SelectItem key={a.id} value={a.accountName}>{a.accountName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency (next to Account) */}
          <div className="space-y-1">
            <Label className="text-xs">رمز العملة</Label>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {currencies.map(c => (
                  <SelectItem key={c.id} value={c.symbol}>{c.name} ({c.symbol})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number From */}
          <div className="space-y-1">
            <Label className="text-xs">من رقم</Label>
            <Input type="number" value={numberFrom} onChange={(e) => setNumberFrom(e.target.value)} placeholder="1" className="h-9 text-sm" />
          </div>

          {/* Number To */}
          <div className="space-y-1">
            <Label className="text-xs">إلى رقم</Label>
            <Input type="number" value={numberTo} onChange={(e) => setNumberTo(e.target.value)} placeholder="∞" className="h-9 text-sm" />
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button onClick={handleGenerateReport} className="gradient-primary" size="sm">
            <Eye className="w-4 h-4 ml-2" />
            عرض التقرير
          </Button>
          {showReport && reportData.length > 0 && (
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 ml-2" />
              طباعة
            </Button>
          )}
        </div>
      </div>

      {/* Report Table(s) */}
      {showReport && (
        <div className="flex-1 flex flex-col overflow-auto p-4 gap-4">
          {showSplitTables ? (
            groupedByCurrency.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>لا توجد بيانات</p>
                </CardContent>
              </Card>
            ) : (
              groupedByCurrency.map(g => (
                <Card key={g.currency} className="flex flex-col overflow-hidden glass-card">
                  <CardHeader className="py-3 shrink-0">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        {operationLabels[operationType]} - العملة: {g.currency} ({g.items.length})
                      </span>
                      <span className="text-sm font-bold text-primary">
                        الإجمالي: {g.total.toLocaleString()} {g.currency}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-hidden p-0">
                    <ScrollableTable
                      columns={columns}
                      data={g.items}
                      getItemId={(item) => item.id}
                      emptyTitle="لا توجد بيانات"
                      emptyDescription=""
                    />
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            <Card className="flex-1 flex flex-col overflow-hidden glass-card">
              <CardHeader className="py-3 shrink-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {operationLabels[operationType]} ({reportData.length})
                  </span>
                  <span className="text-sm font-bold text-primary">
                    الإجمالي: {totalAmount.toLocaleString()} {selectedCurrency}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollableTable
                  columns={columns}
                  data={reportData}
                  getItemId={(item) => item.id}
                  emptyTitle="لا توجد بيانات"
                  emptyDescription="لا توجد عمليات تطابق معايير البحث"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!showReport && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">اختر نوع العملية واضغط عرض التقرير</p>
            <p className="text-sm mt-1">يمكنك تصفية البيانات بالتاريخ والمجموعة والحساب والعملة ورقم المستند</p>
          </div>
        </div>
      )}
    </div>
  );
}
