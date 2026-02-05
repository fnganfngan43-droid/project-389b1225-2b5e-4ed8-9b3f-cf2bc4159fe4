import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MainDashboard } from '@/components/MainDashboard';
import { AccountingProvider, useAccounting } from '@/contexts/AccountingContext';

function AccountingApp() {
  const { isLoggedIn } = useAccounting();
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
