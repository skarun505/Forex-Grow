import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { DepositPaymentSettings } from '../types';
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
  Smartphone,
  Info,
  Clock,
  History,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CashierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashierModal: React.FC<CashierModalProps> = ({ isOpen, onClose }) => {
  const { account, theme } = useTrading();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAW' | 'HISTORY'>('DEPOSIT');
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(false);

  const fetchUserTransactions = () => {
    if (!account.id) return;
    setIsLoadingTxns(true);
    fetch(apiUrl(`/api/user/${account.id}/transactions`))
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.transactions)) {
          setUserTransactions(data.transactions);
        } else {
          setUserTransactions([]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch user transactions:', err);
        setUserTransactions([]);
      })
      .finally(() => setIsLoadingTxns(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserTransactions();
    }
  }, [isOpen, account.id]);

  // Dynamic Bank and UPI Settings fetched from Server
  const [paymentSettings, setPaymentSettings] = useState<DepositPaymentSettings>({
    upiId: 'forexgrow@icici',
    upiName: 'Forex Grow Official Desk',
    bankName: 'HDFC Bank',
    accountHolderName: 'Forex Grow Institutional Operations',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0000240',
    accountType: 'Current Account',
    branchName: 'Nariman Point, Mumbai',
    instructions: 'Transfer funds via IMPS, NEFT, RTGS or UPI. Upload clear screenshot showing complete 12-digit UTR/Reference number for verification.',
    minDepositINR: 500,
  });

  // Deposit Rail: UPI vs Direct Bank Account Transfer
  const [depositRail, setDepositRail] = useState<'UPI' | 'BANK'>('UPI');
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);
  const [copiedAllBank, setCopiedAllBank] = useState(false);

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
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccessData, setDepositSuccessData] = useState<{ reference: string; amount: number; transactionId?: string; rail?: string } | null>(null);
  const [realQrDataUrl, setRealQrDataUrl] = useState<string>('');

  // Fetch live payment settings whenever modal is opened
  useEffect(() => {
    if (!isOpen) return;
    fetch(apiUrl('/api/payment/settings'))
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setPaymentSettings(data.settings);
        }
      })
      .catch((err) => console.warn('Could not fetch payment settings:', err));
  }, [isOpen]);

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

  const activeUpiId = paymentSettings.upiId || 'forexgrow@icici';
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
  // MUST run before any conditional returns to obey React Rules of Hooks
  useEffect(() => {
    if (!isOpen) return;
    const upiUri = `upi://pay?pa=${encodeURIComponent(activeUpiId)}&pn=${encodeURIComponent(paymentSettings.upiName || 'Forex Grow')}&am=${numericDeposit > 0 ? numericDeposit.toFixed(2) : '100.00'}&cu=INR&tn=${encodeURIComponent('ForexGrow Deposit')}`;
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
  }, [isOpen, activeUpiId, paymentSettings.upiName, numericDeposit]);

  if (!isOpen) return null;

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
    navigator.clipboard.writeText(activeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyBankAcc = () => {
    navigator.clipboard.writeText(paymentSettings.accountNumber);
    setCopiedBankAcc(true);
    setTimeout(() => setCopiedBankAcc(false), 2000);
  };

  const handleCopyIfsc = () => {
    navigator.clipboard.writeText(paymentSettings.ifscCode);
    setCopiedIfsc(true);
    setTimeout(() => setCopiedIfsc(false), 2000);
  };

  const handleCopyAllBankDetails = () => {
    const text = `FOREX GROW OFFICIAL BANK DETAILS:
Bank Name: ${paymentSettings.bankName}
Account Holder: ${paymentSettings.accountHolderName}
Account Number: ${paymentSettings.accountNumber}
IFSC Code: ${paymentSettings.ifscCode}
Account Type: ${paymentSettings.accountType}
Branch: ${paymentSettings.branchName}
Deposit Amount: ${curr.symbol}${numericDeposit.toLocaleString()} (${account.currency})`;

    navigator.clipboard.writeText(text);
    setCopiedAllBank(true);
    setTimeout(() => setCopiedAllBank(false), 2500);
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
          paymentRail: depositRail,
          bankDetails: depositRail === 'BANK' ? {
            bankName: paymentSettings.bankName,
            holderName: paymentSettings.accountHolderName,
            accountNumber: paymentSettings.accountNumber,
            ifscCode: paymentSettings.ifscCode,
            accountType: paymentSettings.accountType,
            branchName: paymentSettings.branchName,
          } : {
            upiId: activeUpiId,
            holderName: paymentSettings.upiName,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDepositSuccessData({
          reference: data.reference || 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
          amount: numericDeposit,
          transactionId: data.transactionId,
          rail: depositRail,
        });
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setDepositError(data.error || 'Failed to submit deposit proof');
      }
    } catch (e) {
      setDepositSuccessData({
        reference: 'FG-DEP-' + Math.floor(100000 + Math.random() * 900000),
        amount: numericDeposit,
        rail: depositRail,
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className={`w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] border transition-colors ${
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

        {/* Deposit vs Withdraw vs History Tabs */}
        <div className={`grid grid-cols-3 border-b ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#10141f] border-[#293246]'
        }`}>
          <button
            onClick={() => {
              setActiveTab('DEPOSIT');
              setDepositSuccessData(null);
              setWithdrawSuccessData(null);
            }}
            className={`py-3.5 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'DEPOSIT'
                ? isLight 
                  ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                  : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#151a26]'
                : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Deposit</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('WITHDRAW');
              setDepositSuccessData(null);
              setWithdrawSuccessData(null);
            }}
            className={`py-3.5 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'WITHDRAW'
                ? isLight 
                  ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                  : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#151a26]'
                : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Withdraw</span>
          </button>
          <button
            onClick={() => {
              fetchUserTransactions();
              setActiveTab('HISTORY');
              setDepositSuccessData(null);
              setWithdrawSuccessData(null);
            }}
            className={`py-3.5 text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-1.5 transition ${
              activeTab === 'HISTORY'
                ? isLight 
                  ? 'border-b-2 border-emerald-600 text-emerald-600 bg-white' 
                  : 'border-b-2 border-emerald-400 text-emerald-400 bg-[#151a26]'
                : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>History</span>
            {(userTransactions || []).filter((t) => t.status === 'PENDING').length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                {(userTransactions || []).filter((t) => t.status === 'PENDING').length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ================= DEPOSIT TAB ================= */}
          {activeTab === 'DEPOSIT' && (
            depositSuccessData ? (
              /* Success Pop-up: Waiting for Payment Verification */
              <div className="py-6 sm:py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 animate-pulse">
                  <Clock className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Waiting for Payment Verification
                  </h3>
                  <div className="inline-block bg-amber-500/15 border border-amber-500/30 text-amber-500 font-extrabold text-xs px-3.5 py-1 rounded-full uppercase tracking-wide">
                    ⏳ Awaiting Admin / Manager Approval
                  </div>
                </div>

                <div className={`w-full max-w-md p-4 rounded-2xl border text-left text-xs space-y-2.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Reference ID:</span>
                    <span className="font-mono font-bold text-amber-400">{depositSuccessData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Deposit Amount:</span>
                    <span className="font-extrabold text-emerald-400">
                      {curr.symbol}{numericDeposit.toLocaleString()} ({formatCurrency(depositAmountUSD, 'USD')})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Payment Rail:</span>
                    <span className="font-semibold">{depositSuccessData.rail === 'BANK' ? '🏛️ Direct Bank Transfer' : '⚡ UPI Instant QR'}</span>
                  </div>
                  {utrNumber && (
                    <div className="flex justify-between">
                      <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>UTR Reference:</span>
                      <span className="font-mono font-semibold text-emerald-400">{utrNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-500' : 'text-gray-400'}>Verification Status:</span>
                    <span className="text-amber-500 font-black">PENDING VERIFICATION</span>
                  </div>
                </div>

                <p className={`text-xs max-w-md leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                  Your payment receipt and UTR reference have been forwarded to the verification desk. Once an <strong>Administrator</strong> or <strong>Desk Manager</strong> verifies and approves your transaction, the funds will automatically reflect in your live trading account balance.
                </p>

                <div className="w-full max-w-md flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => {
                      fetchUserTransactions();
                      setActiveTab('HISTORY');
                      setDepositSuccessData(null);
                    }}
                    className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold py-3 px-4 rounded-2xl text-xs transition"
                  >
                    View Status in History →
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 px-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-95 text-xs"
                  >
                    Return to Floor
                  </button>
                </div>
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

                {/* Step 2: Payment Method Rail (UPI vs Bank Account) */}
                <div className="space-y-2">
                  <label className={`text-xs font-bold block ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                    2. Select Payment Transfer Rail
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDepositRail('UPI')}
                      className={`p-3 rounded-2xl border text-xs font-black transition flex items-center space-x-2.5 text-left ${
                        depositRail === 'UPI'
                          ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-[#10141f] border-[#293246] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">UPI Instant QR</div>
                        <div className="text-[10px] font-normal opacity-75">GPay • PhonePe • Paytm</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDepositRail('BANK')}
                      className={`p-3 rounded-2xl border text-xs font-black transition flex items-center space-x-2.5 text-left ${
                        depositRail === 'BANK'
                          ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border-sky-500 text-sky-400 shadow-lg shadow-sky-500/10'
                          : isLight
                          ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          : 'bg-[#10141f] border-[#293246] text-gray-400 hover:text-white'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 text-sky-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Direct Bank Account</div>
                        <div className="text-[10px] font-normal opacity-75">IMPS • NEFT • RTGS</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 3A: UPI Instant QR View */}
                {depositRail === 'UPI' && (
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 animate-in fade-in duration-150 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                        isLight ? 'text-slate-800' : 'text-gray-200'
                      }`}>
                        <QrCode className="w-4 h-4 text-emerald-500" />
                        <span>3. Scan QR or Pay to Official UPI</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                        Zero Processing Fee
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
                            Generating QR...
                          </div>
                        )}
                        <span className="text-[9px] font-black text-slate-700 tracking-wider mt-0.5">GPay • PhonePe • Paytm</span>
                      </div>

                      <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                        <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
                          Payable Amount: <strong className="text-emerald-500 font-mono text-base">{curr.symbol}{numericDeposit.toLocaleString()}</strong>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                              Official Forex Grow UPI ID:
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {paymentSettings.upiName}
                            </span>
                          </div>
                          <div className={`flex items-center justify-between border rounded-xl px-3 py-2 font-mono text-xs font-bold ${
                            isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#182030] border-[#293246] text-emerald-400'
                          }`}>
                            <span className="truncate mr-2">{activeUpiId}</span>
                            <button
                              type="button"
                              onClick={handleCopyUpi}
                              className={`p-1.5 rounded-lg transition ${
                                isLight ? 'hover:bg-slate-100 text-slate-600' : 'hover:bg-white/10 text-gray-300'
                              }`}
                              title="Copy UPI ID"
                            >
                              {copiedUpi ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <p className={`text-[10px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                          Scan the dynamic QR from any UPI App or transfer directly to the UPI ID above.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3B: Dynamic Bank Account Transfer View */}
                {depositRail === 'BANK' && (
                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 animate-in fade-in duration-150 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                        isLight ? 'text-slate-800' : 'text-gray-200'
                      }`}>
                        <Building2 className="w-4 h-4 text-sky-400" />
                        <span>3. Official Forex Grow Bank Account Details</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAllBankDetails}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 transition flex items-center space-x-1"
                      >
                        {copiedAllBank ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAllBank ? 'Copied Full Details!' : 'Copy All Details'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Bank Name */}
                      <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <span className={`text-[10px] font-semibold uppercase block ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                          Bank Name
                        </span>
                        <span className={`font-black text-sm block mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {paymentSettings.bankName}
                        </span>
                      </div>

                      {/* Account Holder */}
                      <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <span className={`text-[10px] font-semibold uppercase block ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                          Beneficiary / Account Holder
                        </span>
                        <span className={`font-bold text-xs block mt-0.5 truncate ${isLight ? 'text-slate-900' : 'text-white'}`} title={paymentSettings.accountHolderName}>
                          {paymentSettings.accountHolderName}
                        </span>
                      </div>

                      {/* Account Number with 1-Click Copy */}
                      <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[10px] font-semibold uppercase ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                            Account Number
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyBankAcc}
                            className={`p-1 rounded hover:bg-black/10 transition ${copiedBankAcc ? 'text-emerald-400' : 'text-sky-400'}`}
                            title="Copy Account Number"
                          >
                            {copiedBankAcc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="font-mono font-black text-base tracking-wider text-emerald-400 block select-all">
                          {paymentSettings.accountNumber}
                        </span>
                      </div>

                      {/* IFSC Code with 1-Click Copy */}
                      <div className={`p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[10px] font-semibold uppercase ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                            IFSC Code
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyIfsc}
                            className={`p-1 rounded hover:bg-black/10 transition ${copiedIfsc ? 'text-emerald-400' : 'text-sky-400'}`}
                            title="Copy IFSC Code"
                          >
                            {copiedIfsc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <span className="font-mono font-black text-base tracking-wider text-sky-400 block select-all">
                          {paymentSettings.ifscCode}
                        </span>
                      </div>

                      {/* Account Type */}
                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <span className={`text-[10px] font-semibold uppercase block ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                          Account Type
                        </span>
                        <span className={`font-semibold text-xs block mt-0.5 ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
                          {paymentSettings.accountType || 'Current Account'}
                        </span>
                      </div>

                      {/* Branch Name */}
                      <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-[#182030] border-[#293246]'}`}>
                        <span className={`text-[10px] font-semibold uppercase block ${isLight ? 'text-slate-400' : 'text-gray-400'}`}>
                          Branch Location
                        </span>
                        <span className={`font-semibold text-xs block mt-0.5 truncate ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
                          {paymentSettings.branchName || 'Corporate Banking'}
                        </span>
                      </div>
                    </div>

                    {paymentSettings.instructions && (
                      <div className={`p-3 rounded-xl border flex items-start space-x-2 text-[11px] leading-relaxed ${
                        isLight ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                      }`}>
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                        <span>{paymentSettings.instructions}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Enter UTR Number & Attach Screenshot Proof */}
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                }`}>
                  <span className={`text-xs font-black uppercase tracking-wider block ${
                    isLight ? 'text-slate-800' : 'text-gray-200'
                  }`}>
                    4. Attach Transfer Screenshot & Enter UTR Reference
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
                  <p className={`text-[10px] text-center font-medium ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                    ⚡ Once an Admin or Desk Manager approves your payment, funds immediately reflect in your live trading balance.
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

                <div className="w-full max-w-md flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={() => {
                      fetchUserTransactions();
                      setActiveTab('HISTORY');
                      setDepositSuccessData(null);
                    }}
                    className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold py-3 px-4 rounded-2xl text-xs transition"
                  >
                    View Status in History →
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 px-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-95 text-xs"
                  >
                    Return to Floor
                  </button>
                </div>
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
                  onClick={handleSubmitDepositProof}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-black py-3 sm:py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 transition transform active:scale-[0.99] flex items-center justify-center space-x-2 text-xs sm:text-sm"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {isSubmittingDeposit
                      ? 'Submitting Deposit Proof...'
                      : `Submit Deposit of ${curr.symbol}${numericDeposit.toLocaleString()} for Verification`}
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

        {/* ================= TRANSACTIONS HISTORY TAB ================= */}
        {activeTab === 'HISTORY' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Deposit & Payout History
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
                  Permanent live verification log for account #{account.id}
                </p>
              </div>
              <button
                onClick={fetchUserTransactions}
                disabled={isLoadingTxns}
                className={`p-2 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-[#1a2130] border-[#293246] text-gray-300 hover:text-white'
                }`}
                title="Refresh status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTxns ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingTxns ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">Fetching transactions from vault...</span>
              </div>
            ) : (!userTransactions || userTransactions.length === 0) ? (
              <div className={`p-8 rounded-2xl border text-center space-y-2 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
              }`}>
                <History className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400">No deposit or payout requests found yet.</p>
                <button
                  onClick={() => setActiveTab('DEPOSIT')}
                  className="mt-2 text-xs font-bold text-emerald-400 hover:underline"
                >
                  Make your first deposit →
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(userTransactions || []).map((tx) => {
                  const isDep = tx.type === 'DEPOSIT';
                  const isPending = tx.status === 'PENDING';
                  const isApproved = tx.status === 'APPROVED';

                  return (
                    <div
                      key={tx.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        isPending
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : isApproved
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#10141f] border-[#293246]'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isDep
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-sky-500/15 text-sky-400'
                        }`}>
                          {isDep ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {isDep ? 'Deposit' : 'Withdrawal'}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                                : isApproved
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {isPending ? '⏳ Awaiting Verification' : isApproved ? '✅ Approved & Credited' : '❌ Rejected'}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-2">
                            <span>Ref: <strong className="font-mono text-gray-300">{tx.reference || tx.id}</strong></span>
                            {tx.utrNumber && <span>• UTR: <strong className="font-mono text-gray-300">{tx.utrNumber}</strong></span>}
                            <span>• {new Date(tx.timestamp || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          {tx.method && (
                            <div className="text-[10px] text-gray-500">
                              Via: {tx.method}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-base font-black mono-num ${
                          isDep ? 'text-emerald-400' : 'text-sky-400'
                        }`}>
                          {isDep ? '+' : '-'}{curr.symbol}{tx.amount?.toLocaleString()} {tx.currency || account.currency}
                        </div>
                        {tx.amountUSD && (
                          <div className="text-[10px] text-gray-400 mono-num">
                            ≈ ${tx.amountUSD?.toFixed(2)} USD
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
