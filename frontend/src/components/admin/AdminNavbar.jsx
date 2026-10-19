// src/components/admin/AdminNavbar.jsx
// Top sticky navbar for the admin portal.

import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Inbox, LogOut, Menu, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from '../../api/adminApi';
import { useSystemTimezone } from '../../context/TimezoneContext';
import { formatRelativeTime } from '../../utils/formatDate';

function getInitials(emailOrName) {
  if (!emailOrName) return 'A';
  const local = emailOrName.split('@')[0];
  const parts = local.split(/[.\-_\s]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminNavbar({ onMenuOpen }) {
  const { user, logout } = useAuth();
  const { timezone } = useSystemTimezone();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  const initials = getInitials(user?.name || user?.email || '');
  const displayName = user?.name || user?.email || 'Admin';

  async function loadNotifications() {
    if (user?.role !== 'admin') return;

    setIsLoadingNotifications(true);
    setNotificationError('');
    try {
      const result = await getAdminNotifications(10);
      setNotifications(result.notifications || []);
      setUnreadCount(result.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotificationError('Could not load notifications.');
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 60_000);
    return () => window.clearInterval(interval);
  }, [user?.role]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleNotificationClick(notification) {
    if (!notification.readAt) {
      try {
        await markAdminNotificationRead(notification.id);
        setNotifications(current =>
          current.map(item =>
            item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount(count => Math.max(count - 1, 0));
      } catch (error) {
        console.error('Failed to mark notification read:', error);
      }
    }

    setIsNotificationsOpen(false);
    navigate('/admin/complaints');
  }

  async function handleMarkAllRead() {
    try {
      await markAllAdminNotificationsRead();
      const now = new Date().toISOString();
      setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center border-b border-[#e5e7eb] bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex lg:hidden items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#0a1422]"
          onClick={onMenuOpen}
          aria-label="Open navigation menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0a1422]">
            <ShieldCheck size={14} className="text-white" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold text-[#0a1422]">Smart Campus</span>
        </div>

        <span className="hidden lg:block text-sm font-semibold text-[#0a1422] tracking-tight">
          Admin Portal
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#0a1422]"
            aria-label="View notifications"
            aria-expanded={isNotificationsOpen}
            onClick={() => {
              const nextOpen = !isNotificationsOpen;
              setIsNotificationsOpen(nextOpen);
              if (nextOpen) loadNotifications();
            }}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  <p className="text-xs text-gray-500">{unreadCount} unread</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={14} aria-hidden="true" />
                  Mark all
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoadingNotifications ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">Loading notifications...</div>
                ) : notificationError ? (
                  <div className="px-4 py-6 text-center text-sm text-red-600">{notificationError}</div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                    <Inbox size={22} className="text-gray-400" aria-hidden="true" />
                    <p className="mt-2 text-sm font-medium text-gray-700">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 ${
                        notification.readAt ? 'bg-white' : 'bg-blue-50/60'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            notification.readAt ? 'bg-gray-300' : 'bg-blue-600'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-gray-600">
                            {notification.message}
                          </span>
                          <span className="mt-1 block text-[11px] font-medium text-gray-400">
                            {formatRelativeTime(notification.createdAt, timezone)}
                          </span>
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <span className="hidden sm:block h-6 w-px bg-gray-200 mx-1" aria-hidden="true" />

        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `hidden sm:flex items-center gap-2.5 py-1 px-2.5 rounded-xl border transition-all ${
              isActive
                ? 'bg-blue-50 border-blue-200 text-blue-900 shadow-xs'
                : 'border-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
          title="Admin Settings"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a1422] text-white text-xs font-bold select-none"
            aria-hidden="true"
          >
            {initials}
          </span>
          <span className="hidden md:block max-w-[140px] truncate text-sm font-medium">
            {displayName}
          </span>
          <Settings size={14} className="text-gray-400 hidden md:block" />
        </NavLink>

        <span className="hidden sm:block h-6 w-px bg-gray-200 mx-1" aria-hidden="true" />

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-400"
          onClick={() => logout()}
          aria-label="Log out of admin portal"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
