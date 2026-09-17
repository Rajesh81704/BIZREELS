import React from 'react';
import { FiX, FiEye, FiHeart, FiMessageSquare, FiZap, FiExternalLink, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { resolveMediaUrl } from '@/lib/api';
import { getReelBoostInfo } from './ReelCard';

export default function ReelWatchModal({ isOpen, onClose, reel, onBoost }) {
  if (!isOpen || !reel) return null;

  const rawMediaList = Array.isArray(reel.mediaUrls) && reel.mediaUrls.length > 0
    ? reel.mediaUrls
    : [reel.videoUrl || reel.thumbnailUrl || ''];

  const mediaUrl = resolveMediaUrl(rawMediaList[0] || reel.videoUrl || '');
  const isVideo = reel.mediaType === 'video' || /\.(mp4|webm|mov|m4v)/i.test(mediaUrl);
  const boostInfo = getReelBoostInfo(reel);

  const handleShare = () => {
    const publicUrl = `${window.location.origin}/reels?reelId=${reel._id || reel.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicUrl);
      toast.success('Reel link copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#1a1714] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center backdrop-blur-md transition border border-white/20 cursor-pointer"
        >
          <FiX size={18} />
        </button>

        {/* Video / Media Player Panel */}
        <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative min-h-[350px] md:min-h-[550px]">
          {isVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] w-full object-contain"
            />
          ) : (
            <img
              src={mediaUrl}
              alt={reel.caption || 'Reel'}
              className="max-h-[85vh] w-full object-contain"
            />
          )}
        </div>

        {/* Right Info & Actions Panel */}
        <div className="w-full md:w-2/5 p-6 flex flex-col justify-between text-white font-sans overflow-y-auto">
          <div className="space-y-4">
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#d99a3d] text-[#1a1a1a]">
                {reel.category || 'Reel'}
              </span>
              {boostInfo.isBoosted ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <FiZap size={11} className="fill-current" /> Boosted ({boostInfo.remainingText})
                </span>
              ) : boostInfo.isExpired ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                  Boost Ended
                </span>
              ) : null}
            </div>

            {/* Caption */}
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {reel.caption || reel.title || 'Untitled Reel'}
              </h3>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Posted {new Date(reel.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <div>
                <span className="text-slate-400 text-[10px] block font-bold">VIEWS</span>
                <span className="text-sm font-black text-white flex items-center justify-center gap-1 mt-0.5">
                  <FiEye size={12} className="text-slate-400" /> {(reel.views || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold">LIKES</span>
                <span className="text-sm font-black text-rose-400 flex items-center justify-center gap-1 mt-0.5">
                  <FiHeart size={12} /> {reel.likesCount || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block font-bold">COMMENTS</span>
                <span className="text-sm font-black text-blue-400 flex items-center justify-center gap-1 mt-0.5">
                  <FiMessageSquare size={12} /> {reel.commentsCount || 0}
                </span>
              </div>
            </div>

            {/* Attached Listing */}
            {reel.targetListing && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold block">
                    Linked Product / Service
                  </span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {reel.targetListing.title || reel.targetListing.name}
                  </span>
                </div>
                <FiExternalLink size={14} className="text-[#d99a3d]" />
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-white/10 flex items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
            >
              <FiShare2 size={14} />
              <span>Share</span>
            </button>

            {onBoost && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBoost(reel);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#d99a3d] hover:bg-[#c4892e] text-[#1a1a1a] text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer border-none"
              >
                <FiZap size={14} className="fill-current" />
                <span>{boostInfo.isBoosted ? 'Extend Boost' : boostInfo.isExpired ? 'Boost Again' : 'Boost Reel'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
