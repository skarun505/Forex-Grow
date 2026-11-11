import React, { useState } from 'react';
import { CurrencyCode, Theme } from '../types';
import { CURRENCY_CONFIGS } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Zap,
  Globe2,
  Sun,
  Moon
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('quotex_theme') as Theme) || 'dark');
  const isLight = theme === 'light';

  const toggleTheme = () => {
    const next = isLight ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('quotex_theme', next);
  };

  // Login form state
  const [loginEmail, setLoginEmail] = useState('alex.rivera@quotex.pro');
  const [loginPassword, setLoginPassword] = useState('forexgrow123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCurrency, setRegCurrency] = useState<CurrencyCode>('INR');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (data.success && data.user) {
        localStorage.setItem('quotex_current_user', JSON.stringify(data.user));
        setSuccessMsg(`Welcome to Forex Grow, ${data.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 500);
      } else {
        setErrorMsg(data.error || 'Invalid credentials');
      }
    } catch (err) {
      // Fallback demo user if server offline
      const fallbackUser = {
        id: 'usr_quotex_vip_99',
        name: 'Alex Rivera',
        email: loginEmail || 'alex.rivera@quotex.pro',
        demoBalance: 10000,
        realBalance: 500,
        activeAccountType: 'DEMO',
        currency: 'USD',
        vipLevel: 'VIP',
      };
      localStorage.setItem('quotex_current_user', JSON.stringify(fallbackUser));
      onLoginSuccess(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim() || !regEmail.trim()) {
      setErrorMsg('Please enter your full name and email address');
      return;
    }
    if (!agreedTerms) {
      setErrorMsg('Please confirm you are at least 18 years old');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          currency: regCurrency,
          password: regPassword,
        }),
      });

      const data = await response.json();
      if (data.success && data.user) {
        localStorage.setItem('quotex_current_user', JSON.stringify(data.user));
        setSuccessMsg(`Account created! Welcome to Forex Grow, ${data.user.name}`);
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        setErrorMsg(data.error || 'Failed to register account');
      }
    } catch (err) {
      setErrorMsg('Could not connect to authentication server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (userEmail: string) => {
    setLoginEmail(userEmail);
    setLoginPassword('forexgrow123');
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleLogin(fakeEvent);
    }, 100);
  };

  return (
    <div className={`min-h-screen w-screen flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors ${
      isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#0d111a] text-gray-100'
    }`}>
      {/* Background Glow Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <header className={`w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between z-10 border-b ${
        isLight ? 'border-slate-200' : 'border-white/5'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black text-sm">
            FG
          </div>
          <div>
            <span className={`text-xl font-black tracking-wider flex items-center space-x-1.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <span>FOREX GROW</span>
              <span className="text-emerald-500 text-xs px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 rounded font-bold">
                PRO
              </span>
            </span>
            <p className={`text-[10px] tracking-wider uppercase font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
              High Precision Binary & Forex Terminal
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition ${
              isLight ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-white/5 border-white/10 text-gray-300 hover:text-white'
            }`}
          >
            {isLight ? <Moon className="w-4 h-4 text-sky-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={onContinueAsGuest}
            className={`text-xs font-bold px-4 py-2 rounded-xl border transition flex items-center space-x-2 ${
              isLight 
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' 
                : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>Free Demo Practice ($10,000)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        </div>
      </header>

      {/* Main Form Center Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className={`w-full max-w-md rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden border transition-colors ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-[#131926]/90 border-[#222c3f] text-gray-100 shadow-2xl'
        }`}>
          {/* Segmented Auth Tabs */}
          <div className={`grid grid-cols-2 border-b ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0c1018] border-[#222c3f]'
          }`}>
            <button
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMsg(null);
              }}
              className={`py-4 text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'LOGIN'
                  ? isLight 
                    ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                    : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#131926]'
                  : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMsg(null);
              }}
              className={`py-4 text-xs font-black uppercase tracking-wider transition ${
                activeTab === 'REGISTER'
                  ? isLight 
                    ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                    : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#131926]'
                  : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {errorMsg && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'LOGIN' ? (
              /* Sign In Form */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Email Address
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#0d121c] border-[#222c3f] focus-within:border-emerald-500/60'
                  }`}>
                    <Mail className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="trader@forexgrow.com"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      Password
                    </label>
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-[11px] text-emerald-500 hover:underline">
                      Forgot Password?
                    </a>
                  </div>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#0d121c] border-[#222c3f] focus-within:border-emerald-500/60'
                  }`}>
                    <Lock className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-0"
                    />
                    <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>Remember session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In to Forex Grow</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Fast-Track Demo Logins */}
                <div className={`pt-3 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-[#222c3f]'}`}>
                  <span className={`text-[10px] uppercase font-bold tracking-wider block text-center ${
                    isLight ? 'text-slate-500' : 'text-gray-400'
                  }`}>
                    1-Click Fast Trial Logins
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('alex.rivera@quotex.pro')}
                      className={`py-2.5 px-3 border rounded-xl text-left transition flex items-center space-x-2 ${
                        isLight 
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' 
                          : 'bg-[#182030] hover:bg-[#202a40] border-[#2a3752]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <div className="overflow-hidden">
                        <div className={`text-[11px] font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Alex Rivera</div>
                        <div className="text-[9px] text-gray-400">VIP Pro Trader</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('sat@block.org')}
                      className={`py-2.5 px-3 border rounded-xl text-left transition flex items-center space-x-2 ${
                        isLight 
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' 
                          : 'bg-[#182030] hover:bg-[#202a40] border-[#2a3752]'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <div className="overflow-hidden">
                        <div className={`text-[11px] font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>Satoshi N.</div>
                        <div className="text-[9px] text-gray-400">$15,420 Live</div>
                      </div>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              /* Create Account Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Full Name
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#0d121c] border-[#222c3f] focus-within:border-emerald-500/60'
                  }`}>
                    <User className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Email Address
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#0d121c] border-[#222c3f] focus-within:border-emerald-500/60'
                  }`}>
                    <Mail className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="trader@forexgrow.com"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Set Password
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#0d121c] border-[#222c3f] focus-within:border-emerald-500/60'
                  }`}>
                    <Lock className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                        isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Primary Account Currency */}
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Primary Trading Currency
                  </label>
                  <div className={`flex items-center border rounded-2xl px-3.5 py-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#0d121c] border-[#222c3f]'
                  }`}>
                    <Globe2 className="w-4 h-4 text-emerald-500 mr-2.5 shrink-0" />
                    <select
                      value={regCurrency}
                      onChange={(e) => setRegCurrency(e.target.value as CurrencyCode)}
                      className={`w-full bg-transparent text-sm font-bold focus:outline-none cursor-pointer ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {Object.values(CURRENCY_CONFIGS).map((c) => (
                        <option key={c.code} value={c.code} className="bg-[#121622] text-white">
                          {c.flag} {c.code} - {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1">
                  <label className={`flex items-start space-x-2.5 text-xs cursor-pointer ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-500 focus:ring-0 shrink-0"
                    />
                    <span>
                      I confirm that I am at least 18 years of age and accept Forex Grow Terms & Risk Disclosure.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Register on Forex Grow</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className={`w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t ${
        isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-gray-500'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Forex Grow Institutional Grade Execution • Instant UPI & Bank Settlement</span>
        </div>
        <div>
          <span>© 2026 Forex Grow Trading Ltd. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};
