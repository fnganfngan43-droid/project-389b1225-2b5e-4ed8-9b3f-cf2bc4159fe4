import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MainDashboard } from '@/components/MainDashboard';
import { AccountingProvider, useAccounting } from '@/contexts/AccountingContext';
import { useAutoBackup } from '@/hooks/useAutoBackup';

function AccountingApp() {
  const { isLoggedIn } = useAccounting();
  useAutoBackup();
  return isLoggedIn ? <MainDashboard /> : <WelcomeScreen />;
}

const Index = () => {
  return (
    <AccountingProvider>
      <AccountingApp />
    </AccountingProvider>
  );
};

export default Index;
