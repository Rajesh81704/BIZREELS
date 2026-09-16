import React, { useState, useEffect } from 'react';
import { FiGift, FiCopy, FiClock, FiCheck, FiChevronLeft, FiChevronRight, FiTag, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

function OfferCountdown({ endTime, onExpire }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft('Expired');
        if (onExpire) onExpire();
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
      setTimeLeft(str);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (!timeLeft || timeLeft === 'Expired') return null;

  return (
    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-[#b45309] bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-md select-none">
      <FiClock className="animate-pulse text-[#d97706]" size={11} />
      <span>Ends in: {timeLeft}</span>
    </div>
  );
}

export default function ActiveOffersPanel({ role = 'customer' }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/offers/active', { params: { role } });
      const items = res.data?.items || [];
      // Strict role-targeted filtering
      const filtered = items.filter(o => 
        o.applicableToAll || 
        (Array.isArray(o.targetRoles) && o.targetRoles.includes(role))
      );
      setOffers(filtered);
    } catch (err) {
      console.warn('Failed to load active offers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    const socket = getSocket();
    if (!socket) return;

    const handleOfferActivated = (newOffer) => {
      const isTargeted = newOffer.applicableToAll || 
        (Array.isArray(newOffer.targetRoles) && newOffer.targetRoles.includes(role));
      if (isTargeted) {
        setOffers(prev => {
          if (prev.some(o => (o.id || o._id) === (newOffer.id || newOffer._id))) return prev;
          toast.success(`🎁 New Special Offer: ${newOffer.title}`);
          return [newOffer, ...prev];
        });
      }
    };

    const handleOfferExpired = ({ id }) => {
      setOffers(prev => prev.filter(o => (o.id || o._id) !== id));
      setCurrentIndex(0);
    };

    socket.on('offer:activated', handleOfferActivated);
    socket.on('offer:expired', handleOfferExpired);
    socket.on('offer:deleted', handleOfferExpired);
    socket.on('offer:updated', (updatedOffer) => {
      const isTargeted = updatedOffer.applicableToAll || 
        (Array.isArray(updatedOffer.targetRoles) && updatedOffer.targetRoles.includes(role));
      if (isTargeted) {
        setOffers(prev => prev.map(o => ((o.id || o._id) === (updatedOffer.id || updatedOffer._id)) ? updatedOffer : o));
      } else {
        setOffers(prev => prev.filter(o => (o.id || o._id) !== (updatedOffer.id || updatedOffer._id)));
      }
    });

    return () => {
      socket.off('offer:activated', handleOfferActivated);
      socket.off('offer:expired', handleOfferExpired);
      socket.off('offer:deleted', handleOfferExpired);
    };
  }, [role]);

  const handleCopyCode = (e, code, offerId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(offerId);
    toast.success(`Coupon code "${code}" copied!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOfferClick = async (offerId) => {
    try {
      await api.post(`/v1/offers/${offerId}/click`);
    } catch (err) {
      // silent fail
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % offers.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + offers.length) % offers.length);
  };

  if (isDismissed || offers.length === 0) return null;

  const currentOffer = offers[currentIndex];
  if (!currentOffer) return null;

  const getRoleBadge = (offer) => {
    const roles = Array.isArray(offer.targetRoles) ? offer.targetRoles : [];
    if (roles.includes('vendor') && !roles.includes('customer')) {
      return {
        label: 'Vendor Exclusive',
        className: 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      };
    }
    if (roles.includes('creator') && !roles.includes('customer')) {
      return {
        label: 'Creator Special',
        className: 'bg-purple-500/10 text-purple-700 border-purple-500/30'
      };
    }
    return {
      label: 'Special Deal',
      className: 'bg-[#d99a3d]/10 text-[#9c6a1e] border-[#d99a3d]/30'
    };
  };

  const roleBadge = getRoleBadge(currentOffer);
  const hasDistinctDesc = currentOffer.description && 
    currentOffer.description.trim().toLowerCase() !== (currentOffer.title || '').trim().toLowerCase();

  return (
    <div className="bg-gradient-to-r from-[#fffcf7] via-[#ffffff] to-[#faf6ed] border border-[#e8dfcf] rounded-2xl p-4 sm:p-5 shadow-[0_2px_10px_rgba(36,27,21,0.04)] relative overflow-hidden transition-all">
      {/* Dismiss Button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 text-[#a89f91] hover:text-[#241b15] hover:bg-[#f1ebe0] p-1 rounded-md transition select-none z-20"
        title="Dismiss offer"
        aria-label="Dismiss offer"
      >
        <FiX size={15} />
      </button>

      {/* Decorative Warm Accent Glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#d99a3d]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10 pr-6">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Offer Icon Badge */}
          <div className="p-2.5 rounded-xl bg-[#d99a3d]/15 border border-[#d99a3d]/25 text-[#b07823] flex-shrink-0 mt-0.5">
            <FiGift size={18} />
          </div>

          {/* Offer Text Details */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleOfferClick(currentOffer.id || currentOffer._id)}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${roleBadge.className}`}>
                {roleBadge.label}
              </span>
              {currentOffer.endTime && (
                <OfferCountdown 
                  endTime={currentOffer.endTime} 
                  onExpire={() => setOffers(prev => prev.filter(o => o.id !== currentOffer.id && o._id !== currentOffer._id))} 
                />
              )}
            </div>
            
            <h3 className="text-sm font-extrabold text-[#241b15] mt-1 line-clamp-1 font-sans">
              {currentOffer.title}
            </h3>
            
            {hasDistinctDesc && (
              <p className="text-xs text-[#6b6255] mt-0.5 line-clamp-2 leading-relaxed font-sans">
                {currentOffer.description}
              </p>
            )}

            {currentOffer.terms && (
              <p className="text-[10px] text-[#9c9182] italic mt-1 flex items-center gap-1 select-none">
                * {currentOffer.terms}
              </p>
            )}
          </div>
        </div>

        {/* Promo Code & Action Box */}
        <div className="flex flex-col items-end justify-between flex-shrink-0">
          {/* Discount Tag */}
          <div className="text-right">
            <span className="text-base sm:text-lg font-black text-[#15803d] block tracking-tight">
              {currentOffer.discountType === 'percentage' 
                ? `${currentOffer.discountValue}% OFF` 
                : `₹${currentOffer.discountValue} OFF`
              }
            </span>
            {currentOffer.minOrderAmount > 0 && (
              <span className="text-[10px] text-[#8c8273] font-bold block mt-0.5">
                Min. spend: ₹{currentOffer.minOrderAmount}
              </span>
            )}
          </div>

          {/* Copy Code Action */}
          {currentOffer.code ? (
            <button
              onClick={(e) => handleCopyCode(e, currentOffer.code, currentOffer.id || currentOffer._id)}
              className="mt-2 px-2.5 py-1 rounded-lg border border-[#e3dccb] bg-[#fbf8f2] hover:bg-[#f3ede0] text-[#241b15] text-[11px] font-mono font-extrabold flex items-center gap-1.5 transition-all shadow-2xs hover:scale-[1.02] active:scale-95"
              title="Click to copy coupon code"
            >
              <FiTag size={12} className="text-[#b07823]" />
              <span>{currentOffer.code}</span>
              {copiedId === (currentOffer.id || currentOffer._id) ? (
                <FiCheck size={12} className="text-emerald-600" />
              ) : (
                <FiCopy size={11} className="text-[#8c8273]" />
              )}
            </button>
          ) : (
            <span className="text-[10px] text-[#8c8273] font-bold italic mt-2">Auto-Applied</span>
          )}
        </div>
      </div>

      {/* Slide Navigation Dots / Arrows (If multiple offers) */}
      {offers.length > 1 && (
        <div className="flex items-center justify-between border-t border-[#eee7da] mt-3 pt-2 text-[10px] text-[#8c8273] font-bold select-none relative z-10">
          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrev} 
              className="p-1 hover:bg-[#efe9dd] rounded border border-[#e3dccb] text-[#241b15] transition"
              title="Previous Offer"
            >
              <FiChevronLeft size={13} />
            </button>
            <span className="px-1 text-[#4a4237]">
              {currentIndex + 1} of {offers.length}
            </span>
            <button 
              onClick={handleNext} 
              className="p-1 hover:bg-[#efe9dd] rounded border border-[#e3dccb] text-[#241b15] transition"
              title="Next Offer"
            >
              <FiChevronRight size={13} />
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            {offers.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  currentIndex === idx ? 'w-3 bg-[#d99a3d]' : 'bg-[#d8cfbe] hover:bg-[#a89f91]'
                }`}
                title={`Go to offer ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
