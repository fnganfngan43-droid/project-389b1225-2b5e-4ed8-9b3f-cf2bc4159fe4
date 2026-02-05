import { MainDashboard } from '@/components/MainDashboard';
import { AccountingProvider } from '@/contexts/AccountingContext';

const Index = () => {
  return (
    <AccountingProvider>
      <MainDashboard />
    </AccountingProvider>
  );
};

export default Index;
