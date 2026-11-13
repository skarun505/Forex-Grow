import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { apiUrl } from '../utils/api';
import { 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Zap,
  Sun,
  Moon,
  MessageCircle,
  Send,
  HelpCircle,
  X,
  Copy,
  Check,
  UserCheck
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onContinueAsGuest?: () => void;
  mode?: 'TRADER' | 'MANAGER' | 'ADMIN';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, mode = 'TRADER' }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('quotex_theme') as Theme) || 'dark');
  const isLight = theme === 'light';

  const toggleTheme = () => {
    const next = isLight ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('quotex_theme', next);
  };

  // Determine initial credentials based on mode
  const getDefaultIdentifier = () => {
    if (mode === 'ADMIN') return 'admin@forexgrow.com';
    if (mode === 'MANAGER') return 'manager@forexgrow.com';
    return 'alex.rivera@quotex.pro';
  };

  const getDefaultPassword = () => {
    if (mode === 'ADMIN') return 'admin123';
    if (mode === 'MANAGER') return 'manager123';
    return 'forexgrow123';
  };

  const [identifier, setIdentifier] = useState(getDefaultIdentifier);
  const [password, setPassword] = useState(getDefaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Re-sync credentials if mode changes
  useEffect(() => {
    setIdentifier(getDefaultIdentifier());
    setPassword(getDefaultPassword());
    setErrorMsg(null);
  }, [mode]);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Determine if identifier is phone number or email
  const isPhoneIdentifier = /^[+0-9\s-()]+$/.test(identifier.trim()) && identifier.trim().length >= 3;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg('Please enter your registered Email ID or Phone Number');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password }),
      });

      const data = await response.json();
      if (response.ok && data.success && data.user) {
        // Enforce role-based access for portal routes
        if (mode === 'ADMIN' && data.user.role !== 'ADMIN') {
          setErrorMsg('Access Denied: Super Administrator privileges are required to access this portal.');
          setIsLoading(false);
          return;
        }

        if (mode === 'MANAGER' && data.user.role !== 'MANAGER' && data.user.role !== 'ADMIN') {
          setErrorMsg('Access Denied: Operations Manager privileges are required to access this desk.');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('quotex_current_user', JSON.stringify(data.user));
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || 'Invalid credentials. Please verify your email/phone and password.');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to trading auth server. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (idValue: string, passValue: string) => {
    setIdentifier(idValue);
    setPassword(passValue);
    setErrorMsg(null);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`min-h-screen w-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-x-hidden font-sans transition-colors duration-200 ${
      isLight ? 'bg-[#f4f7fb] text-slate-800' : 'bg-[#0a0d14] text-gray-100'
    }`}>
      {/* Background Ambient Glows */}
      <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${
        mode === 'ADMIN' ? 'bg-purple-500/15' : mode === 'MANAGER' ? 'bg-sky-500/15' : 'bg-emerald-500/10'
      }`} />
      <div className={`absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none ${
        mode === 'ADMIN' ? 'bg-pink-500/10' : mode === 'MANAGER' ? 'bg-emerald-500/10' : 'bg-teal-500/10'
      }`} />

      {/* Top Navbar */}
      <header className={`w-full max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between z-10 border-b ${
        isLight ? 'border-slate-200' : 'border-white/5'
      }`}>
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo(mode === 'ADMIN' ? '/admin' : mode === 'MANAGER' ? '/manager' : '/')}>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg font-black text-sm text-slate-950 ${
            mode === 'ADMIN' 
              ? 'bg-gradient-to-tr from-purple-500 to-indigo-400 shadow-purple-500/25' 
              : mode === 'MANAGER' 
              ? 'bg-gradient-to-tr from-sky-400 to-emerald-400 shadow-sky-500/25' 
              : 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-600 shadow-emerald-500/25'
          }`}>
            FG
          </div>
          <div>
            <div className={`text-lg sm:text-xl font-black tracking-wider flex items-center space-x-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>FOREX GROW</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-lg font-bold border ${
                mode === 'ADMIN' 
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                  : mode === 'MANAGER' 
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' 
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
              }`}>
                {mode === 'ADMIN' ? 'MASTER ADMIN' : mode === 'MANAGER' ? 'OPERATIONS DESK' : 'PRO TERMINAL'}
              </span>
            </div>
            <p className={`text-[10px] tracking-wider uppercase font-semibold hidden sm:block ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              {mode === 'ADMIN' 
                ? 'Liquidity Controller & Master Administration' 
                : mode === 'MANAGER' 
                ? 'Cashier Settlements & Operations Desk' 
                : 'Institutional Binary Options & Multi-Asset Execution'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Desk Switcher for Internal Staff */}
          {mode === 'ADMIN' && (
            <button
              onClick={() => navigateTo('/manager')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
              }`}
            >
              Manager Desk →
            </button>
          )}

          {mode === 'MANAGER' && (
            <button
              onClick={() => navigateTo('/admin')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                isLight ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
              }`}
            >
              Admin Portal →
            </button>
          )}

          {mode === 'TRADER' && (
            <button
              onClick={() => setIsContactModalOpen(true)}
              className={`text-xs font-bold px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition flex items-center space-x-1.5 ${
                isLight
                  ? 'bg-white border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 shadow-sm'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Need an Account?</span>
            </button>
          )}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className={`p-2 sm:p-2.5 rounded-xl border transition ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm' 
                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
            title="Toggle Light / Dark mode"
          >
            {isLight ? <Moon className="w-4 h-4 text-sky-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Main Form Center Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-6 sm:py-10 z-10">
        <div className="w-full max-w-md space-y-4">
          <div className={`w-full rounded-3xl shadow-2xl backdrop-blur-2xl overflow-hidden border transition-colors ${
            isLight 
              ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/60' 
              : 'bg-[#121622]/90 border-[#222a3d] text-gray-100 shadow-2xl'
          }`}>
            {/* Header Badge */}
            <div className={`p-6 pb-4 border-b text-center ${
              isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-[#0f131c]/60 border-[#222a3d]/50'
            }`}>
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 border ${
                mode === 'ADMIN'
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                  : mode === 'MANAGER'
                  ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}>
                {mode === 'ADMIN' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>Master Admin Portal</span>
                  </>
                ) : mode === 'MANAGER' ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Operations Desk Authentication</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Authorized Client Login</span>
                  </>
                )}
              </div>

              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {mode === 'ADMIN' 
                  ? 'Master Administrator Sign In' 
                  : mode === 'MANAGER' 
                  ? 'Operations Desk Sign In' 
                  : 'Sign In to Your Account'}
              </h1>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                {mode === 'ADMIN'
                  ? 'Enter administrator credentials for liquidity & platform management'
                  : mode === 'MANAGER'
                  ? 'Enter manager credentials for cashier settlements & client servicing'
                  : 'Enter your Email ID or Registered Mobile Number and Password'}
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-4">
              {errorMsg && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-2xl flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email or Phone Input */}
                <div>
                  <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    {mode === 'TRADER' ? 'Email ID or Mobile Number' : 'Administrator / Manager Email'}
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20' 
                      : 'bg-[#0a0d14] border-[#222a3d] focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10'
                  }`}>
                    {isPhoneIdentifier ? (
                      <Phone className="w-4 h-4 text-emerald-400 mr-2.5 shrink-0" />
                    ) : (
                      <Mail className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    )}
                    <input
                      type="text"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        mode === 'ADMIN' 
                          ? 'admin@forexgrow.com' 
                          : mode === 'MANAGER' 
                          ? 'manager@forexgrow.com' 
                          : 'trader@forexgrow.com or +91 98765 43210'
                      }
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                    {identifier && (
                      <button
                        type="button"
                        onClick={() => setIdentifier('')}
                        className="text-gray-400 hover:text-gray-200 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <span className={`text-[10px] block mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                    {isPhoneIdentifier 
                      ? 'Mobile Number detected (direct login • no OTP required)' 
                      : mode === 'TRADER' 
                      ? 'Email address or international mobile number' 
                      : 'Official desk administrator email'}
                  </span>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Password
                    </label>
                    {mode === 'TRADER' && (
                      <button
                        type="button"
                        onClick={() => setIsContactModalOpen(true)}
                        className="text-[11px] text-emerald-500 hover:underline font-semibold"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20' 
                      : 'bg-[#0a0d14] border-[#222a3d] focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/10'
                  }`}>
                    <Lock className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-200 transition p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>Remember session</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Direct Login • No OTP
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl transition transform active:scale-[0.99] flex items-center justify-center space-x-2 ${
                    mode === 'ADMIN'
                      ? 'bg-gradient-to-r from-purple-400 via-indigo-400 to-purple-500 hover:from-purple-300 hover:to-indigo-300 shadow-purple-500/25'
                      : mode === 'MANAGER'
                      ? 'bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 hover:from-sky-300 hover:to-teal-300 shadow-sky-500/25'
                      : 'bg-[#00c679] hover:bg-[#00e089] shadow-emerald-500/25'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </span>
                  ) : (
                    <>
                      <span>
                        {mode === 'ADMIN' 
                          ? 'Enter Super Admin Dashboard' 
                          : mode === 'MANAGER' 
                          ? 'Enter Manager Desk' 
                          : 'Enter Trading Floor'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Mode-specific Notices */}
              {mode === 'TRADER' ? (
                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0f1420]/80 border-[#222a3d] text-gray-400'
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-gray-200 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className={isLight ? 'text-slate-800' : 'text-white'}>Managed Client Accounts Only</span>
                  </div>
                  <p className="text-[11px]">
                    Client trading accounts are issued exclusively through authorized Forex Grow Account Managers and Desk Administrators. If you need credentials, contact your account manager.
                  </p>
                </div>
              ) : (
                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#0f1420]/80 border-[#222a3d] text-gray-400'
                }`}>
                  <div className="flex items-center space-x-2 font-bold text-gray-200 mb-1">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className={isLight ? 'text-slate-800' : 'text-white'}>Restricted Desk Terminal</span>
                  </div>
                  <p className="text-[11px]">
                    {mode === 'ADMIN'
                      ? 'This portal provides global platform controls, asset payout tuning, and full database audit authority.'
                      : 'This portal provides cashier settlement approvals, KYC verification, and direct client account creation.'}
                  </p>
                </div>
              )}

              {/* Quick Trial Credentials for Testing/Evaluation */}
              <div className={`pt-2 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-[#222a3d]'}`}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span>{mode === 'ADMIN' ? 'Admin Portal Fill' : mode === 'MANAGER' ? 'Manager Desk Fill' : 'Quick Test Logins'}</span>
                  <span className="text-emerald-400">1-Tap Fill</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {mode === 'ADMIN' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fillQuickCredentials('admin@forexgrow.com', 'admin123')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-purple-50 border-purple-200' : 'bg-purple-950/20 border-purple-500/30'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Super Admin</div>
                          <div className="text-[9px] text-gray-400">admin@forexgrow.com</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('/manager')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#182030] border-[#29364f]'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Manager Desk</div>
                          <div className="text-[9px] text-gray-400">Switch to /manager</div>
                        </div>
                      </button>
                    </>
                  ) : mode === 'MANAGER' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => fillQuickCredentials('manager@forexgrow.com', 'manager123')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-sky-50 border-sky-200' : 'bg-sky-950/20 border-sky-500/30'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Manager Desk</div>
                          <div className="text-[9px] text-gray-400">manager@forexgrow.com</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('/admin')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#182030] border-[#29364f]'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Admin Portal</div>
                          <div className="text-[9px] text-gray-400">Switch to /admin</div>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => fillQuickCredentials('alex.rivera@quotex.pro', 'forexgrow123')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-[#182030] hover:bg-[#202a40] border-[#29364f]'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Trader (Email)</div>
                          <div className="text-[9px] text-gray-400">alex.rivera@quotex.pro</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => fillQuickCredentials('+15559876543', 'forexgrow123')}
                        className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                          isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-[#182030] hover:bg-[#202a40] border-[#29364f]'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="overflow-hidden leading-tight">
                          <div className={`text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Trader (Phone)</div>
                          <div className="text-[9px] text-gray-400">+15559876543</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className={`w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t ${
        isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-gray-500'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Forex Grow Institutional Grade Execution • Private Managed Client Accounts</span>
        </div>
        <div>
          <span>© 2026 Forex Grow Trading Ltd. All rights reserved.</span>
        </div>
      </footer>

      {/* Contact Manager Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl relative ${
            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#141926] border-[#283248] text-white'
          }`}>
            <button
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Need Trading Access?</h3>
                <p className="text-xs text-gray-400">Contact Forex Grow Desk Administration</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Client accounts on Forex Grow are exclusively created and activated by authorized operations managers. Contact our desk to obtain your personalized client ID and initial deposit.
            </p>

            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-black/25 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">WhatsApp Operations Desk</div>
                    <div className="text-[10px] text-gray-400">+1 (555) 000-2222</div>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('+1 (555) 000-2222', 'whatsapp')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1"
                >
                  {copiedType === 'whatsapp' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'whatsapp' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/25 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Telegram VIP Desk</div>
                    <div className="text-[10px] text-gray-400">@ForexGrowManager</div>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('@ForexGrowManager', 'telegram')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center space-x-1"
                >
                  {copiedType === 'telegram' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'telegram' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/25 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Desk Email</div>
                    <div className="text-[10px] text-gray-400">manager@forexgrow.com</div>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('manager@forexgrow.com', 'email')}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center space-x-1"
                >
                  {copiedType === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsContactModalOpen(false)}
              className="w-full mt-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold transition text-center"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
