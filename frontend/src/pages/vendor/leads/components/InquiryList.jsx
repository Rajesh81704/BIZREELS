import React, { useState } from 'react';
import { FiInbox, FiSearch, FiX } from 'react-icons/fi';
import InquiryCard from './InquiryCard';

export default function InquiryList({
  inquiries = [],
  emptyText = 'No customer enquiries found.',
  onReply,
  onClose,
  onDelete
}) {
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');

  const filteredInquiries = inquiries.filter((item) => {
    // Status filter
    if (inquiryStatusFilter !== 'all') {
      if (inquiryStatusFilter === 'sent' && item.status !== 'sent') return false;
      if (inquiryStatusFilter === 'replied' && item.status !== 'replied') return false;
      if (inquiryStatusFilter === 'closed' && item.status !== 'closed') return false;
    }
    // Text search (search customer name, listing title, or message)
    if (!inquirySearch.trim()) return true;
    const q = inquirySearch.toLowerCase();
    const customerName = (item.customer?.name || item.customerName || '').toLowerCase();
    const customerPhone = (item.customer?.phone || '').toLowerCase();
    const customerEmail = (item.customer?.email || '').toLowerCase();
    const listingTitle = (item.listing?.title || item.reel?.caption || item.reel?.title || '').toLowerCase();
    const message = (item.message || item.msg || '').toLowerCase();
    return (
      customerName.includes(q) ||
      customerPhone.includes(q) ||
      customerEmail.includes(q) ||
      listingTitle.includes(q) ||
      message.includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#f8f4ec] p-3 rounded-2xl border border-[#e3dccb] text-xs">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            value={inquirySearch}
            onChange={(e) => setInquirySearch(e.target.value)}
            placeholder="Search by customer name, message, or listing title..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-[#e3dccb] rounded-xl text-xs text-[#1a1a1a] placeholder:text-slate-400 focus:outline-none focus:border-[#d99a3d] focus:ring-1 focus:ring-[#d99a3d] transition shadow-2xs"
          />
          {inquirySearch && (
            <button
              onClick={() => setInquirySearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black cursor-pointer"
            >
              <FiX size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 font-bold text-slate-600 w-full sm:w-auto shrink-0">
          <span className="text-[11px] uppercase tracking-wider text-slate-500">Status:</span>
          <select
            value={inquiryStatusFilter}
            onChange={(e) => setInquiryStatusFilter(e.target.value)}
            className="bg-white border border-[#e3dccb] rounded-xl px-3 py-2 text-xs font-bold text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d] cursor-pointer shadow-2xs"
          >
            <option value="all">All ({inquiries.length})</option>
            <option value="sent">New / Unreplied</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Inquiry Cards List */}
      {filteredInquiries.length === 0 ? (
        <div className="py-14 text-center text-xs text-slate-500 space-y-2 bg-[#fbf9f5] rounded-2xl border border-[#e3dccb]/70 p-6">
          <div className="w-12 h-12 rounded-2xl bg-[#f5efe4] text-[#9e6715] flex items-center justify-center mx-auto border border-[#e3dccb] shadow-2xs">
            <FiInbox size={24} />
          </div>
          <p className="font-extrabold text-[#1a1a1a] text-sm sm:text-base pt-1">
            {inquirySearch ? 'No matching enquiries found' : emptyText}
          </p>
          <p className="max-w-md mx-auto text-slate-500 leading-relaxed text-xs">
            {inquirySearch
              ? 'Try adjusting your search keywords or clear the status filter.'
              : 'Customer inquiries and questions sent from your listings or reels will appear here in real-time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredInquiries.map((e) => (
            <InquiryCard
              key={e._id || e.id}
              inquiry={e}
              onReply={onReply}
              onClose={onClose}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
