import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { apiUrl } from '../utils/api';
import { 
  X, 
  ShieldCheck, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle, 
  FileText,
  Camera,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KycModal: React.FC<KycModalProps> = ({ isOpen, onClose }) => {
  const { account, theme } = useTrading();
  const isLight = theme === 'light';

  const [fullName, setFullName] = useState(account?.kycData?.fullName || account?.name || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(account?.aadhaarNumber || account?.kycData?.aadhaarNumber || '');
  const [dob, setDob] = useState(account?.kycData?.dob || '1995-01-01');
  const [gender, setGender] = useState(account?.kycData?.gender || 'Male');
  const [frontImage, setFrontImage] = useState<string>(account?.kycData?.frontImage || '');
  const [backImage, setBackImage] = useState<string>(account?.kycData?.backImage || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const kycStatus = account?.kycStatus || (account?.isKycVerified ? 'APPROVED' : 'NOT_SUBMITTED');

  // Format Aadhaar Number to 4 4 4 digits
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += raw[i];
    }
    setAadhaarNumber(formatted);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        if (side === 'front') setFrontImage(reader.result);
        else setBackImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar Card number.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full legal name as printed on your Aadhaar card.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/user/kyc/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: account?.id,
          fullName: fullName.trim(),
          aadhaarNumber,
          dob,
          gender,
          hasDocuments: Boolean(frontImage && backImage),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to submit KYC documents. Please contact Customer Care.');
        return;
      }

      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setSuccessMsg('Aadhaar KYC submitted successfully! Verification status: Waiting for Confirmation.');
    } catch (err) {
      setErrorMsg('Connection error. Please try again or chat with Customer Care.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsAppSupport = () => {
    const msg = `Hello Forex Grow Customer Care,\n\nI need immediate verification for my Aadhaar KYC.\nTrader Name: ${account?.name}\nAccount ID: ${account?.id}\nAadhaar: ${aadhaarNumber || 'Attached in terminal'}\n\nPlease review and approve.`;
    window.open(`https://wa.me/919876543210?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#141926] border-[#263147] text-gray-100'
      }`}>
        {/* Top Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0f131e] border-[#222a3d]'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Aadhaar Identity Verification (KYC)</h3>
              <p className="text-[11px] text-gray-400">Institutional regulatory compliance & account validation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Alert Banner */}
          {kycStatus === 'APPROVED' ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-black text-sm">Identity Verified • Tier 1 Approved</div>
                <div className="text-[11px] opacity-90">Your 12-digit Aadhaar Card identity is verified. Payouts and deposits are fully enabled.</div>
              </div>
            </div>
          ) : kycStatus === 'PENDING' ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 shrink-0 text-amber-400" />
                <div>
                  <div className="font-black text-xs text-amber-400">Waiting for Confirmation</div>
                  <div className="text-[11px] opacity-90">Your Aadhaar documents have been uploaded and are currently being reviewed by Customer Care.</div>
                </div>
              </div>
              <button
                onClick={openWhatsAppSupport}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-[#25D366] text-black font-black text-[10px] flex items-center space-x-1 shadow-md hover:bg-[#20ba5a] transition"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>Fast Track</span>
              </button>
            </div>
          ) : kycStatus === 'REJECTED' ? (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-black text-xs">Verification Rejected</div>
                <div className="text-[11px] opacity-90">
                  {account?.kycData?.rejectionReason || 'Document details mismatched or image unclear. Please re-submit clear Aadhaar photos.'}
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-3.5 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#101522] border-[#222a3d] text-gray-300'
            }`}>
              <div className="font-bold flex items-center space-x-1.5 text-gray-200 mb-1">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Why Complete Aadhaar Verification?</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                As per institutional trading standards, Indian accounts must be linked to a valid 12-digit Aadhaar Card number for unrestricted instant UPI and bank withdrawals.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmitKyc} className="space-y-3.5">
            <div>
              <label className="font-bold block mb-1 text-gray-300">
                Full Name (as printed on Aadhaar Card) *
              </label>
              <input
                type="text"
                required
                disabled={kycStatus === 'APPROVED'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none transition ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' 
                    : 'bg-[#0b0e17] border-[#263147] text-white focus:border-emerald-500/60'
                }`}
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-gray-300">
                12-digit Aadhaar Card Number *
              </label>
              <input
                type="text"
                required
                disabled={kycStatus === 'APPROVED'}
                value={aadhaarNumber}
                onChange={handleAadhaarChange}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm font-mono tracking-wider focus:outline-none transition ${
                  isLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500' 
                    : 'bg-[#0b0e17] border-[#263147] text-white focus:border-emerald-500/60'
                }`}
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Direct login with your 12-digit Aadhaar number is supported once verified.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold block mb-1 text-gray-300">Date of Birth</label>
                <input
                  type="date"
                  disabled={kycStatus === 'APPROVED'}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none transition ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-900' 
                      : 'bg-[#0b0e17] border-[#263147] text-white'
                  }`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1 text-gray-300">Gender</label>
                <select
                  disabled={kycStatus === 'APPROVED'}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none transition ${
                    isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-900' 
                      : 'bg-[#0b0e17] border-[#263147] text-white'
                  }`}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Document Photo Uploads */}
            <div>
              <label className="font-bold block mb-1.5 text-gray-300">
                Aadhaar Card Photos (Front & Back)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Front Side */}
                <div className={`p-3 rounded-2xl border text-center relative flex flex-col items-center justify-center min-h-[120px] transition ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e17] border-[#263147]'
                }`}>
                  {frontImage ? (
                    <div className="relative w-full h-24 overflow-hidden rounded-xl">
                      <img src={frontImage} alt="Aadhaar Front" className="w-full h-full object-cover" />
                      {kycStatus !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => setFrontImage('')}
                          className="absolute top-1 right-1 p-1 bg-black/70 text-rose-400 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2">
                      <Camera className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-[11px] font-bold text-gray-300">Upload Front</span>
                      <span className="text-[9px] text-gray-500 mt-0.5">Clear photo showing name & photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={kycStatus === 'APPROVED'}
                        onChange={(e) => handleImageUpload(e, 'front')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Back Side */}
                <div className={`p-3 rounded-2xl border text-center relative flex flex-col items-center justify-center min-h-[120px] transition ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0b0e17] border-[#263147]'
                }`}>
                  {backImage ? (
                    <div className="relative w-full h-24 overflow-hidden rounded-xl">
                      <img src={backImage} alt="Aadhaar Back" className="w-full h-full object-cover" />
                      {kycStatus !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => setBackImage('')}
                          className="absolute top-1 right-1 p-1 bg-black/70 text-rose-400 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2">
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-[11px] font-bold text-gray-300">Upload Back</span>
                      <span className="text-[9px] text-gray-500 mt-0.5">Showing residential address</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={kycStatus === 'APPROVED'}
                        onChange={(e) => handleImageUpload(e, 'back')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {kycStatus !== 'APPROVED' && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Documents...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Aadhaar for Verification</span>
                  </>
                )}
              </button>
            )}
          </form>

          {/* WhatsApp Direct Help */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-gray-400">
            <span className="text-[11px]">Need immediate assistance with KYC?</span>
            <button
              onClick={openWhatsAppSupport}
              className="text-[11px] text-[#25D366] hover:underline font-bold flex items-center space-x-1"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
              <span>Customer Care WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
