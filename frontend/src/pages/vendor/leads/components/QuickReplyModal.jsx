import React, { useState, useEffect } from 'react';
import { FiSend, FiX, FiMessageSquare } from 'react-icons/fi';
import { useLanguage } from '../../../../context/LanguageContext';

export default function QuickReplyModal({
  inquiry,
  isOpen,
  onClose,
  onSendReply,
  isReplying = false
}) {
  const { bi } = useLanguage();
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (inquiry) {
      setReplyText(inquiry.replyMessage || '');
    } else {
      setReplyText('');
    }
  }, [inquiry]);

  if (!isOpen || !inquiry) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSendReply(inquiry, replyText.trim());
  };

  const customerName = inquiry.customer?.name || 'Verified Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white text-[#1a1a1a] border border-[#e3dccb] shadow-2xl rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e3dccb] pb-3 bg-[#f8f4ec] -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 px-5 sm:px-6 py-4 rounded-t-3xl gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f5efe4] text-[#9e6715] flex items-center justify-center border border-[#e3dccb] shadow-2xs shrink-0">
              <FiMessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#1a1a1a]">
                {bi('Reply to Inquiry', 'पूछताछ का उत्तर दें')}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Customer: <strong className="text-[#1a1a1a]">{customerName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white hover:bg-[#ede5d8] text-slate-700 transition border border-[#e3dccb] cursor-pointer shadow-2xs shrink-0"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Inquiry Summary Context */}
        <div className="bg-[#fbf9f5] p-3.5 rounded-2xl border border-[#e3dccb] space-y-2 text-xs">
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              {bi('Subject / Listing:', 'लिस्टिंग:')}
            </span>
            <strong className="text-[#1a1a1a] truncate max-w-[240px]">
              {inquiry.listing?.title || inquiry.reel?.caption || inquiry.reel?.title || 'Marketplace Item'}
            </strong>
          </div>
          <div className="space-y-1 pt-1 border-t border-[#e3dccb]/70">
            <span className="text-[#9e6715] font-black uppercase tracking-wider text-[10px] block">
              {bi('Customer Message:', 'ग्राहक संदेश:')}
            </span>
            <p className="text-slate-700 italic bg-white p-2.5 rounded-xl border border-[#e3dccb] leading-relaxed">
              "{inquiry.message || inquiry.msg}"
            </p>
          </div>
        </div>

        {/* Reply Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-1.5">
              {bi('Your Response Message *', 'आपका उत्तर संदेश *')}
            </label>
            <textarea
              rows={4}
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={bi("Write your official reply to the customer (they will be notified in real-time)...", "ग्राहक को अपना आधिकारिक उत्तर लिखें (उन्हें रियल-टाइम में सूचित किया जाएगा)...")}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e3dccb] rounded-2xl text-[#1a1a1a] focus:outline-none focus:border-[#d99a3d] focus:ring-1 focus:ring-[#d99a3d] text-xs leading-relaxed transition shadow-2xs placeholder:text-slate-400"
            />
          </div>

          <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-[#e3dccb]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#e3dccb] text-slate-700 hover:text-black hover:bg-[#ede5d8] rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              {bi('Cancel', 'रद्द करें')}
            </button>
            <button
              type="submit"
              disabled={isReplying || !replyText.trim()}
              className="px-5 py-2 bg-[#d99a3d] hover:bg-[#c4872c] text-white font-extrabold text-xs rounded-xl shadow-2xs hover:shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <FiSend size={13} />
              <span>{isReplying ? bi('Sending...', 'भेजा जा रहा है...') : bi('Send Reply', 'उत्तर भेजें')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
