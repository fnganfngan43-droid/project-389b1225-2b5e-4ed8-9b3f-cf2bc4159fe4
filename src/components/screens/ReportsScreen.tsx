import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccounting } from '@/contexts/AccountingContext';
import { printReport } from '@/utils/printService';
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

export function ReportsScreen() {
  const { accounts, groups, currencies, vouchers, invoices, settings } = useAccounting();
  const [reportType, setReportType] = useState<ReportType>('analytical');
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

  // Get transactions for selected account
  const accountVouchers = vouchers.filter(v => 
    v.accountName === selectedAccount && v.currency === selectedCurrency
  );
  const accountInvoices = invoices.filter(i => 
    i.accountName === selectedAccount && i.currency === selectedCurrency
  );

  const transactions = [
    ...accountVouchers.map(v => ({
      date: v.date,
      type: v.type === 'receipt' ? 'قبض' : 'صرف',
      description: v.description,
      reference: v.reference,
      debit: v.type === 'receipt' ? v.amount : 0,
      credit: v.type === 'payment' ? v.amount : 0,
    })),
    ...accountInvoices.map(i => ({
      date: i.date,
      type: i.amount >= 0 ? 'مبيعات' : 'مرتجع',
      description: i.description,
      reference: i.reference,
      debit: i.amount < 0 ? Math.abs(i.amount) : 0,
      credit: i.amount >= 0 ? i.amount : 0,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="receipts">قبض</SelectItem>
                  <SelectItem value="payments">صرف</SelectItem>
                  <SelectItem value="sales">مبيعات</SelectItem>
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
              <Select 
                value={selectedAccount} 
                onValueChange={setSelectedAccount}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.accountName}>
                      {acc.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
