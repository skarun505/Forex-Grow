import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { apiUrl } from '../utils/api';
import { ForexGrowLogo } from './ForexGrowLogo';
import { 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  Sun,
  Moon,
  HelpCircle,
  X,
  Copy,
  Check,
  CheckCircle,
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

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Email OTP Login States (Unlocked only after 5 failed password attempts)
  const [authMethod, setAuthMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [otpStep, setOtpStep] = useState<'INPUT_EMAIL' | 'ENTER_OTP'>('INPUT_EMAIL');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [loginDebugOtp, setLoginDebugOtp] = useState<string | null>(null);
  const [otpSuccessNotice, setOtpSuccessNotice] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [canUseOtp, setCanUseOtp] = useState(false);

  // Re-sync credentials if mode changes
  useEffect(() => {
    setIdentifier('');
    setPassword('');
    setErrorMsg(null);
  }, [mode]);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [concurrencyNotice, setConcurrencyNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedNotice = sessionStorage.getItem('quotex_forced_logout_reason');
      if (savedNotice) {
        setConcurrencyNotice(savedNotice);
        sessionStorage.removeItem('quotex_forced_logout_reason');
      }
    } catch {}
  }, []);

  // Determine if identifier is phone number or email
  const isPhoneIdentifier = /^[+0-9\s-()]+$/.test(identifier.trim()) && identifier.trim().length >= 3;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setConcurrencyNotice(null);

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

        if (data.token) {
          localStorage.setItem('forexgrow_auth_token', data.token);
          sessionStorage.setItem('forexgrow_tab_token', data.token);
        }

        if (mode === 'ADMIN') {
          localStorage.setItem('quotex_admin_user', JSON.stringify(data.user));
        } else if (mode === 'MANAGER') {
          localStorage.setItem('quotex_manager_user', JSON.stringify(data.user));
        } else {
          localStorage.setItem('quotex_trader_user', JSON.stringify(data.user));
          localStorage.setItem('quotex_current_user', JSON.stringify(data.user));
        }
        setFailedAttempts(0);
        setCanUseOtp(false);
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || 'Invalid credentials. Please verify your email/phone and password.');
        if (data.failedAttempts !== undefined) {
          setFailedAttempts(data.failedAttempts);
        } else {
          setFailedAttempts((prev) => prev + 1);
        }
        if (data.canUseOtp) {
          setCanUseOtp(true);
        }
      }
    } catch (err) {
      setErrorMsg('Unable to connect to trading auth server. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setOtpSuccessNotice(null);

    const cleanEmail = identifier.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive your login code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/send-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to send login code');
        return;
      }
      setOtpStep('ENTER_OTP');
      setLoginOtpCode('');
      setLoginDebugOtp(data.debugOtp || null);
      setOtpSuccessNotice(data.message || `A 6-digit login verification code was sent to ${cleanEmail}`);
    } catch {
      setErrorMsg('Unable to connect to auth server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginOtpCode.trim() || loginOtpCode.trim().length < 6) {
      setErrorMsg('Please enter the full 6-digit verification code');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/verify-login-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier.trim().toLowerCase(), otp: loginOtpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Invalid or expired verification code');
        return;
      }

      if (data.token) {
        localStorage.setItem('forexgrow_auth_token', data.token);
        sessionStorage.setItem('forexgrow_tab_token', data.token);
      }
      localStorage.setItem('quotex_trader_user', JSON.stringify(data.user));
      localStorage.setItem('quotex_current_user', JSON.stringify(data.user));
      setFailedAttempts(0);
      setCanUseOtp(false);
      onLoginSuccess(data.user);
    } catch {
      setErrorMsg('Failed to verify login code');
    } finally {
      setIsLoading(false);
    }
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
    <div
      className={`fixed inset-0 h-[100dvh] w-full flex flex-col justify-between overflow-y-auto overscroll-y-contain touch-pan-y z-50 selection:bg-emerald-500 selection:text-white font-sans transition-colors duration-200 pb-16 ${
        isLight ? 'bg-[#f4f7fb] text-slate-800' : 'bg-[#0a0d14] text-gray-100'
      }`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
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
          <ForexGrowLogo
            size="md"
            variant={mode === 'ADMIN' ? 'admin' : mode === 'MANAGER' ? 'manager' : 'trader'}
            badgeText={mode === 'ADMIN' ? 'MASTER ADMIN' : mode === 'MANAGER' ? 'OPERATIONS DESK' : 'PRO TERMINAL'}
            subtitle={
              mode === 'ADMIN'
                ? 'Liquidity Controller & Master Administration'
                : mode === 'MANAGER'
                ? 'Cashier Settlements & Operations Desk'
                : 'Institutional Binary Options & Multi-Asset Execution'
            }
          />
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
              {/* Concurrency Auto-Logout Warning Banner */}
              {concurrencyNotice && (
                <div className="bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs p-3.5 rounded-2xl flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-black text-amber-400 flex items-center space-x-1">
                      <span>⚠️ Auto-Logout Enforced</span>
                    </div>
                    <div className="text-[11px] mt-0.5 leading-relaxed text-amber-200">
                      {concurrencyNotice}
                    </div>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-2xl flex items-start space-x-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Security Rescue: Unlocked ONLY after 5 failed password attempts */}
              {(failedAttempts >= 5 || canUseOtp) && authMethod === 'PASSWORD' && mode === 'TRADER' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2 animate-in fade-in mb-4">
                  <div className="flex items-center justify-center space-x-1.5 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>5 Failed Password Attempts Detected</span>
                  </div>
                  <p className="text-[11px] text-gray-300">
                    For your security, you can now bypass your password and sign in using a 6-digit code sent to your email.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('OTP');
                      setOtpStep('INPUT_EMAIL');
                      setErrorMsg(null);
                    }}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Unlock &amp; Sign In with Email OTP</span>
                  </button>
                </div>
              )}

              {otpSuccessNotice && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-2xl flex items-center space-x-2 animate-in fade-in mb-3">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{otpSuccessNotice}</span>
                </div>
              )}

              {authMethod === 'OTP' && mode === 'TRADER' ? (
                /* Email OTP Login Flow */
                otpStep === 'INPUT_EMAIL' ? (
                  <form onSubmit={handleSendLoginOtp} className="space-y-4">
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                        Your Registered Email Address *
                      </label>
                      <div className={`flex items-center border rounded-2xl px-3.5 py-3 transition ${
                        isLight 
                          ? 'bg-slate-50 border-slate-200 focus-within:border-emerald-500' 
                          : 'bg-[#0a0d14] border-[#222a3d] focus-within:border-emerald-500/60'
                      }`}>
                        <Mail className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
                        <input
                          type="email"
                          required
                          autoFocus
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="e.g. trader@example.com"
                          className={`w-full bg-transparent text-sm focus:outline-none font-medium ${
                            isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                          }`}
                        />
                      </div>
                      <span className={`text-[10px] block mt-1 ${isLight ? 'text-slate-400' : 'text-gray-500'}`}>
                        A 6-digit one-time code will be dispatched to this email address.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl transition transform active:scale-[0.99] flex items-center justify-center space-x-2 bg-[#00c679] hover:bg-[#00e089] shadow-emerald-500/25"
                    >
                      {isLoading ? (
                        <span>Sending 6-Digit Code...</span>
                      ) : (
                        <>
                          <span>Send 6-Digit Login Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('PASSWORD');
                          setErrorMsg(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        ← Back to Password Login
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                      <span className="text-xs text-gray-300">Code dispatched to:</span>
                      <div className="font-mono font-bold text-amber-400 text-xs">
                        {identifier.trim()}
                      </div>
                    </div>

                    <div>
                      <label className={`text-xs font-bold block mb-1 text-center ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                        Enter 6-Digit Email Code *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full tracking-[8px] text-center text-xl font-mono font-black py-3 rounded-2xl border focus:outline-none bg-[#0a0d14] border-[#222a3d] text-emerald-400"
                      />
                      {loginDebugOtp && (
                        <button
                          type="button"
                          onClick={() => setLoginOtpCode(loginDebugOtp)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-mono underline block mx-auto mt-2"
                        >
                          ⚡ Auto-fill Security Code ({loginDebugOtp})
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full disabled:opacity-50 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl transition transform active:scale-[0.99] flex items-center justify-center space-x-2 bg-[#00c679] hover:bg-[#00e089] shadow-emerald-500/25"
                    >
                      {isLoading ? (
                        <span>Verifying Code...</span>
                      ) : (
                        <>
                          <span>Verify &amp; Enter Floor</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-center space-x-4 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep('INPUT_EMAIL');
                          setErrorMsg(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        ← Change Email
                      </button>
                      <span className="text-gray-600">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('PASSWORD');
                          setErrorMsg(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white underline"
                      >
                        Password Login
                      </button>
                    </div>
                  </form>
                )
              ) : (
                /* Standard Password Login Form */
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email or Phone Input */}
                  <div>
                    <label className={`text-xs font-bold block mb-1.5 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                      {mode === 'TRADER' ? 'Email Address or Mobile Number' : 'Administrator / Manager Email'}
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
                            ? 'raksha@forexgrow.com' 
                            : 'Email or Mobile Number (+91...)'
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
                      Direct Login • Fast Entry
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
              )}

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
                    Client trading accounts are issued exclusively through authorized Forex Grow Customer Care. If you need credentials or assistance, please contact Customer Care.
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

              {/* Institutional Security Notice */}
              <div className={`pt-3 border-t flex items-center justify-center space-x-2 text-[11px] ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-[#222a3d] text-gray-500'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-bit SSL Encrypted • Authorized Trading Access Only</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className={`w-full max-w-7xl mx-auto px-4 py-4 text-center text-xs z-10 flex flex-col md:flex-row items-center justify-between gap-3 border-t ${
        isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-gray-400'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Forex Grow Institutional Grade Execution • Private Managed Client Accounts</span>
        </div>

        {/* Legal Links */}
        <div className="flex items-center space-x-3 text-[11px] text-gray-400">
          <a
            href="/legal"
            onClick={(e) => { e.preventDefault(); navigateTo('/legal'); }}
            className="hover:text-emerald-400 transition"
          >
            Risk Disclosure
          </a>
          <span>•</span>
          <a
            href="/privacy"
            onClick={(e) => { e.preventDefault(); navigateTo('/privacy'); }}
            className="hover:text-emerald-400 transition"
          >
            Privacy Policy
          </a>
          <span>•</span>
          <a
            href="/refund-policy"
            onClick={(e) => { e.preventDefault(); navigateTo('/refund-policy'); }}
            className="hover:text-emerald-400 transition"
          >
            Return & Refund Policy
          </a>
          <span>•</span>
          <a
            href="/terms"
            onClick={(e) => { e.preventDefault(); navigateTo('/terms'); }}
            className="hover:text-emerald-400 transition"
          >
            Terms of Service
          </a>
        </div>

        <div>
          <span>&copy; {new Date().getFullYear()} Forex Grow Trading Ltd. All rights reserved.</span>
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
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black">Need Trading Access?</h3>
                <p className="text-xs text-gray-400">Official Desk Support Email</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Client accounts on Forex Grow are exclusively activated by Forex Grow Desk Administration. Contact our desk via email to receive your personalized client credentials.
            </p>

            <div className="space-y-2.5">
              <div className="p-4 rounded-2xl bg-black/25 border border-white/5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Desk Email Support</div>
                    <div className="text-[11px] text-gray-300 font-mono">support@forexgrow.com</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard('support@forexgrow.com', 'email')}
                    className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 flex items-center space-x-1 transition"
                  >
                    {copiedType === 'email' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'email' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href="mailto:support@forexgrow.com?subject=Trading%20Account%20Request%20-%20Forex%20Grow"
                    className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 transition"
                  >
                    <span>Send Email</span>
                  </a>
                </div>
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
