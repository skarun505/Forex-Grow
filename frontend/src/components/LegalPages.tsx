import React, { useState, useEffect } from 'react';
import { ForexGrowLogo } from './ForexGrowLogo';
import { 
  ShieldAlert, 
  Lock, 
  RefreshCcw, 
  FileText, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Scale,
  Printer
} from 'lucide-react';

export type LegalTab = 'legal' | 'privacy' | 'refund' | 'terms';

interface LegalPagesProps {
  initialTab?: LegalTab;
  onBack?: () => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({
  initialTab = 'legal',
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: LegalTab) => {
    setActiveTab(tab);
    const path = tab === 'legal' ? '/legal' : tab === 'privacy' ? '/privacy' : tab === 'refund' ? '/refund-policy' : '/terms';
    window.history.pushState({}, '', path);
  };

  const handleBackToApp = () => {
    if (onBack) {
      onBack();
      return;
    }
    const hasTrader = localStorage.getItem('quotex_trader_user') || localStorage.getItem('quotex_current_user');
    const target = hasTrader ? '/' : '/login';
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#0e131d] text-gray-200 select-text font-sans">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-40 bg-[#141926]/95 backdrop-blur-md border-b border-[#232c40] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToApp}
            className="flex items-center space-x-1.5 text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Terminal</span>
          </button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <ForexGrowLogo size="sm" variant="trader" subtitle="Regulatory & Compliance Portal" />
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center space-x-1 text-xs font-bold text-gray-400 hover:text-white px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
            title="Print this official document"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md">
            v2026.4 Verified
          </span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Document Header Banner */}
        <div className="bg-gradient-to-r from-[#172033] to-[#121724] border border-[#26334d] rounded-2xl p-6 sm:p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full mb-3">
              <Scale className="w-3.5 h-3.5" />
              <span>Institutional Legal Documentation & Terms</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Regulatory Compliance, Risk & Governance
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-3xl leading-relaxed">
              Forex Grow operates high-frequency algorithmic electronic execution software for binary options, digital contracts, and Over-The-Counter (OTC) currency pairs. Review all policies, risk warnings, and non-refundable settlement conditions prior to submitting your verification OTP.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#232c40] pb-px overflow-x-auto scrollbar-none mb-8">
          <button
            onClick={() => handleTabChange('legal')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-black whitespace-nowrap transition border-b-2 ${
              activeTab === 'legal'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Legal Disclaimer & Risk</span>
          </button>

          <button
            onClick={() => handleTabChange('privacy')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-black whitespace-nowrap transition border-b-2 ${
              activeTab === 'privacy'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => handleTabChange('refund')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-black whitespace-nowrap transition border-b-2 ${
              activeTab === 'refund'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Return & Refund Policy</span>
          </button>

          <button
            onClick={() => handleTabChange('terms')}
            className={`flex items-center space-x-2 px-4 py-3 rounded-t-xl text-xs sm:text-sm font-black whitespace-nowrap transition border-b-2 ${
              activeTab === 'terms'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Document Body */}
        <div className="bg-[#141926] border border-[#232c40] rounded-2xl p-6 sm:p-10 shadow-xl leading-relaxed text-sm text-gray-300">
          
          {/* ================= TAB 1: LEGAL & RISK DISCLOSURE ================= */}
          {activeTab === 'legal' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Critical Disclosure
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Legal Disclaimer, Algorithmic Execution & High-Risk Warning
                </h2>
                <p className="text-xs text-gray-400 mt-1">Last Updated: November 2026</p>
              </div>

              {/* Critical Alert Box */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold mb-1">HIGH-RISK FINANCIAL CONTRACTS WARNING:</strong>
                  Trading digital contracts, binary options, and Over-The-Counter (OTC) foreign exchange involves an extraordinarily high level of capital risk and volatility. You may lose some or all of your deposited investment capital. Do not speculate with capital you cannot afford to lose.
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">1</span>
                  <span>Nature of Platform Software & Algorithmic Settlements</span>
                </h3>
                <p>
                  Forex Grow provides an electronic execution trading platform delivering aggregated real-time market data, technical chart visualization, and automated order settlement systems. The software operates on fixed-expiry contracts where the trader forecasts whether the price of an underlying asset will be higher or lower than the entry price at expiry.
                </p>
                <p>
                  Profit payouts (e.g. up to 95%) and loss calculations are strictly governed by the algorithmic quote feeds generated by our server engines at the exact millisecond of trade expiration. The trader acknowledges that micro-pip fluctuations, market volatility, and OTC pricing algorithms dictate real-time profit and loss calculations without manual intervention.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">2</span>
                  <span>Binding Agreement & Mandatory OTP Verification</span>
                </h3>
                <p>
                  <strong>Execution of Contract via One-Time Password (OTP):</strong> To maintain strict institutional security and prevent unauthorized identity spoofing, all account creation and administrative activations mandate 6-digit email OTP verification.
                </p>
                <div className="p-3.5 rounded-xl bg-[#0d111a] border border-[#2b354c] text-xs space-y-1.5 text-gray-300">
                  <p className="font-semibold text-emerald-400">
                    ✓ By providing, reading, or submitting the 6-digit OTP received via email to your assigned operations manager or directly into the terminal, you legally and unconditionally:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-400">
                    <li>Affirm that you are of legal age (at least 18 years old or legal age of majority in your jurisdiction).</li>
                    <li>Acknowledge that you have read, understood, and accepted the Terms of Service, Privacy Policy, Return & Refund Policy, and this Risk Disclosure.</li>
                    <li>Accept full financial and legal responsibility for all positions, trades, deposits, and losses registered to your account.</li>
                    <li>Acknowledge that all digital contract settlements are immediate and final.</li>
                  </ul>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">3</span>
                  <span>No Guarantee of Returns & No Financial Advisory</span>
                </h3>
                <p>
                  Forex Grow does NOT offer investment advice, guaranteed income schemes, financial planning, or fiduciary services. Past performance of any trading asset, strategy, signal, or community leaderboard member is never a guarantee or indicator of future trading results.
                </p>
                <p>
                  Trading software tools—including chart indicators (SMA, EMA, Bollinger Bands) and community sentiment bars—are mathematical representations intended solely for technical analysis, not financial directives.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">4</span>
                  <span>Regulatory Compliance & Anti-Money Laundering (AML)</span>
                </h3>
                <p>
                  Forex Grow enforces international Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) protocols. Traders must complete mandatory Aadhaar identity verification prior to any payout releases. Accounts engaging in suspicious arbitrage, multi-accounting, automated reverse-engineering, or unauthorized third-party proxy trading will be frozen and subject to institutional audit.
                </p>
              </section>
            </div>
          )}

          {/* ================= TAB 2: PRIVACY POLICY ================= */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  Data Governance
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Privacy Policy & Personal Data Protection
                </h2>
                <p className="text-xs text-gray-400 mt-1">Compliant with Global Data Standards & DPDP Act 2023</p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">1</span>
                  <span>Information We Collect</span>
                </h3>
                <p>
                  Forex Grow collects strictly necessary information required to facilitate secure financial trading, comply with regulatory statutory audits, and safeguard terminal operations:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Client Credentials:</strong> Full legal name, verified email address, mobile contact number, encrypted password hash.</li>
                  <li><strong>Aadhaar KYC Records:</strong> 12-digit Aadhaar Card number, full name as printed on government records, date of birth, gender, and front/back photograph document uploads.</li>
                  <li><strong>Banking & Settlement Information:</strong> Bank name, account number, IFSC code, account holder name, and UPI Virtual Payment Address (VPA).</li>
                  <li><strong>Session & Security Telemetry:</strong> IP addresses, browser fingerprint, operating system type, device session tokens, and dual-device concurrency logs to enforce multi-device limits.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">2</span>
                  <span>How Your Data is Utilized</span>
                </h3>
                <p>
                  Your personal data is used solely for the following lawful operational purposes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>Validating identity via 6-digit email OTP during account provisioning and password recovery.</li>
                  <li>Processing deposits and cross-verifying UTR transaction references with clearing rails.</li>
                  <li>Executing withdrawals exclusively to bank accounts where the registered beneficiary matches the verified Aadhaar identity.</li>
                  <li>Preventing cyber attacks, syndicated malicious trading, account takeover attempts, and money laundering.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">3</span>
                  <span>Encryption, Security & Storage Architecture</span>
                </h3>
                <p>
                  All sensitive data—including passwords, Aadhaar card images, and banking details—are protected utilizing enterprise-grade AES-256 bit encryption at rest and TLS 1.3 transport encryption across network sockets.
                </p>
                <p>
                  Staff desk managers operate under strict Role-Based Access Control (RBAC). Staff members cannot view plaintext client passwords or delete trader records. Every administrative action is logged to an immutable audit ledger.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-mono">4</span>
                  <span>Zero Third-Party Marketing Disclosures</span>
                </h3>
                <p>
                  Forex Grow does <strong>NOT</strong> sell, trade, rent, or lease your private personal information to third-party advertisers, call centers, or lead brokers. Information is shared strictly with accredited settlement gateways, transactional email infrastructure (Brevo), or regulatory authorities under compulsory lawful process.
                </p>
              </section>
            </div>
          )}

          {/* ================= TAB 3: RETURN & REFUND POLICY ================= */}
          {activeTab === 'refund' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Financial Terms
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Return, Cancellation & Refund Policy
                </h2>
                <p className="text-xs text-gray-400 mt-1">Non-Refundable Market Outcomes & Cashier Guidelines</p>
              </div>

              {/* Strict Notice Box */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-white font-bold mb-1">ALL TRADING LOSSES ARE FINAL & NON-REFUNDABLE:</strong>
                  Once an order or trade has been submitted on the terminal, it constitutes an instantaneous contract. Losses resulting from expired options, unfavorable market shifts, or trading decisions cannot be refunded under any circumstance.
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono">1</span>
                  <span>Irrevocability of Executed Market Orders</span>
                </h3>
                <p>
                  All binary options orders (CALL/PUT) placed on live real balances are entered directly into the automated execution engine. Once the duration timer reaches expiration:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>If the trade settles in-the-money (WON), the principal stake plus the specified payout percentage is credited immediately.</li>
                  <li>If the trade settles out-of-the-money (LOST), the invested amount is consumed by the market outcome and deducted permanently.</li>
                  <li>Settled contracts cannot be canceled, refunded, reversed, or charged back.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono">2</span>
                  <span>Unused Capital & Standard Withdrawals</span>
                </h3>
                <p>
                  Deposited funds that have <strong>NOT</strong> been committed to active market trades remain the property of the client. Traders may request a withdrawal of their uncommitted live real balance at any time through the platform Cashier.
                </p>
                <p>
                  All payout requests are processed according to our standard settlement rules:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>Mandatory verified Aadhaar KYC identity status.</li>
                  <li>Recipient bank account or UPI VPA must exactly match the trader's verified Aadhaar full name.</li>
                  <li>Payout settlements are cleared within standard banking working windows (typically 1 to 24 hours).</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono">3</span>
                  <span>Chargebacks & Banking Disputes</span>
                </h3>
                <p>
                  Filing an illegitimate chargeback, payment recall, or banking dispute for funds lost in normal market trading represents a material breach of contract and civil fraud. Any trader who initiates a chargeback will have their account immediately suspended, existing balances frozen, and identity submitted to inter-exchange risk registries.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono">4</span>
                  <span>Exceptional Technical Errors</span>
                </h3>
                <p>
                  If a trade was provably corrupted due to a verified hardware failure on our core server infrastructure (excluding local internet disruptions, mobile drops, or client latency), the trader must report the incident to <code className="text-sky-300">audit@forexgrow.com</code> within 24 hours with order identifiers. Remedial balance adjustments are issued at the sole discretion of the technical audit committee.
                </p>
              </section>
            </div>
          )}

          {/* ================= TAB 4: TERMS OF SERVICE ================= */}
          {activeTab === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Master Agreement
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  Terms of Service & Trading Floor Code of Conduct
                </h2>
                <p className="text-xs text-gray-400 mt-1">Institutional Platform Operating Agreement</p>
              </div>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">1</span>
                  <span>Eligibility & Account Issuance</span>
                </h3>
                <p>
                  Client trading accounts are issued exclusively through authorized Forex Grow operations personnel. By creating an account or validating registration through email OTP, you certify that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>You are acting solely on your own behalf and not as an undisclosed agent for third parties.</li>
                  <li>Your use of the service complies with all applicable local, national, and international financial regulations.</li>
                  <li>You will maintain the strict confidentiality of your password, OTP codes, and login credentials.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">2</span>
                  <span>Prohibited Trading Practices</span>
                </h3>
                <p>
                  The following practices are strictly prohibited on Forex Grow and constitute grounds for immediate account termination without refund:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Latency Arbitrage & Quote Manipulation:</strong> Exploiting network latency or artificial pricing discrepancies between broker feeds.</li>
                  <li><strong>Syndicated Account Ring Trading:</strong> Operating multiple correlated accounts to circumvent position limits or risk management parameters.</li>
                  <li><strong>Automated Unauthorized Web Scraping / Reverse Engineering:</strong> Decompiling or injecting malicious automated headless bots without API credentials.</li>
                  <li><strong>Deposit Laundering:</strong> Depositing funds without genuine trading intent solely to execute rapid withdrawals through unlinked payment channels.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">3</span>
                  <span>Account Tiering & Operational Mechanics</span>
                </h3>
                <p>
                  Account VIP tiers are calculated dynamically based strictly on verified real live funds:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>STANDARD:</strong> Balance below ₹1,00,000 (or $1,200). Standard payouts and classic order execution.</li>
                  <li><strong>PRO:</strong> Balance between ₹1,00,000 and ₹4,99,999.99 (or $1,200 - $5,999.99). Enhanced +2% payout booster on select major pairs.</li>
                  <li><strong>VIP:</strong> Balance ₹5,00,000 and above (or $6,000+). Maximum +4% payout booster, priority payout settlement clearance, and institutional liquidity routing.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">4</span>
                  <span>Severability & Governing Law</span>
                </h3>
                <p>
                  If any provision of these terms is determined to be invalid or unenforceable under applicable law, the remaining provisions shall continue in full force and effect. All disputes arising from trading contracts or operations shall be resolved through institutional arbitration in accordance with financial dispute resolution procedures.
                </p>
              </section>
            </div>
          )}

          {/* Official Bottom Stamp */}
          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-gray-400 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Certified Forex Grow Operational Compliance Ledger</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleTabChange('legal')}
                className="hover:text-emerald-400 transition"
              >
                Legal
              </button>
              <span>•</span>
              <button
                onClick={() => handleTabChange('privacy')}
                className="hover:text-emerald-400 transition"
              >
                Privacy
              </button>
              <span>•</span>
              <button
                onClick={() => handleTabChange('refund')}
                className="hover:text-emerald-400 transition"
              >
                Refunds
              </button>
              <span>•</span>
              <button
                onClick={() => handleTabChange('terms')}
                className="hover:text-emerald-400 transition"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e2638] bg-[#090c13] py-8 text-center text-xs text-gray-400">
        <p className="max-w-2xl mx-auto px-4 text-[11px] leading-relaxed">
          &copy; {new Date().getFullYear()} Forex Grow Institutional Markets Ltd. All rights reserved. By submitting your 6-digit OTP code, you legally agree to all policies, terms, and risk disclosures contained herein.
        </p>
      </footer>
    </div>
  );
};
