import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounting } from '@/contexts/AccountingContext';
import { printReport } from '@/utils/printService';
import { AccountSearchInput } from '@/components/AccountSearchInput';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Eye, Printer, Share2, FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

type ReportType = 'analytical' | 'summary';
type OperationType = 'all' | 'opening' | 'receipt' | 'payment' | 'invoices' | 'returns' | 'discount' | 'exchange';

export function ReportsScreen() {
  const { accounts, groups, currencies, vouchers, invoices, openingBalances, currencyExchanges, settings } = useAccounting();
  const [reportType, setReportType] = useState<ReportType>('analytical');
  const [operationType, setOperationType] = useState<OperationType>('all');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [showReport, setShowReport] = useState(false);

  const filteredAccounts = accounts.filter(a => !selectedGroup || a.groupName === selectedGroup);

  const generateReport = () => {
    if (!selectedAccount || !selectedCurrency) {
      toast.error('يرجى اختيار الحساب والعملة');
      return;
    }
    setShowReport(true);
    toast.success('تم إنشاء التقرير بنجاح');
  };

  // Get transactions for selected account based on operation type
  const getTransactions = () => {
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
        ob.accountName === selectedAccount && ob.currency === selectedCurrency
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
      const receiptVouchers = vouchers.filter(v => v.type === 'receipt');
      
      // Check debit side (المقبوض منه - مدين)
      receiptVouchers.forEach(v => {
        if (v.debitAccountName === selectedAccount && v.debitCurrency === selectedCurrency) {
          allTransactions.push({
            date: v.date,
            type: 'قبض',
            description: v.debitDescription || 'سند قبض',
            reference: v.debitReference,
            debit: v.debitAmount,
            credit: 0,
          });
        }
        // Check credit side (المقبوض له - دائن)
        if (v.creditAccountName === selectedAccount && v.creditCurrency === selectedCurrency) {
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
      const paymentVouchers = vouchers.filter(v => v.type === 'payment');
      
      // Check debit side (المصروف له - مدين)
      paymentVouchers.forEach(v => {
        if (v.debitAccountName === selectedAccount && v.debitCurrency === selectedCurrency) {
          allTransactions.push({
            date: v.date,
            type: 'صرف',
            description: v.debitDescription || 'سند صرف',
            reference: v.debitReference,
            debit: v.debitAmount,
            credit: 0,
          });
        }
        // Check credit side (المصروف منه - دائن)
        if (v.creditAccountName === selectedAccount && v.creditCurrency === selectedCurrency) {
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
      currencyExchanges.forEach(ex => {
        // From side (المحول منه - دائن)
        if (ex.fromAccountName === selectedAccount && ex.fromCurrency === selectedCurrency) {
          allTransactions.push({
            date: ex.date,
            type: 'صرف عملة',
            description: ex.description || 'صرف عملة',
            reference: ex.reference,
            debit: 0,
            credit: ex.fromAmount,
          });
        }
        // To side (المحول إليه - مدين)
        if (ex.toAccountName === selectedAccount && ex.toCurrency === selectedCurrency) {
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
        i.accountName === selectedAccount && i.currency === selectedCurrency && i.amount >= 0
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
        i.accountName === selectedAccount && i.currency === selectedCurrency && i.amount < 0
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

  const transactions = getTransactions();

  // Calculate running balance
  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    runningBalance += t.debit - t.credit;
    return { ...t, balance: runningBalance };
  });

  const handlePrintReport = () => {
    if (!showReport || !selectedAccount || !selectedCurrency) {
      toast.error('يرجى إنشاء التقرير أولاً');
      return;
    }
    
    const title = reportType === 'analytical' ? 'كشف حساب تحليلي' : 'كشف حساب إجمالي';
    const totals = {
      debit: transactionsWithBalance.reduce((sum, t) => sum + t.debit, 0),
      credit: transactionsWithBalance.reduce((sum, t) => sum + t.credit, 0),
      balance: runningBalance,
    };
    
    printReport({
      title,
      accountName: selectedAccount,
      currency: selectedCurrency,
      transactions: transactionsWithBalance,
      settings,
      totals,
    });
    
    toast.success('جاري طباعة التقرير...');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Report toolbar */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex flex-wrap gap-2 mb-4">
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
            onClick={() => toast.info('سيتم إضافة خاصية المشاركة قريباً')}
          >
            <Share2 className="w-4 h-4" />
            مشاركة
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => toast.info('سيتم إضافة خاصية التصدير قريباً')}
          >
            <FileText className="w-4 h-4" />
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

      {/* Report filters */}
      <Card className="m-4 animate-slide-up">
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
                  {currencies.map(curr => (
                    <SelectItem key={curr.id} value={curr.symbol}>
                      {curr.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">اسم الحساب</label>
              <AccountSearchInput
                accounts={filteredAccounts}
                value={selectedAccount}
                onSelect={setSelectedAccount}
                placeholder="ابحث عن الحساب..."
              />
            </div>
          </div>

          <Button onClick={generateReport} className="w-full" size="lg">
            <Eye className="w-4 h-4" />
            عرض التقرير
          </Button>
        </CardContent>
      </Card>

      {/* Report display */}
      {showReport && (
        <div className="flex-1 overflow-auto p-4 animate-fade-in">
          <Card>
            <CardHeader className="gradient-primary text-primary-foreground rounded-t-2xl">
              <CardTitle className="text-center">
                <p className="text-lg font-bold">
                  {reportType === 'analytical' ? 'كشف حساب تحليلي' : 'كشف حساب إجمالي'}
                </p>
                <p className="text-sm opacity-80 mt-1">{selectedAccount}</p>
                <p className="text-xs opacity-60 mt-1">العملة: {selectedCurrency}</p>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="grid grid-cols-7 gap-1 p-3 bg-secondary text-secondary-foreground text-xs font-semibold border-b">
                <div>التاريخ</div>
                <div>النوع</div>
                <div>البيان</div>
                <div>المرجع</div>
                <div className="text-left">مدين</div>
                <div className="text-left">دائن</div>
                <div className="text-left">الرصيد</div>
              </div>

              {/* Table body */}
              {transactionsWithBalance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد معاملات لهذا الحساب</p>
                </div>
              ) : (
                transactionsWithBalance.map((t, index) => (
                  <div 
                    key={index}
                    className="grid grid-cols-7 gap-1 p-3 text-xs border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="text-muted-foreground">{t.date}</div>
                    <div>{t.type}</div>
                    <div className="truncate">{t.description}</div>
                    <div className="text-muted-foreground">{t.reference || '-'}</div>
                    <div className="text-left text-success font-medium">
                      {t.debit > 0 ? t.debit.toLocaleString() : '-'}
                    </div>
                    <div className="text-left text-destructive font-medium">
                      {t.credit > 0 ? t.credit.toLocaleString() : '-'}
                    </div>
                    <div className={`text-left font-bold ${t.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {t.balance.toLocaleString()}
                    </div>
                  </div>
                ))
              )}

              {/* Summary footer */}
              {transactionsWithBalance.length > 0 && (
                <div className="grid grid-cols-7 gap-1 p-3 bg-muted text-sm font-bold border-t-2">
                  <div className="col-span-4">الإجمالي</div>
                  <div className="text-left text-success">
                    {transactionsWithBalance.reduce((sum, t) => sum + t.debit, 0).toLocaleString()}
                  </div>
                  <div className="text-left text-destructive">
                    {transactionsWithBalance.reduce((sum, t) => sum + t.credit, 0).toLocaleString()}
                  </div>
                  <div className={`text-left ${runningBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {runningBalance.toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
