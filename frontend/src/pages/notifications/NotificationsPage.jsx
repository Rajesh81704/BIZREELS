import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import NotificationHeader from '../../components/notifications/NotificationHeader';
import NotificationFilterTabs, {
  matchesNotificationTab,
} from '../../components/notifications/NotificationFilterTabs';
import NotificationItem from '../../components/notifications/NotificationItem';

export default function NotificationsPage({ role: propRole }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect role from prop or route if not explicitly provided
  const pathname = location.pathname;
  const role =
    propRole ||
    (pathname.includes('/vendor')
      ? 'vendor'
      : pathname.includes('/creator')
      ? 'creator'
      : 'customer');

  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api
        .get(`/v1/notifications/me?role=${role}`)
        .catch(() => api.get(`/v1/notifications?role=${role}`));
      const data = res.data?.data || res.data;
      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.notifications)
        ? data.notifications
        : Array.isArray(data)
        ? data
        : [];
      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (notif) => {
      let matchesRole = false;
      if (notif.recipientRole) {
        matchesRole = notif.recipientRole === role;
      } else {
        const url = (notif.actionUrl || notif.action_url || '').toLowerCase();
        if (role === 'vendor') {
          matchesRole = url.startsWith('/vendor');
        } else if (role === 'creator') {
          matchesRole = url.startsWith('/creator');
        } else {
          matchesRole =
            url.startsWith('/customer') ||
            (!url.startsWith('/vendor') &&
              !url.startsWith('/creator') &&
              !url.startsWith('/admin'));
        }
      }

      if (matchesRole) {
        setNotifications((prev) => [notif, ...prev]);
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification', handleNewNotification);
    };
  }, [role, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api
        .post(`/v1/notifications/me/read-all?role=${role}`)
        .catch(() => api.post(`/v1/notifications/read-all?role=${role}`));
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, is_read: true, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleNotificationClick = async (n) => {
    const nid = n._id || n.id;
    if (nid && !n.isRead && !n.is_read && !n.read) {
      try {
        await api
          .post(`/v1/notifications/${nid}/read`)
          .catch(() => api.patch(`/v1/notifications/${nid}/read`));
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === nid || item.id === nid
              ? { ...item, isRead: true, is_read: true, read: true }
              : item
          )
        );
      } catch {}
    }

    const actionUrl = n.actionUrl || n.action_url;
    if (actionUrl) {
      let target = actionUrl;
      if (role === 'vendor' && !target.startsWith('/vendor') && !target.startsWith('http')) {
        if (target.startsWith('/wallet')) target = '/vendor/subscription';
        else if (target.startsWith('/subscription')) target = '/vendor/subscription';
        else if (target.startsWith('/chat')) target = '/vendor/chat';
        else if (target.startsWith('/leads') || target.startsWith('/inquiries'))
          target = '/vendor/leads';
      } else if (role === 'creator' && !target.startsWith('/creator') && !target.startsWith('http')) {
        if (target.startsWith('/wallet')) target = '/creator/wallet';
        else if (target.startsWith('/subscription')) target = '/creator/subscription';
        else if (target.startsWith('/chat')) target = '/creator/chat';
      }
      navigate(target);
    }
  };

  const handleDeleteNotification = async (nid) => {
    try {
      await api.delete(`/v1/notifications/${nid}`);
      setNotifications((prev) =>
        prev.filter((item) => item._id !== nid && item.id !== nid)
      );
      toast.success('Notification removed');
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const filtered = notifications.filter((n) => matchesNotificationTab(n, activeTab));
  const unreadCount = notifications.filter((n) => !n.isRead && !n.is_read && !n.read).length;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-5 animate-fade-in p-3 sm:p-5 min-h-screen pb-24 lg:pb-8 font-sans">
      {/* Header Banner */}
      <NotificationHeader
        role={role}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Category Tabs */}
      <NotificationFilterTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notifications={notifications}
      />

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-white/70 border border-[#e3dccb] rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-xs text-slate-500 border border-[#e3dccb] shadow-xs">
          <FiCheckCircle size={36} className="mx-auto mb-2 text-slate-400" />
          <p className="font-bold text-slate-700">You&apos;re all caught up!</p>
          <p className="text-[11px] text-slate-400 mt-0.5">No notifications in this section.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => (
            <NotificationItem
              key={notification._id || notification.id}
              notification={notification}
              onClick={handleNotificationClick}
              onDelete={handleDeleteNotification}
            />
          ))}
        </div>
      )}
    </div>
  );
}
