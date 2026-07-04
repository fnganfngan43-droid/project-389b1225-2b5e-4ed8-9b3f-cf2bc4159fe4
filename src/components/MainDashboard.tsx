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
import { SetupScreen } from '@/components/screens/SetupScreen';
import { OperationsScreen } from '@/components/screens/OperationsScreen';
import { ReconciliationScreen } from '@/components/screens/ReconciliationScreen';
import { useAccounting } from '@/contexts/AccountingContext';
import { ScreenType } from '@/types/accounting';

export function MainDashboard() {
  const { logout } = useAccounting();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('chart-of-accounts');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleScreenChange = (screen: ScreenType) => {
    setActiveScreen(screen);
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
      'setup': 'شاشة التهيئة',
      'operations': 'شاشة العمليات',
      'reconciliation': 'المطابقات',
    };
    return titles[activeScreen];
  };

  // Keep mounted screens alive to preserve their internal state across navigation.
  // Screens are mounted lazily on first visit, then hidden (not unmounted) when inactive.
  const [visited, setVisited] = useState<Set<ScreenType>>(new Set([activeScreen]));
  if (!visited.has(activeScreen)) {
    visited.add(activeScreen);
    setVisited(new Set(visited));
  }

  const screenMap: Partial<Record<ScreenType, JSX.Element>> = {
    'chart-of-accounts': <ChartOfAccountsScreen />,
    'receipt': <VoucherScreen type="receipt" />,
    'payment': <VoucherScreen type="payment" />,
    'sales': <SalesScreen />,
    'sales-return': <SalesScreen isReturn />,
    'opening-balance': <OpeningBalanceScreen />,
    'reports': <ReportsScreen />,
    'discount': <DiscountScreen />,
    'currency-exchange': <CurrencyExchangeScreen />,
    'currency-management': <CurrencyManagementScreen />,
    'governorate-management': <GovernorateManagementScreen />,
    'group-management': <AccountGroupManagementScreen />,
    'password-settings': <PasswordSettingsScreen />,
    'invoice-voucher-report': <InvoiceVoucherReportScreen />,
    'setup': <SetupScreen onBack={() => setActiveScreen('chart-of-accounts')} />,
    'operations': <OperationsScreen onBack={() => setActiveScreen('reports')} />,
    'reconciliation': <ReconciliationScreen />,
  };

  const renderScreens = () =>
    (Object.keys(screenMap) as ScreenType[])
      .filter((key) => visited.has(key))
      .map((key) => (
        <div
          key={key}
          className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeScreen === key ? '' : 'hidden'}`}
        >
          {screenMap[key]}
        </div>
      ));

  if (activeScreen === 'setup') {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <SetupScreen onBack={() => setActiveScreen('chart-of-accounts')} />
      </div>
    );
  }

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
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        {renderScreens()}
      </main>
      <SettingsDialog 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
