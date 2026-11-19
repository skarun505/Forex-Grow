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
import { ManagerDashboard } from './components/ManagerDashboard';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KycModal } from './components/KycModal';
import { ProfileModal } from './components/ProfileModal';
import { LegalPages } from './components/LegalPages';

const MainLayout: React.FC = () => {
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isMobileTradesOpen, setIsMobileTradesOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const { notification, theme } = useTrading();

  return (
    <div className={`flex flex-col h-[100dvh] w-screen overflow-hidden select-none transition-colors duration-200 safe-top ${
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
        onOpenKycModal={() => setIsKycModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Main Trading Floor */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* Left / Top: Chart & Desktop Trades Drawer */}
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden relative">
          <div className="flex-1 relative overflow-hidden w-full h-full min-h-0">
            <TradingChart onOpenAssetModal={() => setIsAssetModalOpen(true)} />
          </div>

          {/* Desktop Trades Drawer (Visible only on lg screens) */}
          <TradesDrawer />
        </div>

        {/* Right / Bottom: Order Placement Ticket (Desktop sidebar + Mobile docked bar) */}
        <OrderPanel />

        {/* Mobile Trades Bottom Sheet Drawer with Touch Backdrop */}
        {isMobileTradesOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-in fade-in duration-200"
              onClick={() => setIsMobileTradesOpen(false)}
            />
            <TradesDrawer
              isMobileOpen={true}
              onCloseMobile={() => setIsMobileTradesOpen(false)}
            />
          </>
        )}
      </div>

      {/* Mobile Bottom Dock Bar */}
      <MobileNavBar
        onOpenAssetModal={() => setIsAssetModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
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

      <ErrorBoundary fallbackTitle="Payment Cashier">
        <CashierModal
          isOpen={isCashierModalOpen}
          onClose={() => setIsCashierModalOpen(false)}
          onOpenKycModal={() => {
            setIsCashierModalOpen(false);
            setIsKycModalOpen(true);
          }}
        />
      </ErrorBoundary>

      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
      />

      <CurrencySwitcherModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
      />

      {/* Aadhaar Identity KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
      />

      {/* Trader Profile & Account Center Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        onOpenCashierModal={() => setIsCashierModalOpen(true)}
        onOpenCurrencyModal={() => setIsCurrencyModalOpen(true)}
      />

      {/* Trade Settlement Celebration / Outcome Modal */}
      <TradeResultModal />
    </div>
  );
};

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Independent session storage per portal slug so all roles work in the same tab without collision
  const [traderUser, setTraderUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('quotex_trader_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return parsed && parsed.role === 'TRADER' ? parsed : null;
    } catch {
      return null;
    }
  });

  const [managerUser, setManagerUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('quotex_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('quotex_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      try {
        const savedTrader = localStorage.getItem('quotex_trader_user');
        const parsedTrader = savedTrader ? JSON.parse(savedTrader) : null;
        setTraderUser(parsedTrader && parsedTrader.role === 'TRADER' ? parsedTrader : null);
      } catch {
        setTraderUser(null);
      }
      try {
        const savedManager = localStorage.getItem('quotex_manager_user');
        setManagerUser(savedManager ? JSON.parse(savedManager) : null);
      } catch {
        setManagerUser(null);
      }
      try {
        const savedAdmin = localStorage.getItem('quotex_admin_user');
        setAdminUser(savedAdmin ? JSON.parse(savedAdmin) : null);
      } catch {
        setAdminUser(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleAdminLoginSuccess = (user: any) => {
    setAdminUser(user);
    localStorage.setItem('quotex_admin_user', JSON.stringify(user));
    navigateTo('/admin');
  };

  const handleManagerLoginSuccess = (user: any) => {
    setManagerUser(user);
    localStorage.setItem('quotex_manager_user', JSON.stringify(user));
    navigateTo('/manager');
  };

  const handleTraderLoginSuccess = (user: any) => {
    setTraderUser(user);
    localStorage.setItem('quotex_trader_user', JSON.stringify(user));
    localStorage.setItem('quotex_current_user', JSON.stringify(user));
    navigateTo('/');
  };

  // ================= PUBLIC REGULATORY & LEGAL PAGES =================
  if (currentPath === '/privacy' || currentPath === '/privacy-policy') {
    return <LegalPages initialTab="privacy" onBack={() => navigateTo(traderUser ? '/' : '/login')} />;
  }
  if (currentPath === '/refund' || currentPath === '/refund-policy' || currentPath === '/returns') {
    return <LegalPages initialTab="refund" onBack={() => navigateTo(traderUser ? '/' : '/login')} />;
  }
  if (currentPath === '/legal' || currentPath === '/legal-disclaimer') {
    return <LegalPages initialTab="legal" onBack={() => navigateTo(traderUser ? '/' : '/login')} />;
  }
  if (currentPath === '/terms' || currentPath === '/terms-of-service') {
    return <LegalPages initialTab="terms" onBack={() => navigateTo(traderUser ? '/' : '/login')} />;
  }

  // ================= 1. ADMIN PORTAL SLUG (/admin) =================
  const isAdminPath = currentPath === '/admin' || currentPath === '/admin/' || currentPath.startsWith('/admin/');
  if (isAdminPath) {
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return (
        <LoginPage
          mode="ADMIN"
          onLoginSuccess={handleAdminLoginSuccess}
        />
      );
    }
    return (
      <TradingProvider>
        <ErrorBoundary fallbackTitle="Admin Portal">
          <AdminDashboard />
        </ErrorBoundary>
      </TradingProvider>
    );
  }

  // ================= 2. MANAGER DESK SLUG (/manager) =================
  const isManagerPath = currentPath === '/manager' || currentPath === '/manager/' || currentPath.startsWith('/manager/');
  if (isManagerPath) {
    if (!managerUser || (managerUser.role !== 'MANAGER' && managerUser.role !== 'ADMIN')) {
      return (
        <LoginPage
          mode="MANAGER"
          onLoginSuccess={handleManagerLoginSuccess}
        />
      );
    }
    return (
      <TradingProvider>
        <ErrorBoundary fallbackTitle="Manager Desk">
          <ManagerDashboard />
        </ErrorBoundary>
      </TradingProvider>
    );
  }

  // ================= 3. TRADER TERMINAL SLUG (/ or /login) =================
  if (!traderUser || currentPath === '/login' || currentPath === '/register') {
    // If user is not logged in and typed an arbitrary URL (like /co), cleanly normalize URL to /login
    if (!traderUser && currentPath !== '/login' && currentPath !== '/register') {
      window.history.replaceState({}, '', '/login');
    }
    return (
      <LoginPage
        mode="TRADER"
        onLoginSuccess={handleTraderLoginSuccess}
      />
    );
  }

  // If authenticated trader entered an unknown or stale subpath (e.g. /co, /abc), normalize to '/'
  if (currentPath !== '/') {
    window.history.replaceState({}, '', '/');
  }

  // Authenticated Trader Terminal Floor
  return (
    <TradingProvider>
      <ErrorBoundary fallbackTitle="Trading Floor">
        <MainLayout />
      </ErrorBoundary>
    </TradingProvider>
  );
};

export default App;
