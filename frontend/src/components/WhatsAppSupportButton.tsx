import React, { useState } from 'react';
import { MessageCircle, X, ShieldCheck, Clock, CreditCard, ChevronRight } from 'lucide-react';
import { useTrading } from '../context/TradingContext';

export const WhatsAppSupportButton: React.FC = () => {
  const { account } = useTrading();
  const [isOpen, setIsOpen] = useState(false);

  const SUPPORT_NUMBER = '919180169771'; // Official Customer Care WhatsApp Number: +91 9180169771

  const openWhatsApp = (queryType: string = 'General Support') => {
    const userName = account?.name || 'Trader';
    const userId = account?.id || 'New Account';
    const msg = `Hello Forex Grow Customer Care Team,\n\nI need immediate assistance with: *${queryType}*\n\nTrader Name: ${userName}\nAccount ID: ${userId}\nPrimary Currency: ${account?.currency || 'INR'}\n\nPlease assist me at the earliest.`;
    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${SUPPORT_NUMBER}?text=${encoded}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Quick Menu Popover */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-[#141824] border border-[#263147] rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom-3 duration-200 text-white">
          <div className="flex items-center justify-between border-b border-[#242e42] pb-3 mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-black">Customer Care Desk</h4>
                <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>+91 9180169771 (24/7 Desk)</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
            Connect directly with Forex Grow customer care on WhatsApp for immediate payment confirmation, KYC approval, or account updates.
          </p>

          <div className="space-y-1.5 mb-3">
            <button
              onClick={() => openWhatsApp('Payment Confirmation (Deposit/Withdrawal)')}
              className="w-full text-left p-2.5 rounded-2xl bg-[#1b2234] hover:bg-[#222b42] border border-[#283550] flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-gray-200">Payment Confirmation</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => openWhatsApp('Aadhaar KYC Verification')}
              className="w-full text-left p-2.5 rounded-2xl bg-[#1b2234] hover:bg-[#222b42] border border-[#283550] flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-gray-200">Aadhaar KYC Approval</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => openWhatsApp('Bank Details Update Request')}
              className="w-full text-left p-2.5 rounded-2xl bg-[#1b2234] hover:bg-[#222b42] border border-[#283550] flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-gray-200">Update Bank / UPI Details</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition" />
            </button>
          </div>

          <button
            onClick={() => openWhatsApp('General Support Request')}
            className="w-full py-2.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Chat on WhatsApp Now</span>
          </button>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="WhatsApp Customer Care Support"
        className="flex items-center space-x-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black px-4 py-3 rounded-full shadow-2xl hover:shadow-[#25D366]/40 transition transform active:scale-95"
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span className="text-xs tracking-wide hidden sm:inline">WhatsApp Support</span>
      </button>
    </div>
  );
};
