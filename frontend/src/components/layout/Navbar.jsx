import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead
} from '../../api/notificationApi';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/formatDate';
import { ShieldCheck, Bell, BellOff, LogOut, Settings as SettingsIcon } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  async function loadNotifications() {
    if (user?.role !== 'student') return;

    setIsLoadingNotifications(true);
    setNotificationError('');
    try {
      const result = await getMyNotifications(10);
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
  }, [user?.id, user?.role]);

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
        await markMyNotificationRead(notification.id);
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
    navigate('/history');
  }

  async function handleMarkAllRead() {
    try {
      await markAllMyNotificationsRead();
      const now = new Date().toISOString();
      setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark notifications read:', error);
    }
  }

  return (
    <nav className="bg-surface-container-lowest w-full top-0 border-b border-outline-variant z-50 sticky">
      <div className="flex justify-between items-center w-full px-gutter max-w-container-max mx-auto h-16">
        {/* Brand */}
        <div className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
          <ShieldCheck size={24} />
          Smart Campus
        </div>

        {/* Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center space-x-8 h-full">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `h-full flex items-center font-bold pb-1 pt-1 duration-200 ease-in-out hover:text-secondary transition-colors border-b-2 ${
                isActive ? 'text-primary border-secondary' : 'text-on-surface-variant border-transparent'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/submit"
            className={({ isActive }) =>
              `h-full flex items-center font-bold pb-1 pt-1 duration-200 ease-in-out hover:text-secondary transition-colors border-b-2 ${
                isActive ? 'text-primary border-secondary' : 'text-on-surface-variant border-transparent'
              }`
            }
          >
            Submit Complaint
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `h-full flex items-center font-bold pb-1 pt-1 duration-200 ease-in-out hover:text-secondary transition-colors border-b-2 ${
                isActive ? 'text-primary border-secondary' : 'text-on-surface-variant border-transparent'
              }`
            }
          >
            History
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `h-full flex items-center font-bold pb-1 pt-1 duration-200 ease-in-out hover:text-secondary transition-colors border-b-2 ${
                isActive ? 'text-primary border-secondary' : 'text-on-surface-variant border-transparent'
              }`
            }
          >
            Settings
          </NavLink>
        </div>

        {/* Trailing Icons */}
        <div className="flex items-center space-x-4 text-on-surface-variant">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-label="View notifications"
              aria-expanded={isNotificationsOpen}
              className="relative hover:text-secondary transition-colors duration-200 ease-in-out flex items-center justify-center p-1.5 rounded-full hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-secondary/40"
              onClick={() => {
                const nextOpen = !isNotificationsOpen;
                setIsNotificationsOpen(nextOpen);
                if (nextOpen) loadNotifications();
              }}
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
                <div className="flex items-center justify-between border-b border-outline-variant/70 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">Notifications</p>
                    <p className="text-xs text-on-surface-variant">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary disabled:opacity-50"
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {isLoadingNotifications ? (
                    <div className="px-4 py-6 text-center text-sm text-on-surface-variant">Loading notifications...</div>
                  ) : notificationError ? (
                    <div className="px-4 py-6 text-center text-sm text-error">{notificationError}</div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                      <BellOff size={48} className="text-outline" strokeWidth={1} />
                      <p className="mt-2 text-sm font-medium text-on-surface-variant">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(notification => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`block w-full border-b border-outline-variant/60 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-container-low ${
                          notification.readAt ? 'bg-surface-container-lowest' : 'bg-secondary-container/30'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <span className="flex gap-3">
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              notification.readAt ? 'bg-outline-variant' : 'bg-secondary'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-primary">
                              {notification.title}
                            </span>
                            <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">
                              {notification.message}
                            </span>
                            <span className="mt-1 block text-[11px] font-medium text-outline">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pl-2 ml-2 border-l border-outline-variant">
            <NavLink
              to="/settings"
              className="text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors hidden sm:flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-surface-container-low"
              title="Account Settings"
            >
              <span>{user?.name || user?.email}</span>
              <SettingsIcon size={16} className="text-on-surface-variant hover:text-primary" />
            </NavLink>
            <button
              onClick={() => logout()}
              className="hover:text-error transition-colors duration-200 ease-in-out flex items-center p-1.5 rounded-full hover:bg-surface-container-low"
              title="Logout"
              aria-label="Log out"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
