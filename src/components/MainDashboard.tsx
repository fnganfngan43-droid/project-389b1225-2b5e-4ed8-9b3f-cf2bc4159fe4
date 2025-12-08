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
import { useAccounting } from '@/contexts/AccountingContext';
import { ScreenType } from '@/types/accounting';

export function MainDashboard() {
  const { logout } = useAccounting();
  const [activeScreen, setActiveScreen] = useState<ScreenType>('chart-of-accounts');
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      default:
        return <ChartOfAccountsScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainHeader 
        title={getScreenTitle()}
        onSettingsClick={() => setSettingsOpen(true)}
        onLogout={logout}
      />
      <NavigationBar 
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderScreen()}
      </main>
      <SettingsDialog 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
