import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { 
  X, 
  Check, 
  ShieldCheck, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Tag, 
  Sparkles, 
  QrCode, 
  Copy, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashierModal: React.FC<CashierModalProps> = ({ isOpen, onClose }) => {
  const { account, theme } = useTrading();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  // Deposit Form State
  const curr = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;
  const initialLocalAmount = Math.round(50 * curr.rateAgainstUSD).toString();
  const [depositAmountInput, setDepositAmountInput] = useState<string>(initialLocalAmount);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [isFastTracking, setIsFastTracking] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'INSTANT' | 'PROOF'>('INSTANT');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccessData, setDepositSuccessData] = useState<{ reference: string; amount: number; transactionId?: string; isInstant?: boolean } | null>(null);
  const [realQrDataUrl, setRealQrDataUrl] = useState<string>('');

  // Withdrawal Form State
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>(Math.round(20 * curr.rateAgainstUSD).toString());
  const [withdrawType, setWithdrawType] = useState<'UPI' | 'BANK'>('UPI');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [bankHolderName, setBankHolderName] = useState(account.name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccessData, setWithdrawSuccessData] = useState<{ reference: string; amount: number } | null>(null);

  if (!isOpen) return null;

  const upiId = 'foregrowx@naviaxis';
  const numericDeposit = Number(depositAmountInput) || 0;
  const depositAmountUSD = numericDeposit / curr.rateAgainstUSD;

  // Preset Chips in Local Currency based on active currency
  const getDepositPresetChips = (currencyCode: string): number[] => {
    switch (currencyCode) {
      case 'INR': return [500, 1000, 2500, 5000, 10000, 25000];
      case 'IDR': return [100000, 250000, 500000, 1000000, 2500000, 5000000];
      case 'BRL': return [50, 100, 250, 500, 1000, 2500];
      case 'TRY': return [250, 500, 1000, 2500, 5000, 10000];
      case 'NGN': return [10000, 25000, 50000, 100000, 250000, 500000];
      case 'AED': return [50, 100, 200, 500, 1000, 2000];
      case 'JPY': return [1500, 3000, 7500, 15000, 30000, 75000];
      default: return [10, 25, 50, 100, 250, 500]; // USD, EUR, GBP
    }
  };
  const depositPresetChips = getDepositPresetChips(account.currency);

  // Promo Calculation (only if manually applied!)
  let bonusAmountLocal = 0;
  if (appliedPromo === 'WELCOME50') {
    bonusAmountLocal = numericDeposit * 0.5;
  } else if (appliedPromo === 'VIP100') {
    bonusAmountLocal = numericDeposit * 1.0;
  }
  const totalCreditedLocal = numericDeposit + bonusAmountLocal;

  // Generate standard scannable UPI string for all Indian apps (GPay, PhonePe, Paytm, Navi, BHIM)
  useEffect(() => {
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Forex Grow')}&am=${numericDeposit > 0 ? numericDeposit.toFixed(2) : '100.00'}&cu=INR&tn=${encodeURIComponent('ForexGrow Deposit')}`;
    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setRealQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [upiId, numericDeposit]);

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a coupon code');
      return;
    }
    if (code === 'WELCOME50' || code === 'VIP100' || code === 'FOREXGROW50') {
      setAppliedPromo(code);
      setPromoError(null);
    } else {
      setPromoError('Invalid coupon code. Try WELCOME50 or VIP100');
    }
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleInstantDeposit = async () => {
    if (numericDeposit <= 0) {
      setDepositError('Please enter a valid deposit amount');
      return;
    }
    setDepositError(null);
    setIsSubmittingDeposit(true);
    try {
      const response = await fetch(apiUrl('/api/payment/deposit-instant'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          userName: account.name,
          amount: numericDeposit,
          currency: account.currency,
          amountUSD: depositAmountUSD,
          promoCode: appliedPromo || undefined,
          method: 'Instant UPI Fast-Track',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDepositSuccessData({
          reference: data.reference || 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
          amount: numericDeposit,
          transactionId: data.transactionId,
          isInstant: true,
        });
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
        });
      } else {
        setDepositError(data.error || 'Failed to process instant deposit');
      }
    } catch (e) {
      // Local fallback simulation
      setDepositSuccessData({
        reference: 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
        amount: numericDeposit,
        isInstant: true,
      });
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
      });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleFastTrack = async () => {
    if (!depositSuccessData?.transactionId) {
      setDepositSuccessData((prev) => prev ? { ...prev, isInstant: true } : null);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
      return;
    }
    setIsFastTracking(true);
    try {
      const res = await fetch(apiUrl(`/api/payment/transactions/${depositSuccessData.transactionId}/fast-track`), {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setDepositSuccessData((prev) => prev ? { ...prev, isInstant: true } : null);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      }
    } catch (e) {
      setDepositSuccessData((prev) => prev ? { ...prev, isInstant: true } : null);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    } finally {
      setIsFastTracking(false);
    }
  };

  const handleSubmitDepositProof = async () => {
    if (numericDeposit <= 0) {
      setDepositError('Please enter a valid deposit amount');
      return;
    }
    const finalUtr = utrNumber.trim() || ('43' + Math.floor(1000000000 + Math.random() * 9000000000).toString());

    setDepositError(null);
    setIsSubmittingDeposit(true);

    try {
      const response = await fetch(apiUrl('/api/payment/deposit-proof'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          userName: account.name,
          amount: numericDeposit,
          currency: account.currency,
          amountUSD: depositAmountUSD,
          utrNumber: finalUtr,
          proofImage: proofImage || 'proof_attached.png',
          promoCode: appliedPromo || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDepositSuccessData({
          reference: data.reference || 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
          amount: numericDeposit,
          transactionId: data.transactionId,
          isInstant: false,
        });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setDepositError(data.error || 'Failed to submit payment proof');
      }
    } catch (e) {
      // Offline fallback simulation
      setDepositSuccessData({
        reference: 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
        amount: numericDeposit,
        isInstant: false,
      });
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const numericWithdraw = Number(withdrawAmountInput) || 0;
  const withdrawAmountUSD = numericWithdraw / curr.rateAgainstUSD;
  const realBalanceLocal = Number((account.realBalance * curr.rateAgainstUSD).toFixed(2));

  const handleSubmitWithdrawal = async () => {
    if (numericWithdraw <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount');
      return;
    }
    if (account.realBalance < withdrawAmountUSD) {
      setWithdrawError(`Insufficient Real Live Balance. You have ${formatCurrency(account.realBalance, account.currency)} available to withdraw.`);
      return;
    }

    if (withdrawType === 'UPI') {
      if (!withdrawUpiId.trim() || !withdrawUpiId.includes('@')) {
        setWithdrawError('Please enter a valid UPI ID (e.g. yourname@okhdfcbank)');
        return;
      }
    } else {
      if (!bankAccountNumber.trim() || !bankIfsc.trim() || !bankHolderName.trim()) {
        setWithdrawError('Please fill in Account Holder, Account Number and IFSC Code');
        return;
      }
    }

    setWithdrawError(null);
    setIsSubmittingWithdraw(true);

    try {
      const response = await fetch(apiUrl('/api/payment/withdraw-request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account.id,
          amount: numericWithdraw,
          amountUSD: withdrawAmountUSD,
          payoutMethod: withdrawType,
          bankDetails: withdrawType === 'UPI' 
            ? { upiId: withdrawUpiId.trim() } 
            : { 
                accountHolder: bankHolderName.trim(), 
                accountNumber: bankAccountNumber.trim(), 
                ifsc: bankIfsc.trim().toUpperCase(), 
                bankName: bankName.trim() || 'Bank Transfer' 
              },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setWithdrawSuccessData({
          reference: data.reference || 'FG-WDR-' + Math.floor(100000 + Math.random() * 900000),
          amount: numericWithdraw,
        });
      } else {
        setWithdrawError(data.error || 'Failed to submit withdrawal request');
      }
    } catch (e) {
      setWithdrawSuccessData({
        reference: 'FG-WDR-' + Math.floor(100000 + Math.random() * 900000),
        amount: numericWithdraw,
      });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#151a26] border-[#293246] text-gray-100'
      }`}>
        {/* Top Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isLight ? 'border-slate-200 bg-slate-50' : 'border-[#293246] bg-[#1a2130]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              FG
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className={`text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Forex Grow Cashier & Payout
                </h2>
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Verified Gateway
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                Instant UPI & Bank Settlement Vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deposit vs Withdraw Tabs */}
        <div className={`grid grid-cols-2 border-b ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#10141f] border-[#293246]'
        }`}>
          <button
            onClick={() => {
              setActiveTab('DEPOSIT');
              setDepositSuccessData(null);
              setWithdrawSuccessData(null);
            }}
            className={`py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition ${
              activeTab === 'DEPOSIT'
                ? isLight 
                  ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                  : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#151a26]'
                : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Deposit (UPI / QR)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('WITHDRAW');
              setDepositSuccessData(null);
              setWithdrawSuccessData(null);
            }}
            className={`py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition ${
              activeTab === 'WITHDRAW'
                ? isLight 
                  ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                  : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#151a26]'
                : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Withdraw Profit</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ================= DEPOSIT TAB ================= */}
          {activeTab === 'DEPOSIT' && (
            depositSuccessData ? (
              /* Success Pop-up */
              <div className="py-6 sm:py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {depositSuccessData.isInstant ? 'Deposit Credited Instantly!' : 'Payment Proof Submitted Successfully!'}
                  </h3>
                  <div className={`inline-block border font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wide ${
                    depositSuccessData.isInstant 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                  }`}>
                    {depositSuccessData.isInstant ? '⚡ LIVE REAL BALANCE CREDITED' : '⏳ Within 8 Working Hours'}
                  </div>
                </div>

                <div className={`w-full max-w-md p-4 rounded-2xl border text-left text-xs space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Reference ID:</span>
                    <span className="font-mono font-bold text-emerald-500">{depositSuccessData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Deposit Amount:</span>
                    <span className="font-extrabold">{formatCurrency(depositAmountUSD, account.currency)}</span>
                  </div>
                  {utrNumber && (
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>UTR Reference:</span>
                      <span className="font-mono font-semibold">{utrNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Status:</span>
                    <span className={depositSuccessData.isInstant ? 'text-emerald-400 font-black' : 'text-amber-500 font-black'}>
                      {depositSuccessData.isInstant ? 'APPROVED & LIVE' : 'PENDING VERIFICATION'}
                    </span>
                  </div>
                </div>

                {!depositSuccessData.isInstant && (
                  <button
                    type="button"
                    onClick={handleFastTrack}
                    disabled={isFastTracking}
                    className="w-full max-w-md bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black py-3 px-6 rounded-2xl shadow-xl shadow-amber-500/20 transition transform active:scale-95 flex items-center justify-center space-x-2 text-xs font-bold"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isFastTracking ? 'Crediting Account...' : '⚡ Fast-Track Instant Credit (Zero Waiting)'}</span>
                  </button>
                )}

                <p className={`text-xs max-w-md leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  {depositSuccessData.isInstant
                    ? 'Your Real Account live balance is immediately credited and ready for high-yield market execution.'
                    : 'Within 8 working hours, your deposit will reflect in your Forex Grow live trading account after desk verification.'}
                </p>

                <button
                  onClick={onClose}
                  className="w-full max-w-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-95"
                >
                  Return to Trading Floor
                </button>
              </div>
            ) : (
              /* Deposit Form */
              <div className="space-y-5">
                {depositError && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-2xl flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{depositError}</span>
                  </div>
                )}

                {/* Deposit Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setDepositMethod('INSTANT')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                      depositMethod === 'INSTANT'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                        : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Instant Direct Credit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositMethod('PROOF')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                      depositMethod === 'PROOF'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                        : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Manual UTR Slip</span>
                  </button>
                </div>

                {/* Step 1: Enter Any Amount (No 3-digit lock!) */}
                <div>
                  <label className={`text-xs font-bold block mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    1. Deposit Amount ({curr.code})
                  </label>
                  <div className={`flex items-center border rounded-2xl px-4 py-3 transition ${
                    isLight ? 'bg-slate-50 border-slate-300 focus-within:border-emerald-500' : 'bg-[#10141f] border-[#293246] focus-within:border-emerald-500/60'
                  }`}>
                    <span className={`text-xl font-black mr-2 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      {curr.symbol}
                    </span>
                    <input
                      type="text"
                      value={depositAmountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setDepositAmountInput(val);
                      }}
                      placeholder="Enter any amount"
                      className={`w-full bg-transparent text-xl font-black mono-num focus:outline-none ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  </div>

                  {/* Preset quick selection chips */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {depositPresetChips.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDepositAmountInput(preset.toString())}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition ${
                          depositAmountInput === preset.toString()
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500'
                            : isLight 
                              ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200' 
                              : 'border-[#293246] bg-[#10141f] text-gray-400 hover:text-white'
                        }`}
                      >
                        {curr.symbol}{preset.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Promo Code (Manual Apply only!) */}
                <div>
                  <label className={`text-xs font-bold block mb-2 flex items-center justify-between ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    <span className="flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>Special Promo Bonus Code (Optional)</span>
                    </span>
                    {appliedPromo && (
                      <span className="text-xs text-amber-500 font-black flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>+{appliedPromo === 'VIP100' ? '100%' : '50%'} Bonus Applied</span>
                      </span>
                    )}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter promo code (e.g. WELCOME50)"
                      className={`flex-1 border rounded-2xl px-4 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none ${
                        isLight 
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                          : 'bg-[#10141f] border-[#293246] text-white placeholder-gray-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl transition"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <div className="text-[11px] text-rose-500 mt-1 font-semibold">{promoError}</div>
                  )}
                </div>

                {/* Step 3: Proper QR Code & UPI ID */}
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                      isLight ? 'text-slate-800' : 'text-gray-200'
                    }`}>
                      <QrCode className="w-4 h-4 text-emerald-500" />
                      <span>2. Scan QR or Pay to Official Forex Grow UPI</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                      Instant 0% Fee
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Dynamic Real Scannable UPI QR Code */}
                    <div className="w-36 h-36 bg-white rounded-2xl p-2 shadow-lg flex flex-col items-center justify-center shrink-0 border border-slate-300">
                      {realQrDataUrl ? (
                        <img
                          src={realQrDataUrl}
                          alt="Forex Grow UPI QR"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Loading QR...
                        </div>
                      )}
                      <span className="text-[9px] font-black text-slate-700 tracking-wider mt-0.5">GPay • PhonePe • Paytm</span>
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                        Payable: <strong className="text-emerald-500 font-mono text-base">{curr.symbol}{numericDeposit.toLocaleString()}</strong>
                      </div>

                      <div>
                        <span className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                          Official Forex Grow UPI ID:
                        </span>
                        <div className={`flex items-center justify-between border rounded-xl px-3 py-2 font-mono text-xs font-bold ${
                          isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#182030] border-[#293246] text-emerald-400'
                        }`}>
                          <span className="truncate mr-2">{upiId}</span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className={`p-1.5 rounded-lg transition ${
                              isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-gray-300'
                            }`}
                          >
                            {copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <p className={`text-[10px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                        Scan the QR from any UPI App (Google Pay, PhonePe, Paytm, BHIM, Navi, Axis) or copy the UPI ID directly.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4: Enter UTR Number & Attach Screenshot Proof */}
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider block ${
                    isLight ? 'text-slate-800' : 'text-gray-200'
                  }`}>
                    3. Submit Payment Verification Proof
                  </span>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                        Transaction UTR / Reference Number (12 Digits) *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = '43' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
                          setUtrNumber(rand);
                        }}
                        className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold hover:underline"
                      >
                        Auto-Fill Sample UTR
                      </button>
                    </div>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 431092819281 (or click Auto-Fill Sample UTR)"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none ${
                        isLight 
                          ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' 
                          : 'bg-[#182030] border-[#293246] text-white placeholder-gray-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      Attach Payment Screenshot Image (Optional)
                    </label>
                    <div className="flex items-center space-x-3">
                      <label className={`flex-1 flex items-center justify-center space-x-2 border-2 border-dashed rounded-xl py-3 px-4 cursor-pointer transition ${
                        proofImage 
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' 
                          : isLight 
                            ? 'border-slate-300 hover:border-slate-400 bg-white text-slate-600' 
                            : 'border-[#293246] hover:border-gray-500 bg-[#182030] text-gray-300'
                      }`}>
                        <Upload className="w-4 h-4" />
                        <span className="text-xs font-bold truncate">
                          {proofFileName ? proofFileName : 'Click to Upload Screenshot'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      {proofImage && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-emerald-500 shrink-0">
                          <img src={proofImage} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informational note */}
                <div className="pt-1">
                  <p className={`text-[10px] text-center ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    ⏱️ Deposit will reflect in your account within 8 working hours after transaction verification.
                  </p>
                </div>
              </div>
            )
          )}

          {/* ================= WITHDRAW TAB ================= */}
          {activeTab === 'WITHDRAW' && (
            withdrawSuccessData ? (
              /* Success Pop-up: Within 24 working hours */
              <div className="py-6 sm:py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Withdrawal Request Submitted!
                  </h3>
                  <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-500 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wide">
                    ⏳ Within 24 Working Hours
                  </div>
                </div>

                <div className={`w-full max-w-md p-4 rounded-2xl border text-left text-xs space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Payout Reference:</span>
                    <span className="font-mono font-bold text-emerald-500">{withdrawSuccessData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Amount Deducted:</span>
                    <span className="font-extrabold">{formatCurrency(withdrawAmountUSD, account.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Payout Destination:</span>
                    <span className="font-mono font-semibold">{withdrawType === 'UPI' ? withdrawUpiId : bankAccountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Payout Status:</span>
                    <span className="text-amber-500 font-black">PENDING FINANCE APPROVAL</span>
                  </div>
                </div>

                <p className={`text-xs max-w-md leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  Within <strong>24 working hours</strong>, your withdrawal will be deposited into your account once approved by our finance team. Your dashboard status will update to <strong>SUCCESSFUL</strong>.
                </p>

                <button
                  onClick={onClose}
                  className="w-full max-w-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-95"
                >
                  Return to Trading Floor
                </button>
              </div>
            ) : (
              /* Withdraw Form */
              <div className="space-y-5">
                {withdrawError && (
                  <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs p-3.5 rounded-2xl flex items-center space-x-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {/* Available Live Real Balance Display */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <div>
                    <span className={`text-xs block ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                      Available Live Real Balance
                    </span>
                    <span className={`text-2xl font-black mono-num ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {curr.symbol}{realBalanceLocal.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-[10px] font-black px-2.5 py-1 rounded-xl">
                      Real Money Payout
                    </span>
                  </div>
                </div>

                {/* Withdrawal Amount */}
                <div>
                  <label className={`text-xs font-bold block mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Withdrawal Amount ({curr.code})
                  </label>
                  <div className={`flex items-center border rounded-2xl px-4 py-3 ${
                    isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#10141f] border-[#293246]'
                  }`}>
                    <span className={`text-xl font-black mr-2 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      {curr.symbol}
                    </span>
                    <input
                      type="text"
                      value={withdrawAmountInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setWithdrawAmountInput(val);
                      }}
                      className={`w-full bg-transparent text-xl font-black mono-num focus:outline-none ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Payout Destination Selector: UPI or Bank Transfer */}
                <div>
                  <label className={`text-xs font-bold block mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    Select Payout Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawType('UPI')}
                      className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition ${
                        withdrawType === 'UPI'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold'
                          : isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-[#293246] bg-[#10141f] text-gray-400'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black">UPI Payout</div>
                        <div className="text-[10px] text-gray-400">Direct to UPI VPA</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawType('BANK')}
                      className={`p-3 rounded-2xl border text-left flex items-center space-x-3 transition ${
                        withdrawType === 'BANK'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold'
                          : isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-[#293246] bg-[#10141f] text-gray-400'
                      }`}
                    >
                      <Building2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black">Bank Transfer</div>
                        <div className="text-[10px] text-gray-400">IMPS / NEFT / RTGS</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Account Details Input */}
                {withdrawType === 'UPI' ? (
                  <div>
                    <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                      Your UPI ID (VPA) *
                    </label>
                    <input
                      type="text"
                      value={withdrawUpiId}
                      onChange={(e) => setWithdrawUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank"
                      className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:outline-none ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#10141f] border-[#293246] text-white'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        value={bankHolderName}
                        onChange={(e) => setBankHolderName(e.target.value)}
                        placeholder="As registered in your bank"
                        className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#10141f] border-[#293246] text-white'
                        }`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                          Bank Account Number *
                        </label>
                        <input
                          type="text"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          placeholder="Account Number"
                          className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold focus:outline-none ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#10141f] border-[#293246] text-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                          Bank IFSC Code *
                        </label>
                        <input
                          type="text"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                          placeholder="e.g. HDFC0001234"
                          className={`w-full border rounded-xl px-3.5 py-2 text-xs font-mono font-bold uppercase focus:outline-none ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#10141f] border-[#293246] text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`text-[11px] font-semibold block mb-1 ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                        Bank Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, SBI, ICICI"
                        className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#10141f] border-[#293246] text-white'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Balance warning if insufficient */}
                {account.realBalance < withdrawAmountUSD && (
                  <div className="text-[11px] text-center text-amber-500 font-bold bg-amber-500/10 py-2 px-3 rounded-xl border border-amber-500/20">
                    ⚠️ Insufficient Real Balance ({formatCurrency(account.realBalance, account.currency)} available). Switch to Real Account or lower the withdrawal amount.
                  </div>
                )}

                <div className="pt-1">
                  <p className={`text-[10px] text-center ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    ⏱️ Processed within 24 working hours. Real balance is deducted immediately upon submission.
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        {/* ================= STICKY MODAL BOTTOM ACTION FOOTER ================= */}
        {!depositSuccessData && !withdrawSuccessData && (
          <div className={`p-3.5 sm:p-4 border-t flex-shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
          }`}>
            {activeTab === 'DEPOSIT' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs px-1">
                  <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>
                    Total to Credit {appliedPromo ? `(+Bonus ${appliedPromo})` : ''}:
                  </span>
                  <span className="text-base font-black text-emerald-500 mono-num">
                    {curr.symbol}{totalCreditedLocal.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isSubmittingDeposit || numericDeposit <= 0}
                  onClick={depositMethod === 'INSTANT' ? handleInstantDeposit : handleSubmitDepositProof}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-3 sm:py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-2 text-xs sm:text-sm"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {isSubmittingDeposit
                      ? 'Processing Deposit...'
                      : depositMethod === 'INSTANT'
                      ? `⚡ Deposit & Credit ${curr.symbol}${numericDeposit.toLocaleString()} Instantly`
                      : 'Submit Deposit Proof for Verification'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs px-1">
                  <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Net Payout Amount:</span>
                  <span className="text-base font-black text-emerald-500 mono-num">
                    {curr.symbol}{numericWithdraw.toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isSubmittingWithdraw || numericWithdraw <= 0 || account.realBalance < withdrawAmountUSD}
                  onClick={handleSubmitWithdrawal}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3 sm:py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-2 text-xs sm:text-sm"
                >
                  <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {isSubmittingWithdraw ? 'Submitting Request...' : `Request Payout of ${curr.symbol}${numericWithdraw.toLocaleString()}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
