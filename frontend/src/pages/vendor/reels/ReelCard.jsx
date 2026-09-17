import React, { useState, useEffect } from 'react';
import {
  FiZap, FiClock, FiEye, FiHeart, FiMessageSquare,
  FiTrash2, FiShare2, FiExternalLink, FiMaximize2, FiTag
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ReelCardMediaCarousel from './ReelCardMediaCarousel';

/**
 * Calculates real-time boost status based on boostExpiresAt date
 */
export function getReelBoostInfo(reel) {
  const expiresAt = reel?.boostExpiresAt || reel?.boosted_until;
  if (!expiresAt) {
    return {
      isBoosted: false,
      isExpired: false,
      remainingText: '',
      hoursLeft: 0,
      daysLeft: 0,
    };
  }

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      isBoosted: false,
      isExpired: true,
      remainingText: 'Expired',
      expiryFormatted: expiryDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      hoursLeft: 0,
      daysLeft: 0,
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let text = '';
  if (days > 0) {
    text = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m left`;
  } else {
    text = `${minutes}m left`;
  }

  return {
    isBoosted: true,
    isExpired: false,
    remainingText: text,
    expiryFormatted: expiryDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    hoursLeft: Math.ceil(diffMs / (1000 * 60 * 60)),
    daysLeft: days,
  };
}

export default function ReelCard({
  reel,
  onBoost,
  onDelete,
  onPreview,
}) {
  const [boostInfo, setBoostInfo] = useState(() => getReelBoostInfo(reel));

  // Update boost status every 30 seconds for live countdown
  useEffect(() => {
    setBoostInfo(getReelBoostInfo(reel));
    const interval = setInterval(() => {
      setBoostInfo(getReelBoostInfo(reel));
    }, 30000);
    return () => clearInterval(interval);
  }, [reel?.boostExpiresAt, reel?.boosted_until, reel?.isBoosted]);

  const targetListing = reel.targetListing && typeof reel.targetListing === 'object'
    ? reel.targetListing
    : null;

  const handleShare = (e) => {
    e.stopPropagation();
    const publicUrl = `${window.location.origin}/reels?reelId=${reel._id || reel.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Reel link copied to clipboard!');
    } else {
      toast.success('Reel URL: ' + publicUrl);
    }
  };

  const status = (reel.status || 'published').toLowerCase();
  const statusColor =
    status === 'published'
      ? 'bg-emerald-500 text-white'
      : status === 'scheduled'
      ? 'bg-blue-600 text-white'
      : 'bg-amber-500 text-white';

  const couponCode = reel.couponCode || reel.data?.couponCode;
  const discountPercent = reel.discountPercent || reel.data?.discountPercent;

  return (
    <div className="bg-white rounded-2xl border border-[#e3dccb] shadow-2xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col group font-sans">
      {/* Media Carousel Area */}
      <div className="relative">
        <ReelCardMediaCarousel reel={reel} />

        {/* Floating Top Bar Over Media */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
          {/* Status Pill */}
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md pointer-events-auto ${statusColor}`}>
            {status}
          </span>

          {/* Expand / Preview Button */}
          {onPreview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(reel);
              }}
              className="w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 shadow-md pointer-events-auto cursor-pointer"
              title="Watch full screen"
            >
              <FiMaximize2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Boost Status Banner / Action Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-[#f1ece1] pb-2.5">
            {/* Boost Status Badge */}
            {boostInfo.isBoosted ? (
              <div
                className="bg-[#241b15] text-[#d99a3d] border border-[#d99a3d]/40 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-xs animate-pulse"
                title={`Boost active until ${boostInfo.expiryFormatted}`}
              >
                <FiZap size={12} className="fill-[#d99a3d] text-[#d99a3d]" />
                <span>BOOSTED</span>
                <span className="text-white/80 font-mono font-medium ml-1">
                  ({boostInfo.remainingText})
                </span>
              </div>
            ) : boostInfo.isExpired ? (
              <div className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                <FiClock size={11} />
                <span>Boost Ended ({boostInfo.expiryFormatted})</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Standard Feed
              </span>
            )}

            {/* Boost / Re-Boost Button */}
            {status === 'published' && (
              <button
                type="button"
                onClick={() => onBoost(reel)}
                className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-xs ${
                  boostInfo.isBoosted
                    ? 'bg-[#f8f4ec] text-[#7a531e] hover:bg-[#f0e7d5] border border-[#d99a3d]/30'
                    : boostInfo.isExpired
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border border-amber-600'
                    : 'bg-[#241b15] hover:bg-[#382b21] text-[#d99a3d] border border-[#241b15]'
                }`}
                title={boostInfo.isBoosted ? 'Extend active boost duration' : 'Boost this reel for higher reach'}
              >
                <FiZap size={12} className={boostInfo.isBoosted ? 'text-[#d99a3d]' : 'fill-current'} />
                <span>{boostInfo.isBoosted ? 'Extend' : boostInfo.isExpired ? 'Boost Again' : 'Boost'}</span>
              </button>
            )}
          </div>

          {/* Caption / Title */}
          <h4
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
            className="text-xs text-[#1a1a1a] line-clamp-2 uppercase leading-snug tracking-wide"
            title={reel.caption || reel.title}
          >
            {reel.caption || reel.title || 'Service Reel'}
          </h4>

          {/* Category & Radius Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#f8f4ec] text-[#241b15] border border-[#e3dccb]">
              {reel.category || 'Service'} • {reel.subcategory || 'General'}
            </span>
            {reel.promotionArea && (
              <span className="px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                📍 {reel.promotionArea}
              </span>
            )}
          </div>

          {/* Linked Product/Service Chip (If Attached) */}
          {targetListing && (
            <div className="p-2 bg-[#fbf9f4] border border-[#e8e2d4] rounded-xl flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2 min-w-0">
                {targetListing.images?.[0] || targetListing.thumbnailUrl ? (
                  <img
                    src={targetListing.images?.[0] || targetListing.thumbnailUrl}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover border border-[#e3dccb] shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#241b15] text-[#d99a3d] flex items-center justify-center shrink-0 text-xs">
                    🛍️
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10.5px] font-black text-slate-800 truncate block">
                    {targetListing.title || targetListing.name}
                  </span>
                  {(targetListing.salePrice || targetListing.price) && (
                    <span className="text-[10px] font-extrabold text-emerald-700 block">
                      ₹{Number(targetListing.salePrice || targetListing.price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#d99a3d] uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                Linked <FiExternalLink size={10} />
              </span>
            </div>
          )}

          {/* Offer / Coupon Badge (If attached) */}
          {(couponCode || discountPercent) && (
            <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-[10px] font-bold text-amber-900 mt-1">
              <span className="flex items-center gap-1">
                <FiTag size={11} className="text-amber-600" />
                {discountPercent ? `${discountPercent}% OFF` : 'Special Offer'}
              </span>
              {couponCode && (
                <span className="font-mono font-black uppercase bg-white px-1.5 py-0.5 rounded border border-amber-300">
                  {couponCode}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer Engagement Metrics & Actions */}
        <div className="pt-2 border-t border-[#f1ece1] flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1" title="Views">
              <FiEye size={13} className="text-slate-400" />
              <span>{reel.views !== undefined ? reel.views.toLocaleString() : 0}</span>
            </span>
            <span className="flex items-center gap-1" title="Likes">
              <FiHeart size={13} className="text-rose-500" />
              <span>{reel.likesCount || 0}</span>
            </span>
            <span className="flex items-center gap-1" title="Comments">
              <FiMessageSquare size={12} className="text-blue-500" />
              <span>{reel.commentsCount || 0}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer border-none bg-transparent"
              title="Copy share link"
            >
              <FiShare2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(reel._id || reel.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition cursor-pointer border-none bg-transparent"
              title="Delete Reel"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
