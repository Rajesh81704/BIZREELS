import React from 'react';
import { FiBell, FiShoppingBag, FiTag, FiMessageSquare, FiShield } from 'react-icons/fi';

export const DEFAULT_NOTIFICATION_TABS = [
  { key: 'all', label: 'All Notifications', icon: FiBell },
  { key: 'orders', label: 'Orders & Leads', icon: FiShoppingBag },
  { key: 'offers', label: 'Offers & Discounts', icon: FiTag },
  { key: 'messages', label: 'Messages & Inquiries', icon: FiMessageSquare },
  { key: 'system', label: 'System & Security', icon: FiShield },
];

export function matchesNotificationTab(notification, tabKey) {
  if (tabKey === 'all') return true;
  const t = (notification.type || '').toLowerCase();
  if (tabKey === 'orders') {
    return ['order', 'order_status', 'lead', 'inquiry', 'quote', 'proposal', 'requirement'].includes(t);
  }
  if (tabKey === 'offers') {
    return ['offer', 'offers', 'deal', 'deals', 'price', 'discount'].includes(t);
  }
  if (tabKey === 'messages') {
    return ['message', 'chat', 'vendor', 'customer', 'reply', 'comment', 'like'].includes(t);
  }
  if (tabKey === 'system') {
    return ['system', 'admin', 'kyc', 'verification', 'wallet', 'payment', 'hire', 'campaign'].includes(t);
  }
  return t === tabKey;
}

export default function NotificationFilterTabs({
  tabs = DEFAULT_NOTIFICATION_TABS,
  activeTab,
  onTabChange,
  notifications = [],
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const unreadCount = notifications.filter(
          (n) => matchesNotificationTab(n, tab.key) && (!n.isRead && !n.is_read && !n.read)
        ).length;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition cursor-pointer border ${
              isActive
                ? 'bg-[#241b15] text-[#d99a3d] border-[#241b15] shadow-xs'
                : 'bg-white border-[#e3dccb] text-slate-700 hover:bg-[#f8f4ec]'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-[#d99a3d]' : 'text-slate-500'} />
            <span>{tab.label}</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-[#d99a3d] text-[#241b15]' : 'bg-red-500 text-white'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
