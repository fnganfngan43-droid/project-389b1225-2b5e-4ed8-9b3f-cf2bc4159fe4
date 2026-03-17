import { useState } from 'react';
import { MainHeader } from '@/components/MainHeader';
import { NavigationBar } from '@/components/NavigationBar';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ChartOfAccountsScreen } from '@/components/screens/ChartOfAccountsScreen';
import { VoucherScreen } from '@/components/screens/VoucherScreen';
import { SalesScreen } from '@/components/screens/SalesScreen';
import { OpeningBalanceScreen } from '@/components/screens/OpeningBalanceScreen';
import { ReportsScreen } from '@/components/screens/ReportsScreen';
import { DiscountScreen } from '@/components/screens/DiscountScreen';
import { CurrencyExchangeScreen } from '@/components/screens/CurrencyExchangeScreen';
import { CurrencyManagementScreen } from '@/components/screens/CurrencyManagementScreen';
import { GovernorateManagementScreen } from '@/components/screens/GovernorateManagementScreen';
import { AccountGroupManagementScreen } from '@/components/screens/AccountGroupManagementScreen';
import { PasswordSettingsScreen } from '@/components/screens/PasswordSettingsScreen';
import { InvoiceVoucherReportScreen } from '@/components/screens/InvoiceVoucherReportScreen';
import { useAccounting } from '@/contexts/AccountingContext';
import { ScreenType } from '@/types/accounting';

export function MainDashboard() {
  const { logout } = useAccounting();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('chart-of-accounts');
  const [screenResetKey, setScreenResetKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleScreenChange = (screen: ScreenType) => {
    setActiveScreen(screen);
    setScreenResetKey((prev) => prev + 1);
  };

  const getScreenTitle = () => {
    const titles: Record<ScreenType, string> = {
      'sales': 'المبيعات',
      'payment': 'سند صرف',
      'receipt': 'سند قبض',
      'opening-balance': 'الأرصدة الافتتاحية',
      'chart-of-accounts': 'الدليل المحاسبي',
      'reports': 'التقارير',
      'discount': 'الخصم',
      'sales-return': 'مرتجع المبيعات',
      'currency-exchange': 'صرف عملة',
      'currency-management': 'إدارة العملات',
      'governorate-management': 'إدارة المحافظات',
      'group-management': 'إدارة المجموعات',
      'password-settings': 'إعدادات كلمة المرور',
      'invoice-voucher-report': 'تقرير الفواتير والسندات',
    };
    return titles[activeScreen];
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'chart-of-accounts':
        return <ChartOfAccountsScreen />;
      case 'receipt':
        return <VoucherScreen type="receipt" />;
      case 'payment':
        return <VoucherScreen type="payment" />;
      case 'sales':
        return <SalesScreen />;
      case 'sales-return':
        return <SalesScreen isReturn />;
      case 'opening-balance':
        return <OpeningBalanceScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'discount':
        return <DiscountScreen />;
      case 'currency-exchange':
        return <CurrencyExchangeScreen />;
      case 'currency-management':
        return <CurrencyManagementScreen />;
      case 'governorate-management':
        return <GovernorateManagementScreen />;
      case 'group-management':
        return <AccountGroupManagementScreen />;
      case 'password-settings':
        return <PasswordSettingsScreen />;
      default:
        return <ChartOfAccountsScreen />;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <MainHeader 
        title={getScreenTitle()}
        onSettingsClick={() => setSettingsOpen(true)}
        onLogout={logout}
      />
      <NavigationBar 
        activeScreen={activeScreen}
        onScreenChange={handleScreenChange}
      />
      <main className="flex-1 flex flex-col overflow-hidden min-h-0" key={`${activeScreen}-${screenResetKey}`}>
        {renderScreen()}
      </main>
      <SettingsDialog 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
