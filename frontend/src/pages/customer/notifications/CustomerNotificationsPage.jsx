import React from 'react';
import NotificationsPage from '../../notifications/NotificationsPage';

/**
 * Backward-compatible export for CustomerNotificationsPage.
 * Delegates to the unified, modular NotificationsPage.
 */
export default function CustomerNotificationsPage(props) {
  return <NotificationsPage role="customer" {...props} />;
}
