// src/components/admin/AdminSidebar.jsx
// Admin portal navigation sidebar.
//
// Desktop (lg+): persistent left sidebar, always visible via CSS.
// Mobile (< lg):  off-canvas drawer — slides in/out based on isMobileMenuOpen.
//
// Props:
//   isMobileMenuOpen  — boolean — whether the mobile drawer is open
//   onClose           — function — called when user closes the drawer
//
// Closing triggers (mobile only):
//   1. Clicking the semi-transparent overlay backdrop.
//   2. Clicking any navigation link.
//   3. Clicking the × close button.
//
// State ownership: AdminLayout owns isMobileMenuOpen — NOT this component.

import { ClipboardList, LayoutDashboard, ShieldCheck, X, BarChart3, Settings, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

/** Navigation link definitions. */
const NAV_LINKS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true
  },
  {
    to: '/admin/complaints',
    label: 'Complaints',
    icon: ClipboardList,
    end: false
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: Users,
    end: false
  },
  {
    to: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3,
    end: false
  },
  {
    to: '/admin/settings',
    label: 'Settings',
    icon: Settings,
    end: false
  }
];

/**
 * Builds the className string for a NavLink based on its active state.
 * Static class strings only — no dynamic interpolation.
 */
function navLinkClass({ isActive }) {
  return isActive
    ? 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold bg-[#0a1422] text-white transition-colors duration-150'
    : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150';
}

/**
 * AdminSidebar
 *
 * @param {{ isMobileMenuOpen: boolean, onClose: () => void }} props
 */
export default function AdminSidebar({ isMobileMenuOpen, onClose }) {
  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Mobile overlay backdrop — only rendered on small screens             */}
      {/* ------------------------------------------------------------------ */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar panel                                                        */}
      {/* Desktop: static, always visible (lg:static overrides fixed)         */}
      {/* Mobile:  fixed drawer, translated based on isMobileMenuOpen         */}
      {/* ------------------------------------------------------------------ */}
      <aside
        className={[
          // Mobile base — fixed drawer
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          // Mobile open/close transform
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop overrides — static, no shadow, right border instead
          'lg:static lg:translate-x-0 lg:shadow-none lg:border-r lg:border-[#e5e7eb]'
        ].join(' ')}
        aria-label="Admin navigation"
      >
        {/* -------- Brand header -------- */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-[#e5e7eb]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a1422]">
              <ShieldCheck size={16} className="text-white" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#0a1422] leading-tight">Smart Campus</p>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider leading-tight">
                Admin Portal
              </p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            type="button"
            className="flex lg:hidden items-center justify-center h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#0a1422]"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* -------- Navigation links -------- */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Menu
          </p>
          <ul className="space-y-0.5" role="list">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={navLinkClass}
                    onClick={onClose}
                    aria-current={undefined}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* -------- Footer / version tag -------- */}
        <div className="shrink-0 px-4 py-4 border-t border-[#e5e7eb]">
          <p className="text-[10px] text-gray-400 font-medium">
            Smart Campus Complaints
          </p>
          <p className="text-[10px] text-gray-300">Admin v1.0</p>
        </div>
      </aside>
    </>
  );
}
