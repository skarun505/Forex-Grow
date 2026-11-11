import React, { useState, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { CURRENCY_CONFIGS, formatCurrency } from '../utils/currency';
import { apiUrl } from '../utils/api';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Coins, 
  CheckCircle2, 
  Loader2, 
  X, 
  Copy, 
  Check, 
  Lock, 
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NovuPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  depositAmountUSD: number;
  promoCode?: string;
}

type PaymentRail = 'CARD' | 'UPI' | 'CRYPTO';

export const NovuPayModal: React.FC<NovuPayModalProps> = ({
  isOpen,
  onClose,
  depositAmountUSD,
  promoCode,
}) => {
  const { account } = useTrading();
  const [selectedRail, setSelectedRail] = useState<PaymentRail>('UPI');
  const [timeLeft, setTimeLeft] = useState<number>(899); // 14:59 countdown
  const [orderId] = useState<string>(() => `NP-ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(account.name || 'Alex Rivera');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('888');

  // Crypto State
  const [cryptoNetwork, setCryptoNetwork] = useState<'USDT-TRC20' | 'USDT-ERC20' | 'BTC'>('USDT-TRC20');

  // Payment Processing Sequence State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [settledTxnId, setSettledTxnId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || settledTxnId) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, settledTxnId]);

  if (!isOpen) return null;

  const curr = CURRENCY_CONFIGS[account.currency] || CURRENCY_CONFIGS.USD;
  const localAmount = Number((depositAmountUSD * curr.rateAgainstUSD).toFixed(curr.code === 'JPY' ? 0 : 2));

  // Bonus Calculation
  let bonusAmountUSD = 0;
  if (promoCode && promoCode.trim().toUpperCase() === 'WELCOME50') {
    bonusAmountUSD = depositAmountUSD * 0.5;
  } else if (promoCode && promoCode.trim().toUpperCase() === 'QUOTEX100') {
    bonusAmountUSD = depositAmountUSD * 1.0;
  }
  const totalCreditedUSD = depositAmountUSD + bonusAmountUSD;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStep(1);

    // Multi-step NovuPay high-risk gateway simulation
    setTimeout(() => setProcessingStep(2), 700);
    setTimeout(() => setProcessingStep(3), 1500);

    setTimeout(async () => {
      try {
        const txnRef = `NP-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        const response = await fetch(apiUrl('/api/payment/novupay/webhook'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: txnRef,
            orderId,
            userId: account.id,
            amountUSD: depositAmountUSD,
            promoCode: promoCode || '',
            paymentRail: selectedRail === 'UPI' ? 'Instant UPI / QR (India & Asia)' : selectedRail === 'CARD' ? 'Visa / MC 3DS2' : `Crypto (${cryptoNetwork})`,
            status: 'APPROVED',
          }),
        });

        const data = await response.json();
        if (data.success) {
          setSettledTxnId(data.reference || txnRef);
          setIsProcessing(false);
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 },
          });
        } else {
          setErrorMsg(data.error || 'Gateway authorization declined');
          setIsProcessing(false);
        }
      } catch (err) {
        // Fallback simulated success if server connection offline
        const fallbackRef = `NP-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        setSettledTxnId(fallbackRef);
        setIsProcessing(false);
      }
    }, 2400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#111622] border border-[#232d42] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Gateway Branding Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171e2e] via-[#1a2336] to-[#141b2a] border-b border-[#232d42] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              N
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-extrabold text-white tracking-wide">NovuPay</span>
                <span className="bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Binary Broker Gateway
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center space-x-1 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-400 inline" />
                <span>PCI-DSS Level 1 Encrypted • 3DS2 Protected</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Order Expires In</span>
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center justify-end space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimer(timeLeft)}</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Details Banner */}
        <div className="bg-[#171d2b] px-5 py-3 border-b border-[#232d42] flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400 font-medium">Merchant: </span>
            <span className="text-white font-bold">Quotex Financial Ltd</span>
            <span className="text-gray-500 ml-2 font-mono text-[10px]">({orderId})</span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 text-[11px]">Payable: </span>
            <span className="text-base font-black text-emerald-400 mono-num">
              {formatCurrency(depositAmountUSD, account.currency)}
            </span>
          </div>
        </div>

        {/* Settled / Success View */}
        {settledTxnId ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Payment Authorized & Settled!</h3>
              <p className="text-xs text-gray-300 mt-1 max-w-sm">
                NovuPay High-Risk Broker Gateway has settled your deposit and credited your Real Trading Account instantly.
              </p>
            </div>

            <div className="w-full bg-[#171d2b] border border-[#232d42] rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-gray-400">
                <span>NovuPay Transaction Ref:</span>
                <span className="font-mono font-bold text-white">{settledTxnId}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Order Reference:</span>
                <span className="font-mono text-gray-300">{orderId}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Deposit Credited:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(depositAmountUSD, account.currency)}</span>
              </div>
              {bonusAmountUSD > 0 && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Promo Bonus ({promoCode}):</span>
                  </span>
                  <span>+{formatCurrency(bonusAmountUSD, account.currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/5 flex justify-between font-bold text-sm text-white">
                <span>Total Live Real Balance Added:</span>
                <span className="text-emerald-400 mono-num">{formatCurrency(totalCreditedUSD, account.currency)}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-xl shadow-emerald-500/25 transition transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>Return to Trading Floor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isProcessing ? (
          /* Processing Screen with Live Gateway Pipeline */
          <div className="p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping"></div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">NovuPay Payment Orchestration</h3>
              <p className="text-xs text-gray-400">Communicating with acquiring banks & routing high-risk liquidity...</p>
            </div>

            <div className="w-full max-w-sm bg-[#161d2c] border border-[#242f46] rounded-2xl p-4 text-xs space-y-3 text-left">
              <div className="flex items-center space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${processingStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  ✓
                </div>
                <span className={processingStep >= 1 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                  1. Risk Scoring & Cascade Routing [PASSED]
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${processingStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  ✓
                </div>
                <span className={processingStep >= 2 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                  2. 3D-Secure 2.0 / UPI Intent Handshake [VERIFIED]
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${processingStep >= 3 ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  ✓
                </div>
                <span className={processingStep >= 3 ? 'text-gray-200 font-semibold' : 'text-gray-500'}>
                  3. Instant Webhook Dispatch to Broker API
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Payment Interface */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-2xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Payment Rail Selector */}
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-2">Select NovuPay Processing Rail</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectedRail('UPI')}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                    selectedRail === 'UPI'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'border-[#232d42] bg-[#161d2c] text-gray-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-[11px] font-bold">UPI / Instant APM</span>
                </button>

                <button
                  onClick={() => setSelectedRail('CARD')}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                    selectedRail === 'CARD'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'border-[#232d42] bg-[#161d2c] text-gray-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Card 3DS2</span>
                </button>

                <button
                  onClick={() => setSelectedRail('CRYPTO')}
                  className={`py-3 px-2 rounded-2xl border text-center transition flex flex-col items-center justify-center space-y-1 ${
                    selectedRail === 'CRYPTO'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'border-[#232d42] bg-[#161d2c] text-gray-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Crypto Rail</span>
                </button>
              </div>
            </div>

            {/* Specific Rail Content */}
            {selectedRail === 'UPI' && (
              <div className="bg-[#161d2c] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    Dynamic NovuPay QR (GPay / PhonePe / Paytm / UPI)
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg text-[10px]">
                    Instant Settlement
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#111622] border border-[#232d42] rounded-xl p-4">
                  {/* Generated QR Mockup */}
                  <div className="w-32 h-32 bg-white rounded-xl p-2 flex flex-col items-center justify-center shadow-lg">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900">
                      <rect x="10" y="10" width="30" height="30" fill="currentColor" />
                      <rect x="16" y="16" width="18" height="18" fill="white" />
                      <rect x="20" y="20" width="10" height="10" fill="currentColor" />

                      <rect x="60" y="10" width="30" height="30" fill="currentColor" />
                      <rect x="66" y="16" width="18" height="18" fill="white" />
                      <rect x="70" y="20" width="10" height="10" fill="currentColor" />

                      <rect x="10" y="60" width="30" height="30" fill="currentColor" />
                      <rect x="16" y="66" width="18" height="18" fill="white" />
                      <rect x="20" y="70" width="10" height="10" fill="currentColor" />

                      <circle cx="50" cy="50" r="8" fill="#0ea5e9" />
                      <rect x="52" y="62" width="6" height="16" fill="currentColor" />
                      <rect x="62" y="52" width="16" height="6" fill="currentColor" />
                      <rect x="72" y="72" width="16" height="16" fill="currentColor" />
                    </svg>
                  </div>

                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="text-xs text-gray-400">
                      Scan with any UPI App or use Official Gateway VPA:
                    </div>
                    <div className="flex items-center justify-between bg-[#1a2336] border border-[#2d3a56] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300">
                      <span className="truncate mr-2">novupay.quotex@yesbank</span>
                      <button
                        onClick={() => handleCopy('novupay.quotex@yesbank')}
                        className="text-gray-400 hover:text-white transition"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Amounts automatically converted to <strong className="text-white">{curr.code} {localAmount}</strong> at official rate.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedRail === 'CARD' && (
              <div className="bg-[#161d2c] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    NovuPay 3DS2 Hosted Card Processing
                  </span>
                  <button
                    onClick={() => {
                      setCardNumber('4242 4242 4242 4242');
                      setCardExpiry('12/28');
                      setCardCvv('999');
                    }}
                    className="text-[10px] font-bold text-cyan-400 hover:underline"
                  >
                    Auto-Fill Test Visa
                  </button>
                </div>

                {/* Card Number */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Card Number</label>
                  <div className="flex items-center bg-[#111622] border border-[#232d42] rounded-xl px-3 py-2">
                    <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 0000 0000 0000"
                      className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                    />
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      VISA
                    </span>
                  </div>
                </div>

                {/* Cardholder */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full bg-[#111622] border border-[#232d42] rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full bg-[#111622] border border-[#232d42] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-400 block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      className="w-full bg-[#111622] border border-[#232d42] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRail === 'CRYPTO' && (
              <div className="bg-[#161d2c] border border-[#232d42] rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    NovuPay Crypto Rail (Zero Chargeback)
                  </span>
                  <div className="flex space-x-1.5">
                    {(['USDT-TRC20', 'USDT-ERC20', 'BTC'] as const).map((net) => (
                      <button
                        key={net}
                        onClick={() => setCryptoNetwork(net)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                          cryptoNetwork === net
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                            : 'border-white/5 text-gray-400 hover:text-white'
                        }`}
                      >
                        {net}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111622] border border-[#232d42] rounded-xl p-3 text-xs space-y-2">
                  <div className="text-[11px] text-gray-400">NovuPay Deposit Address ({cryptoNetwork}):</div>
                  <div className="flex items-center justify-between bg-[#1a2336] border border-[#2d3a56] rounded-xl px-3 py-2 font-mono text-[11px] text-emerald-300">
                    <span className="truncate mr-2">
                      {cryptoNetwork === 'USDT-TRC20'
                        ? 'TX9QxN7m48aLkVmY2ZqQ3v7JkP1m8RtW5n'
                        : cryptoNetwork === 'USDT-ERC20'
                        ? '0x71C...398492fe3480B225244b4'
                        : 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'}
                    </span>
                    <button
                      onClick={() => handleCopy('TX9QxN7m48aLkVmY2ZqQ3v7JkP1m8RtW5n')}
                      className="text-gray-400 hover:text-white transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Average confirmation time: <strong className="text-white">~30 seconds</strong> via NovuPay Hot Wallet
                  </div>
                </div>
              </div>
            )}

            {/* Authorize Button */}
            <div className="pt-2">
              <button
                onClick={handleSimulatePayment}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl shadow-cyan-500/25 transition transform active:scale-[0.99] flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-5 h-5 text-cyan-200" />
                <span>
                  Authorize & Pay {formatCurrency(depositAmountUSD, account.currency)} via NovuPay
                </span>
              </button>

              <div className="flex items-center justify-center space-x-4 mt-3 text-[11px] text-gray-400">
                <span className="flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>256-bit SSL</span>
                </span>
                <span>•</span>
                <span>Instant Callback Webhook</span>
                <span>•</span>
                <span>0% Gateway Fee</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
