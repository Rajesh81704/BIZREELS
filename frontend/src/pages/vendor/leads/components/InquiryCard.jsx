import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiShoppingBag, FiTool, FiMessageCircle, FiClock,
  FiExternalLink, FiCornerDownRight, FiTrash2, FiSend,
  FiShield, FiCheckCircle
} from 'react-icons/fi';
import { resolveMediaUrl } from '../../../../lib/api';

export default function InquiryCard({ inquiry, onReply, onClose, onDelete }) {
  const customerObj = inquiry.customer || {};
  const customerName = customerObj.name || (typeof customerObj === 'string' ? customerObj : 'Verified Customer');
  const customerAvatar = customerObj.profile_pic || customerObj.avatarUrl || null;

  const listing = inquiry.listing || {};
  const reel = inquiry.reel || {};
  const isReel = !!inquiry.reel && !inquiry.listing;
  const itemTitle = listing.title || reel.caption || reel.title || 'Marketplace Listing';
  const isService = listing.type === 'service';
  const itemImage = listing.images?.[0]?.url || listing.images?.[0] || reel.thumbnail || null;
  const price = listing.sellingPrice || listing.price || null;

  const status = inquiry.status || 'sent';

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e3dccb] hover:border-[#d99a3d] hover:shadow-md transition-all flex flex-col gap-3.5 group">
      {/* ── Top Header: Customer Identity & Status ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e3dccb]/70 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {customerAvatar ? (
            <img
              src={resolveMediaUrl(customerAvatar)}
              alt={customerName}
              className="w-10 h-10 rounded-full object-cover border border-[#d5cbba] bg-[#f8f4ec] shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#f5efe4] text-[#9e6715] font-black border border-[#d5cbba] flex items-center justify-center text-sm shadow-2xs shrink-0 uppercase">
              {customerName.charAt(0) || 'C'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-sm sm:text-base text-[#1a1a1a] truncate">
                {customerName}
              </h4>

              {/* Status Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                status === 'replied'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : status === 'closed'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                {status === 'replied' ? '✓ Replied' : status === 'closed' ? 'Closed' : '● New Inquiry'}
              </span>

              {/* Privacy Shield Pill */}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-[#f8f4ec] border border-[#e3dccb] px-2 py-0.5 rounded-full shadow-2xs" title="Customer direct contact details are kept private to protect customer confidentiality">
                <FiShield size={10} className="text-[#9e6715]" />
                <span>Protected Buyer</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <FiClock size={11} className="text-slate-400" />
                <span>{formatTimestamp(inquiry.createdAt)}</span>
              </span>
              <span className="text-[10px] text-slate-400">• In-App Secure Inquiry</span>
            </div>
          </div>
        </div>

        {/* Action Tools: Mark Closed & Delete */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          {status !== 'closed' && (
            <button
              onClick={() => onClose(inquiry._id || inquiry.id)}
              className="px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:text-black bg-[#f8f4ec] hover:bg-[#ede5d8] rounded-xl border border-[#e3dccb] transition cursor-pointer shadow-2xs"
              title="Mark Closed"
            >
              Mark Closed
            </button>
          )}
          <button
            onClick={() => onDelete(inquiry._id || inquiry.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-[#e3dccb] transition cursor-pointer shadow-2xs"
            title="Delete Inquiry"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Listing / Reel Reference Card ── */}
      <div className="flex items-center gap-3 bg-[#fbf9f5] p-3 rounded-xl border border-[#e3dccb]">
        {itemImage ? (
          <img
            src={resolveMediaUrl(itemImage)}
            alt={itemTitle}
            className="w-12 h-12 rounded-xl object-cover border border-[#e3dccb] shrink-0 bg-white shadow-2xs"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#f5efe4] text-[#9e6715] border border-[#e3dccb]">
            {isReel ? <FiMessageCircle size={18} /> : isService ? <FiTool size={18} /> : <FiShoppingBag size={18} />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white border border-[#e3dccb] text-slate-700">
              {isReel ? 'Reel / Post' : isService ? 'Service' : 'Product'}
            </span>
            {listing._id ? (
              <Link
                to={`/customer/listing/${listing._id}`}
                className="font-extrabold text-xs sm:text-sm text-[#1a1a1a] hover:text-[#d99a3d] transition-colors truncate flex items-center gap-1"
              >
                <span className="truncate">{itemTitle}</span>
                <FiExternalLink size={11} className="shrink-0 opacity-60" />
              </Link>
            ) : (
              <span className="font-extrabold text-xs sm:text-sm text-[#1a1a1a] truncate">{itemTitle}</span>
            )}
          </div>
          {price !== null && (
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Listing Price: <strong className="text-emerald-800 font-black">₹{Number(price).toLocaleString('en-IN')}</strong>
            </p>
          )}
        </div>
      </div>

      {/* ── Customer Inquiry Message Box ── */}
      <div className="bg-[#f8f4ec] rounded-xl p-3.5 border border-[#e3dccb] space-y-1.5">
        <span className="font-black text-[#9e6715] text-[10px] uppercase tracking-wider block">
          Customer Message:
        </span>
        <p className="text-xs sm:text-[13px] text-[#2d261e] leading-relaxed font-medium italic">
          "{inquiry.message || inquiry.msg}"
        </p>

        {/* Vendor Reply if already submitted */}
        {inquiry.replyMessage && (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 mt-2.5 flex items-start gap-2.5">
            <FiCornerDownRight className="text-emerald-700 shrink-0 mt-0.5" size={14} />
            <div className="min-w-0 text-xs">
              <span className="font-black text-emerald-900 block text-[10px] uppercase tracking-wider">
                Your Official Reply ({formatTimestamp(inquiry.repliedAt)}):
              </span>
              <p className="text-slate-800 leading-relaxed mt-0.5 font-medium">{inquiry.replyMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReply(inquiry)}
            className="px-4 py-2 bg-[#d99a3d] hover:bg-[#c4872c] text-white font-extrabold text-xs rounded-xl shadow-2xs hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FiSend size={13} />
            <span>{inquiry.replyMessage ? 'Update Reply' : 'Send Quick Reply'}</span>
          </button>

          {inquiry.replyMessage && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
              <FiCheckCircle size={12} />
              <span>Delivered in-app</span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:inline-block">
          Responses delivered instantly to customer notification center
        </span>
      </div>
    </div>
  );
}
