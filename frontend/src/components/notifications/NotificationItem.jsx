import React from 'react';
import {
  FiBell,
  FiShield,
  FiMessageSquare,
  FiTag,
  FiShoppingBag,
  FiDollarSign,
  FiTrash2,
  FiExternalLink,
} from 'react-icons/fi';
import NotificationCountdown from './NotificationCountdown';
import NotificationCouponBox from './NotificationCouponBox';

function getNotificationIcon(type) {
  const t = (type || '').toLowerCase();
  if (['order', 'lead', 'quote', 'requirement', 'proposal'].includes(t)) {
    return <FiShoppingBag className="text-emerald-600" size={18} />;
  }
  if (['payment', 'wallet'].includes(t)) {
    return <FiDollarSign className="text-amber-500" size={18} />;
  }
  if (['offer', 'offers', 'deal', 'discount', 'price'].includes(t)) {
    return <FiTag className="text-pink-500" size={18} />;
  }
  if (['message', 'chat', 'vendor', 'customer'].includes(t)) {
    return <FiMessageSquare className="text-purple-600" size={18} />;
  }
  if (['kyc', 'verification'].includes(t)) {
    return <FiShield className="text-blue-600" size={18} />;
  }
  return <FiBell className="text-[#d99a3d]" size={18} />;
}

export default function NotificationItem({ notification, onClick, onDelete }) {
  const isUnread = !notification.isRead && !notification.is_read && !notification.read;
  const nid = notification._id || notification.id;
  const actionUrl = notification.actionUrl || notification.action_url;

  // Extract coupon code and discount details
  const couponCode =
    notification.data?.code ||
    notification.data?.couponCode ||
    (notification.body && notification.body.match(/code\s*[:"']?\s*([A-Z0-9_-]{3,})/i)?.[1]) ||
    (notification.message && notification.message.match(/code\s*[:"']?\s*([A-Z0-9_-]{3,})/i)?.[1]) ||
    null;

  const discountValue = notification.data?.discountValue;
  const discountType = notification.data?.discountType;
  const discountLabel = discountValue
    ? discountType === 'percentage'
      ? `${discountValue}% OFF`
      : `₹${discountValue} OFF`
    : notification.data?.discountPercent
    ? `${notification.data.discountPercent}% OFF`
    : null;

  const expiryTime =
    notification.data?.endTime || notification.data?.validTill || notification.validTill;

  const dateStr = notification.createdAt || notification.created_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return (
    <div
      onClick={() => onClick(notification)}
      className={`bg-white rounded-2xl p-4 border transition flex items-start gap-3.5 sm:gap-4 cursor-pointer hover:shadow-md ${
        isUnread
          ? 'border-[#d99a3d] bg-amber-50/20 shadow-xs'
          : 'border-[#e3dccb] hover:bg-[#fcfbfa]'
      }`}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-[#f8f4ec] border border-[#e3dccb] flex items-center justify-center shrink-0 shadow-xs">
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h4
              className={`text-xs truncate ${
                isUnread ? 'font-extrabold text-[#1a1a1a]' : 'font-bold text-slate-700'
              }`}
            >
              {notification.title || 'System Notification'}
            </h4>
            {isUnread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(notification.type === 'offers' || notification.type === 'offer' || couponCode) &&
              expiryTime && <NotificationCountdown validTill={expiryTime} />}
            <span className="text-[10px] text-slate-400 font-semibold">{formattedDate}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
          {notification.body || notification.message || 'Click to view details.'}
        </p>

        {/* Modular Coupon Box */}
        {couponCode && (
          <NotificationCouponBox code={couponCode} discountLabel={discountLabel} />
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-1">
          {actionUrl ? (
            <span className="text-[11px] font-bold text-[#d99a3d] hover:underline flex items-center gap-1">
              <span>View Details</span>
              <FiExternalLink size={12} />
            </span>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(nid);
            }}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition cursor-pointer border-none bg-transparent"
            title="Delete Notification"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
