import React, { useState } from 'react';
import { FiTag, FiCheck, FiCopy } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function NotificationCouponBox({ code, discountLabel }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Coupon code "${code}" copied to clipboard!`);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2.5 p-2.5 sm:p-3 bg-gradient-to-r from-[#fdfbf7] to-[#f8f5ee] border border-[#e3dccb] rounded-xl flex flex-wrap items-center justify-between gap-2.5 shadow-2xs"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#d99a3d]/15 text-[#b07823] border border-[#d99a3d]/30 flex items-center justify-center shrink-0">
          <FiTag size={15} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-[#786e60] uppercase tracking-wider">
              Coupon Code
            </span>
            {discountLabel && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide">
                {discountLabel}
              </span>
            )}
          </div>
          <span className="text-xs sm:text-sm font-mono font-black text-[#1a1a1a] tracking-wider block mt-0.5 select-all">
            {code}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#2e261f] active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer border-none"
        title="Copy coupon code"
      >
        {copied ? (
          <>
            <FiCheck size={12} className="text-emerald-400" />
            <span className="text-emerald-300">Copied!</span>
          </>
        ) : (
          <>
            <FiCopy size={12} className="text-slate-300" />
            <span>Copy Code</span>
          </>
        )}
      </button>
    </div>
  );
}
