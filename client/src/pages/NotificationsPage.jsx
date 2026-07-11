import { useDispatch, useSelector } from 'react-redux';
import {
  selectNotifications, selectNotificationLoading,
  fetchNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, deleteNotification as removeNotif,
} from '../store/slices/notificationSlice.js';
import { useEffect } from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';

const TYPE_ICON = {
  TASK_ASSIGNED: '📋',
  COMMENT: '💬',
  MENTION: '@',
  DUE_DATE_REMINDER: '⏰',
  WORKSPACE_INVITATION: '✉️',
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const isLoading = useSelector(selectNotificationLoading);

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 50 }));
  }, [dispatch]);

  const handleMarkRead = (id) => dispatch(markNotificationRead(id));
  const handleMarkAllRead = () => dispatch(markAllNotificationsRead());
  const handleDelete = (id) => dispatch(deleteNotification(id));

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">All caught up!</h3>
          <p className="text-gray-400 text-sm">You have no notifications</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 dark:divide-gray-700">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={clsx(
                'flex items-start gap-3 p-4 transition-colors',
                !n.read && 'bg-blue-50/50 dark:bg-blue-900/10'
              )}
            >
              {/* Icon */}
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                {TYPE_ICON[n.type] || '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Mark as read"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n._id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
