import React from 'react';
import { FiBell, FiCheck } from 'react-icons/fi';

const ROLE_METADATA = {
  customer: {
    badge: 'NOTIFICATIONS CENTER',
    title: 'NOTIFICATIONS CENTER',
    subtitle: 'Stay updated on orders, vendor quotes, special offers, and platform alerts',
  },
  vendor: {
    badge: 'VENDOR CENTER',
    title: 'VENDOR NOTIFICATIONS',
    subtitle: 'Track customer inquiries, lead requests, payouts, and requirement matches',
  },
  creator: {
    badge: 'CREATOR CENTER',
    title: 'CREATOR NOTIFICATIONS',
    subtitle: 'Track brand sponsorships, campaign invites, milestones, and wallet payouts',
  },
};

export default function NotificationHeader({ role = 'customer', unreadCount = 0, onMarkAllRead }) {
  const meta = ROLE_METADATA[role] || ROLE_METADATA.customer;

  return (
    <div className="bg-[#241b15] text-white p-6 rounded-2xl border-2 border-[#241b15] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <span className="text-[9.5px] font-black text-[#d99a3d] uppercase tracking-widest block mb-1">
          {meta.badge}
        </span>
        <h1
          style={{ fontFamily: "'Archivo Black', sans-serif" }}
          className="text-xl sm:text-2xl uppercase tracking-wide text-white"
        >
          {meta.title}
        </h1>
        <p className="text-xs text-slate-300 mt-1 max-w-md">
          {meta.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-xs"
          >
            <FiCheck size={14} className="text-emerald-400" />
            <span>Mark All Read ({unreadCount})</span>
          </button>
        )}

        <div className="w-10 h-10 rounded-full bg-[#d99a3d] text-[#1a1a1a] flex items-center justify-center font-black shrink-0 border border-[#1a1a1a] shadow-xs">
          <FiBell size={20} />
        </div>
      </div>
    </div>
  );
}
