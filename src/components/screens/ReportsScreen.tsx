import { useState } from 'react';
import { format, startOfYear } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccounting } from '@/contexts/AccountingContext';
import { printReport, printSummaryReport } from '@/utils/printService';
import { shareViaWhatsApp, downloadPDF } from '@/utils/pdfService';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Eye, Printer, Share2, FileText, ArrowRight, CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type ReportType = 'analytical' | 'summary';
type OperationType = 'all' | 'opening' | 'receipt' | 'payment' | 'invoices' | 'returns' | 'discount' | 'exchange';

// Helper to get first day of current year
const getFirstDayOfYear = () => {
  const now = new Date();
  return format(startOfYear(now), 'yyyy-MM-dd');
};

// Helper to get today's date
const getToday = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

export function ReportsScreen() {
  const { accounts, groups, currencies, vouchers, invoices, openingBalances, currencyExchanges, settings } = useAccounting();
  const [reportType, setReportType] = useState<ReportType>('analytical');
  const [operationType, setOperationType] = useState<OperationType>('all');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [dateFrom, setDateFrom] = useState(getFirstDayOfYear());
  const [dateTo, setDateTo] = useState(getToday());
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const filteredAccounts = accounts.filter(a => !selectedGroup || a.groupName === selectedGroup);
  const groupAccounts = accounts.filter(a => a.groupName === selectedGroup);

  // Filter by date range
  const isInDateRange = (date: string) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(date);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo)) return false;
    return true;
  };

  // Check if transaction is before the date range (for previous balance)
  const isBeforeDateRange = (date: string) => {
    if (!dateFrom) return false;
    const d = new Date(date);
    return d < new Date(dateFrom);
  };

  // Get previous balance (transactions before dateFrom)
  const getPreviousBalance = (accountName: string, currency: string) => {
    let totalDebit = 0;
    let totalCredit = 0;

    // Opening balances before dateFrom
    openingBalances
      .filter(ob => ob.accountName === accountName && ob.currency === currency && isBeforeDateRange(ob.date))
      .forEach(ob => {
        totalDebit += ob.debit;
        totalCredit += ob.credit;
      });

    // Vouchers before dateFrom
    vouchers.filter(v => isBeforeDateRange(v.date)).forEach(v => {
      if (v.debitAccountName === accountName && v.debitCurrency === currency) {
        totalDebit += v.debitAmount;
      }
      if (v.creditAccountName === accountName && v.creditCurrency === currency) {
        totalCredit += v.creditAmount;
      }
    });

    // Currency exchanges before dateFrom
    currencyExchanges.filter(ex => isBeforeDateRange(ex.date)).forEach(ex => {
      if (ex.fromAccountName === accountName && ex.fromCurrency === currency) {
        totalCredit += ex.fromAmount;
      }
      if (ex.toAccountName === accountName && ex.toCurrency === currency) {
        totalDebit += ex.toAmount;
      }
    });

    // Invoices before dateFrom
    invoices
      .filter(i => i.accountName === accountName && i.currency === currency && isBeforeDateRange(i.date))
      .forEach(i => {
        if (i.amount >= 0) {
          totalDebit += i.amount;
        } else {
          totalCredit += Math.abs(i.amount);
        }
      });

    return totalDebit - totalCredit;
  };

  const generateReport = () => {
    if (reportType === 'analytical') {
      // For analytical report with "all" currencies, we need group and account
      if (selectedCurrency === 'all') {
        if (!selectedGroup || !selectedAccount) {
          toast.error('يرجى اختيار المجموعة والحساب');
          return;
        }
      } else if (!selectedAccount || !selectedCurrency) {
        toast.error('يرجى اختيار الحساب والعملة');
        return;
      }
    }
    if (reportType === 'summary' && !selectedGroup) {
      toast.error('يرجى اختيار المجموعة');
      return;
    }
    setShowReport(true);
    toast.success('تم إنشاء التقرير بنجاح');
  };

  // Get transactions for a specific account and currency
  const getTransactionsForAccount = (accountName: string, currency: string) => {
    let allTransactions: Array<{
      date: string;
      type: string;
      description: string;
      reference?: string;
      debit: number;
      credit: number;
    }> = [];

    // Opening balances
    if (operationType === 'all' || operationType === 'opening') {
      const accountOpenings = openingBalances.filter(ob => 
        ob.accountName === accountName && ob.currency === currency && isInDateRange(ob.date)
      );
      allTransactions.push(...accountOpenings.map(ob => ({
        date: ob.date,
        type: 'افتتاحي',
        description: 'رصيد افتتاحي',
        reference: undefined,
        debit: ob.debit,
        credit: ob.credit,
      })));
    }

    // Vouchers (receipt and payment) - check both debit and credit sides
    if (operationType === 'all' || operationType === 'receipt') {
      const receiptVouchers = vouchers.filter(v => v.type === 'receipt' && isInDateRange(v.date));
      
      receiptVouchers.forEach(v => {
        if (v.debitAccountName === accountName && v.debitCurrency === currency) {
          allTransactions.push({
            date: v.date,
            type: 'قبض',
            description: v.debitDescription || 'سند قبض',
            reference: v.debitReference,
            debit: v.debitAmount,
            credit: 0,
          });
        }
        if (v.creditAccountName === accountName && v.creditCurrency === currency) {
          allTransactions.push({
            date: v.date,
            type: 'قبض',
            description: v.creditDescription || 'سند قبض',
            reference: v.creditReference,
            debit: 0,
            credit: v.creditAmount,
          });
        }
      });
    }

    if (operationType === 'all' || operationType === 'payment') {
      const paymentVouchers = vouchers.filter(v => v.type === 'payment' && isInDateRange(v.date));
      
      paymentVouchers.forEach(v => {
        if (v.debitAccountName === accountName && v.debitCurrency === currency) {
          allTransactions.push({
            date: v.date,
            type: 'صرف',
            description: v.debitDescription || 'سند صرف',
            reference: v.debitReference,
            debit: v.debitAmount,
            credit: 0,
          });
        }
        if (v.creditAccountName === accountName && v.creditCurrency === currency) {
          allTransactions.push({
            date: v.date,
            type: 'صرف',
            description: v.creditDescription || 'سند صرف',
            reference: v.creditReference,
            debit: 0,
            credit: v.creditAmount,
          });
        }
      });
    }

    // Currency Exchange - check both from and to sides
    if (operationType === 'all' || operationType === 'exchange') {
      currencyExchanges.filter(ex => isInDateRange(ex.date)).forEach(ex => {
        if (ex.fromAccountName === accountName && ex.fromCurrency === currency) {
          allTransactions.push({
            date: ex.date,
            type: 'صرف عملة',
            description: ex.description || 'صرف عملة',
            reference: ex.reference,
            debit: 0,
            credit: ex.fromAmount,
          });
        }
        if (ex.toAccountName === accountName && ex.toCurrency === currency) {
          allTransactions.push({
            date: ex.date,
            type: 'صرف عملة',
            description: ex.description || 'صرف عملة',
            reference: ex.reference,
            debit: ex.toAmount,
            credit: 0,
          });
        }
      });
    }

    // Invoices
    if (operationType === 'all' || operationType === 'invoices') {
      const salesInvoices = invoices.filter(i => 
        i.accountName === accountName && i.currency === currency && i.amount >= 0 && isInDateRange(i.date)
      );
      allTransactions.push(...salesInvoices.map(i => ({
        date: i.date,
        type: 'فواتير',
        description: i.description,
        reference: i.reference,
        debit: i.amount,
        credit: 0,
      })));
    }

    // Returns
    if (operationType === 'all' || operationType === 'returns') {
      const returnInvoices = invoices.filter(i => 
        i.accountName === accountName && i.currency === currency && i.amount < 0 && isInDateRange(i.date)
      );
      allTransactions.push(...returnInvoices.map(i => ({
        date: i.date,
        type: 'مرتجع',
        description: i.description,
        reference: i.reference,
        debit: 0,
        credit: Math.abs(i.amount),
      })));
    }

    // Discount - placeholder for now
    if (operationType === 'discount') {
      // Add discount logic when implemented
    }

    return allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get summary data for all accounts in a group
  const getSummaryData = () => {
    const currenciesToShow = selectedCurrency === 'all' 
      ? currencies.map(c => c.symbol) 
      : [selectedCurrency];
    
    return currenciesToShow.map(currency => {
      const accountsSummary = groupAccounts.map(account => {
        const transactions = getTransactionsForAccount(account.accountName, currency);
        const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
        const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
        const balance = totalDebit - totalCredit;
        
        return {
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          totalDebit,
          totalCredit,
          balance,
        };
      }).filter(acc => acc.totalDebit > 0 || acc.totalCredit > 0 || acc.balance !== 0);

      return {
        currency,
        accounts: accountsSummary,
        totalDebit: accountsSummary.reduce((sum, a) => sum + a.totalDebit, 0),
        totalCredit: accountsSummary.reduce((sum, a) => sum + a.totalCredit, 0),
        totalBalance: accountsSummary.reduce((sum, a) => sum + a.balance, 0),
      };
    }).filter(c => c.accounts.length > 0);
  };

  // For analytical report
  const getTransactions = () => getTransactionsForAccount(selectedAccount, selectedCurrency);

  const transactions = getTransactions();

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    runningBalance += t.debit - t.credit;
    return { ...t, balance: runningBalance };
  });

  const handlePrintReport = () => {
    if (!showReport) {
      toast.error('يرجى إنشاء التقرير أولاً');
      return;
    }

    if (reportType === 'summary') {
      // Print summary report
      if (!selectedGroup) {
        toast.error('يرجى اختيار المجموعة');
        return;
      }
      
      const summaryData = getSummaryData();
      printSummaryReport({
        title: 'كشف حساب إجمالي',
        groupName: selectedGroup,
        dateFrom,
        dateTo,
        currencyData: summaryData,
        settings,
      });
      toast.success('جاري طباعة التقرير...');
      return;
    }

    // Print analytical report
    if (!selectedAccount || !selectedCurrency) {
      toast.error('يرجى اختيار الحساب والعملة');
      return;
    }
    
    const title = 'كشف حساب تحليلي';
    const prevBalance = getPreviousBalance(selectedAccount, selectedCurrency);
    
    // Build transactions with previous balance row
    let printTransactions = [...transactionsWithBalance];
    
    // Add previous balance row at the beginning if exists
    if (prevBalance !== 0) {
      const prevBalanceRow = {
        date: '-',
        type: 'رصيد افتتاحي',
        description: 'الرصيد الافتتاحي',
        reference: '-',
        debit: prevBalance > 0 ? prevBalance : 0,
        credit: prevBalance < 0 ? Math.abs(prevBalance) : 0,
        balance: prevBalance,
        isPreviousBalance: true,
      };
      printTransactions = [prevBalanceRow, ...transactionsWithBalance.map((t, index) => ({
        ...t,
        balance: t.balance + prevBalance
      }))];
    }
    
    const totals = {
      debit: transactionsWithBalance.reduce((sum, t) => sum + t.debit, 0) + (prevBalance > 0 ? prevBalance : 0),
      credit: transactionsWithBalance.reduce((sum, t) => sum + t.credit, 0) + (prevBalance < 0 ? Math.abs(prevBalance) : 0),
      balance: runningBalance + prevBalance,
    };
    
    printReport({
      title,
      accountName: selectedAccount,
      currency: selectedCurrency,
      transactions: printTransactions,
      settings,
      totals,
    });
    
    toast.success('جاري طباعة التقرير...');
  };

  // Handle share via WhatsApp
  const handleShareWhatsApp = async () => {
    if (!showReport) {
      toast.error('يرجى إنشاء التقرير أولاً');
      return;
    }

    setIsSharing(true);
    try {
      const reportTitle = reportType === 'analytical' 
        ? `كشف_حساب_تحليلي_${selectedAccount}`
        : `كشف_حساب_إجمالي_${selectedGroup}`;
      
      const success = await shareViaWhatsApp('report-container', reportTitle);
      if (success) {
        toast.success('تم مشاركة التقرير عبر الواتساب');
      } else {
        toast.error('حدث خطأ أثناء المشاركة');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('حدث خطأ أثناء المشاركة');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!showReport) {
      toast.error('يرجى إنشاء التقرير أولاً');
      return;
    }

    setIsDownloading(true);
    try {
      const fileName = reportType === 'analytical' 
        ? `كشف_حساب_تحليلي_${selectedAccount}`
        : `كشف_حساب_إجمالي_${selectedGroup}`;
      
      const success = await downloadPDF('report-container', fileName);
      if (success) {
        toast.success('تم تحميل ملف PDF بنجاح');
      } else {
        toast.error('حدث خطأ أثناء إنشاء الملف');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('حدث خطأ أثناء إنشاء الملف');
    } finally {
      setIsDownloading(false);
    }
  };

  // Get all currencies for "all" selection in analytical report
  const getAnalyticalDataForAllCurrencies = () => {
    return currencies.map(currency => {
      const transactions = getTransactionsForAccount(selectedAccount, currency.symbol);
      const prevBalance = getPreviousBalance(selectedAccount, currency.symbol);
      
      let runningBal = 0;
      const transactionsWithBal = transactions.map(t => {
        runningBal += t.debit - t.credit;
        return { ...t, balance: runningBal };
      });
      
      return {
        currency: currency.symbol,
        prevBalance,
        transactions: transactionsWithBal,
        runningBalance: runningBal,
      };
    }).filter(c => c.transactions.length > 0 || c.prevBalance !== 0);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden min-h-0">
      {/* Report toolbar - Fixed */}
      <div className="shrink-0 bg-card border-b border-border p-4">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handlePrintReport}
            disabled={!showReport}
          >
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleShareWhatsApp}
            disabled={!showReport || isSharing}
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            واتساب
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleDownloadPDF}
            disabled={!showReport || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            PDF
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setShowReport(false);
              setSelectedAccount('');
              setSelectedGroup('');
            }}
          >
            <ArrowRight className="w-4 h-4" />
            تراجع
          </Button>
        </div>
      </div>
      
      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Report filters */}
        <Card className="animate-slide-up">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            إعدادات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">نوع التقرير</label>
              <Select 
                value={reportType} 
                onValueChange={(val) => setReportType(val as ReportType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytical">كشف تحليلي</SelectItem>
                  <SelectItem value="summary">كشف إجمالي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">نوع العملية</label>
              <Select value={operationType} onValueChange={(val) => setOperationType(val as OperationType)}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="opening">افتتاحي</SelectItem>
                  <SelectItem value="receipt">قبض</SelectItem>
                  <SelectItem value="payment">صرف</SelectItem>
                  <SelectItem value="invoices">فواتير</SelectItem>
                  <SelectItem value="returns">مرتجع</SelectItem>
                  <SelectItem value="discount">خصم</SelectItem>
                  <SelectItem value="exchange">صرف عملة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">رمز العملة</label>
              <Select 
                value={selectedCurrency} 
                onValueChange={setSelectedCurrency}
              >
                <SelectTrigger>
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {currencies.map(curr => (
                    <SelectItem key={curr.id} value={curr.symbol}>
                      {curr.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">من تاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-right"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">إلى تاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-right"
              />
            </div>
          </div>

          {/* Row 3: Group and Account */}
          <div className={`grid gap-3 ${reportType === 'analytical' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">اسم المجموعة</label>
              <Select 
                value={selectedGroup} 
                onValueChange={(val) => {
                  setSelectedGroup(val);
                  setSelectedAccount('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المجموعة" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reportType === 'analytical' && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب</label>
                <AccountSearchInput
                  accounts={filteredAccounts}
                  value={selectedAccount}
                  onSelect={setSelectedAccount}
                  placeholder="ابحث عن الحساب..."
                />
              </div>
            )}
          </div>

          <Button onClick={generateReport} className="w-full" size="lg">
            <Eye className="w-4 h-4" />
            عرض التقرير
          </Button>
        </CardContent>
      </Card>

      {/* Analytical Report display - All currencies */}
      {showReport && reportType === 'analytical' && selectedCurrency === 'all' && (
        <div id="report-container" className="space-y-4 animate-fade-in">
          {getAnalyticalDataForAllCurrencies().map((currData, idx) => (
            <Card key={idx}>
              <CardHeader className="gradient-primary text-primary-foreground rounded-t-2xl">
                <CardTitle className="text-center">
                  <p className="text-lg font-bold">كشف حساب تحليلي</p>
                  <p className="text-sm opacity-80 mt-1">{selectedAccount}</p>
                  <p className="text-xs opacity-60 mt-1">العملة: {currData.currency}</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table header */}
                <div className="grid grid-cols-7 gap-1 p-3 bg-secondary text-secondary-foreground text-xs font-semibold border border-black">
                  <div className="border-l border-black pl-1">التاريخ</div>
                  <div className="border-l border-black pl-1">النوع</div>
                  <div className="border-l border-black pl-1">البيان</div>
                  <div className="border-l border-black pl-1">المرجع</div>
                  <div className="border-l border-black pl-1 text-left">مدين</div>
                  <div className="border-l border-black pl-1 text-left">دائن</div>
                  <div className="text-left">الرصيد</div>
                </div>

                {/* Table body */}
                {currData.transactions.length === 0 && currData.prevBalance === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد معاملات لهذا الحساب</p>
                  </div>
                ) : (
                  <>
                    {/* Previous Balance Row */}
                    {currData.prevBalance !== 0 && (
                      <div className="grid grid-cols-7 gap-1 p-3 text-xs border border-black bg-muted/50">
                        <div className="border-l border-black pl-1 text-muted-foreground">-</div>
                        <div className="border-l border-black pl-1 font-bold text-destructive">رصيد افتتاحي</div>
                        <div className="border-l border-black pl-1 text-destructive">الرصيد الافتتاحي</div>
                        <div className="border-l border-black pl-1 text-muted-foreground">-</div>
                        <div className="border-l border-black pl-1 text-left font-bold text-destructive">
                          {currData.prevBalance > 0 ? currData.prevBalance.toLocaleString() : '-'}
                        </div>
                        <div className="border-l border-black pl-1 text-left font-bold text-destructive">
                          {currData.prevBalance < 0 ? Math.abs(currData.prevBalance).toLocaleString() : '-'}
                        </div>
                        <div className="text-left font-bold text-destructive">
                          {currData.prevBalance.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {/* Regular Transactions */}
                    {currData.transactions.map((t, index) => {
                      const adjustedBalance = t.balance + currData.prevBalance;
                      return (
                        <div 
                          key={index}
                          className="grid grid-cols-7 gap-1 p-3 text-xs border-x border-b border-black hover:bg-secondary/30 transition-colors"
                        >
                          <div className="border-l border-black pl-1 text-muted-foreground">{t.date}</div>
                          <div className="border-l border-black pl-1">{t.type}</div>
                          <div className="border-l border-black pl-1 truncate">{t.description}</div>
                          <div className="border-l border-black pl-1 text-muted-foreground">{t.reference || '-'}</div>
                          <div className="border-l border-black pl-1 text-left text-success font-medium">
                            {t.debit > 0 ? t.debit.toLocaleString() : '-'}
                          </div>
                          <div className="border-l border-black pl-1 text-left text-destructive font-medium">
                            {t.credit > 0 ? t.credit.toLocaleString() : '-'}
                          </div>
                          <div className={`text-left font-bold ${adjustedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {adjustedBalance.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Summary footer */}
                {(currData.transactions.length > 0 || currData.prevBalance !== 0) && (
                  <div className="grid grid-cols-7 gap-1 p-3 bg-muted text-sm font-bold border border-black">
                    <div className="col-span-4 border-l border-black pl-1">الإجمالي</div>
                    <div className="border-l border-black pl-1 text-left text-success">
                      {(currData.transactions.reduce((sum, t) => sum + t.debit, 0) + (currData.prevBalance > 0 ? currData.prevBalance : 0)).toLocaleString()}
                    </div>
                    <div className="border-l border-black pl-1 text-left text-destructive">
                      {(currData.transactions.reduce((sum, t) => sum + t.credit, 0) + (currData.prevBalance < 0 ? Math.abs(currData.prevBalance) : 0)).toLocaleString()}
                    </div>
                    <div className={`text-left ${(currData.runningBalance + currData.prevBalance) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(currData.runningBalance + currData.prevBalance).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {getAnalyticalDataForAllCurrencies().length === 0 && (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد معاملات لهذا الحساب بأي عملة</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Analytical Report display - Single currency */}
      {showReport && reportType === 'analytical' && selectedCurrency !== 'all' && (
        <Card id="report-container" className="animate-fade-in">
            <CardHeader className="gradient-primary text-primary-foreground rounded-t-2xl">
              <CardTitle className="text-center">
                <p className="text-lg font-bold">كشف حساب تحليلي</p>
                <p className="text-sm opacity-80 mt-1">{selectedAccount}</p>
                <p className="text-xs opacity-60 mt-1">العملة: {selectedCurrency}</p>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="grid grid-cols-7 gap-1 p-3 bg-secondary text-secondary-foreground text-xs font-semibold border border-black">
                <div className="border-l border-black pl-1">التاريخ</div>
                <div className="border-l border-black pl-1">النوع</div>
                <div className="border-l border-black pl-1">البيان</div>
                <div className="border-l border-black pl-1">المرجع</div>
                <div className="border-l border-black pl-1 text-left">مدين</div>
                <div className="border-l border-black pl-1 text-left">دائن</div>
                <div className="text-left">الرصيد</div>
              </div>

              {/* Table body */}
              {transactionsWithBalance.length === 0 && getPreviousBalance(selectedAccount, selectedCurrency) === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد معاملات لهذا الحساب</p>
                </div>
              ) : (
                <>
                  {/* Previous Balance Row */}
                  {(() => {
                    const prevBalance = getPreviousBalance(selectedAccount, selectedCurrency);
                    if (prevBalance !== 0) {
                      return (
                        <div className="grid grid-cols-7 gap-1 p-3 text-xs border border-black bg-muted/50">
                          <div className="border-l border-black pl-1 text-muted-foreground">-</div>
                          <div className="border-l border-black pl-1 font-bold text-destructive">رصيد افتتاحي</div>
                          <div className="border-l border-black pl-1 text-destructive">الرصيد الافتتاحي</div>
                          <div className="border-l border-black pl-1 text-muted-foreground">-</div>
                          <div className="border-l border-black pl-1 text-left font-bold text-destructive">
                            {prevBalance > 0 ? prevBalance.toLocaleString() : '-'}
                          </div>
                          <div className="border-l border-black pl-1 text-left font-bold text-destructive">
                            {prevBalance < 0 ? Math.abs(prevBalance).toLocaleString() : '-'}
                          </div>
                          <div className="text-left font-bold text-destructive">
                            {prevBalance.toLocaleString()}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {/* Regular Transactions */}
                  {transactionsWithBalance.map((t, index) => {
                    const prevBalance = getPreviousBalance(selectedAccount, selectedCurrency);
                    const adjustedBalance = t.balance + prevBalance;
                    return (
                      <div 
                        key={index}
                        className="grid grid-cols-7 gap-1 p-3 text-xs border-x border-b border-black hover:bg-secondary/30 transition-colors"
                      >
                        <div className="border-l border-black pl-1 text-muted-foreground">{t.date}</div>
                        <div className="border-l border-black pl-1">{t.type}</div>
                        <div className="border-l border-black pl-1 truncate">{t.description}</div>
                        <div className="border-l border-black pl-1 text-muted-foreground">{t.reference || '-'}</div>
                        <div className="border-l border-black pl-1 text-left text-success font-medium">
                          {t.debit > 0 ? t.debit.toLocaleString() : '-'}
                        </div>
                        <div className="border-l border-black pl-1 text-left text-destructive font-medium">
                          {t.credit > 0 ? t.credit.toLocaleString() : '-'}
                        </div>
                        <div className={`text-left font-bold ${adjustedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {adjustedBalance.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Summary footer */}
              {(transactionsWithBalance.length > 0 || getPreviousBalance(selectedAccount, selectedCurrency) !== 0) && (
                <div className="grid grid-cols-7 gap-1 p-3 bg-muted text-sm font-bold border border-black">
                  <div className="col-span-4 border-l border-black pl-1">الإجمالي</div>
                  <div className="border-l border-black pl-1 text-left text-success">
                    {(transactionsWithBalance.reduce((sum, t) => sum + t.debit, 0) + (getPreviousBalance(selectedAccount, selectedCurrency) > 0 ? getPreviousBalance(selectedAccount, selectedCurrency) : 0)).toLocaleString()}
                  </div>
                  <div className="border-l border-black pl-1 text-left text-destructive">
                    {(transactionsWithBalance.reduce((sum, t) => sum + t.credit, 0) + (getPreviousBalance(selectedAccount, selectedCurrency) < 0 ? Math.abs(getPreviousBalance(selectedAccount, selectedCurrency)) : 0)).toLocaleString()}
                  </div>
                  <div className={`text-left ${(runningBalance + getPreviousBalance(selectedAccount, selectedCurrency)) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {(runningBalance + getPreviousBalance(selectedAccount, selectedCurrency)).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {/* Summary Report display */}
      {showReport && reportType === 'summary' && (
        <div id="report-container" className="space-y-4 animate-fade-in">
          {getSummaryData().map((currencyData, idx) => (
            <Card key={idx}>
              <CardHeader className="gradient-primary text-primary-foreground rounded-t-2xl">
                <CardTitle className="text-center">
                  <p className="text-lg font-bold">كشف حساب إجمالي</p>
                  <p className="text-sm opacity-80 mt-1">المجموعة: {selectedGroup}</p>
                  <p className="text-xs opacity-60 mt-1">العملة: {currencyData.currency}</p>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table header */}
                <div className="grid grid-cols-5 gap-1 p-3 bg-secondary text-secondary-foreground text-xs font-semibold border border-black">
                  <div className="border-l border-black pl-1">رقم الحساب</div>
                  <div className="border-l border-black pl-1">اسم الحساب</div>
                  <div className="border-l border-black pl-1 text-left">مدين</div>
                  <div className="border-l border-black pl-1 text-left">دائن</div>
                  <div className="text-left">الرصيد</div>
                </div>

                {/* Table body */}
                {currencyData.accounts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>لا توجد حسابات بهذه العملة</p>
                  </div>
                ) : (
                  currencyData.accounts.map((acc, index) => (
                    <div 
                      key={index}
                      className="grid grid-cols-5 gap-1 p-3 text-xs border-x border-b border-black hover:bg-secondary/30 transition-colors"
                    >
                      <div className="border-l border-black pl-1 text-muted-foreground">{acc.accountNumber}</div>
                      <div className="border-l border-black pl-1 font-medium">{acc.accountName}</div>
                      <div className="border-l border-black pl-1 text-left text-success font-medium">
                        {acc.totalDebit > 0 ? acc.totalDebit.toLocaleString() : '-'}
                      </div>
                      <div className="border-l border-black pl-1 text-left text-destructive font-medium">
                        {acc.totalCredit > 0 ? acc.totalCredit.toLocaleString() : '-'}
                      </div>
                      <div className={`text-left font-bold ${acc.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {acc.balance.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}

                {/* Summary footer */}
                {currencyData.accounts.length > 0 && (
                  <div className="grid grid-cols-5 gap-1 p-3 bg-muted text-sm font-bold border border-black">
                    <div className="col-span-2 border-l border-black pl-1">الإجمالي</div>
                    <div className="border-l border-black pl-1 text-left text-success">
                      {currencyData.totalDebit.toLocaleString()}
                    </div>
                    <div className="border-l border-black pl-1 text-left text-destructive">
                      {currencyData.totalCredit.toLocaleString()}
                    </div>
                    <div className={`text-left ${currencyData.totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {currencyData.totalBalance.toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {getSummaryData().length === 0 && (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد حسابات في هذه المجموعة</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
