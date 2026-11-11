import React, { useState, useEffect } from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Header } from './components/Header';
import { TradingChart } from './components/TradingChart';
import { OrderPanel } from './components/OrderPanel';
import { TradesDrawer } from './components/TradesDrawer';
import { AssetSelectorModal } from './components/AssetSelectorModal';
import { CashierModal } from './components/CashierModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { CurrencySwitcherModal } from './components/CurrencySwitcherModal';
import { TradeResultModal } from './components/TradeResultModal';
import { MobileNavBar } from './components/MobileNavBar';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginPage } from './components/LoginPage';

const MainLayout: React.FC = () => {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isMobileTradesOpen, setIsMobileTradesOpen] = useState(false);

  const { notification, theme } = useTrading();

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-200 ${
      theme === 'light' ? 'bg-[#f4f6f9] text-slate-800' : 'bg-[#121620] text-gray-100'
    }`}>
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-16 sm:top-20 left-1/2 transform -translate-x-1/2 z-50 bg-[#1e2333]/95 border border-trade-border text-white text-xs font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce flex items-center space-x-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Header
        onOpenAssetModal={() => setIsAssetModalOpen(true)}
        onOpenCashierModal={() => setIsCashierModalOpen(true)}
        onOpenLeaderboardModal={() => setIsLeaderboardModalOpen(true)}
        onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
      />

      {/* Main Trading Floor */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Left / Top: Chart & Desktop Trades Drawer */}
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden relative">
          <div className="flex-1 relative overflow-hidden w-full h-full min-h-0">
            <TradingChart />
          </div>

          {/* Desktop Trades Drawer (Visible only on lg screens) */}
          <TradesDrawer />
        </div>

        {/* Right / Bottom: Order Placement Ticket (Desktop sidebar + Mobile docked bar) */}
        <OrderPanel />

        {/* Mobile Trades Bottom Sheet Drawer */}
        {isMobileTradesOpen && (
          <TradesDrawer
            isMobileOpen={true}
            onCloseMobile={() => setIsMobileTradesOpen(false)}
          />
        )}
      </div>

      {/* Mobile Bottom Dock Bar */}
      <MobileNavBar
        onOpenAssetModal={() => setIsAssetModalOpen(true)}
        onOpenCashierModal={() => setIsCashierModalOpen(true)}
        onOpenLeaderboardModal={() => setIsLeaderboardModalOpen(true)}
        onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
        onToggleTradesDrawer={() => setIsMobileTradesOpen(!isMobileTradesOpen)}
        isTradesDrawerOpen={isMobileTradesOpen}
      />

      {/* Modals */}
      <AssetSelectorModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
      />

      <CashierModal
        isOpen={isCashierModalOpen}
        onClose={() => setIsCashierModalOpen(false)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
      />

      <CurrencySwitcherModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />

      {/* Trade Settlement Celebration / Outcome Modal */}
      <TradeResultModal />
    </div>
  );
};

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleCloseAdmin = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleLoginSuccess = (_user: any) => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
    // Trigger fresh load to sync provider
    window.location.reload();
  };

  const handleContinueAsGuest = () => {
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  if (currentPath === '/login' || currentPath === '/register') {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  return (
    <TradingProvider>
      {currentPath === '/admin' || currentPath === '/admin/' ? (
        <AdminDashboard onClose={handleCloseAdmin} />
      ) : (
        <MainLayout />
      )}
    </TradingProvider>
  );
};

export default App;
