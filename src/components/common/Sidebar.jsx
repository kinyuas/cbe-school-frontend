// src/components/common/Sidebar.jsx
import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiHome,
  FiUsers,
  FiBookOpen,
  FiCalendar,
  FiBarChart2,
  FiUserCheck,
  FiBell,
  FiLogOut,
  FiRefreshCw,
  FiEdit3,
  FiSettings,
  FiAward,
  FiDollarSign,
  FiX,
  FiTarget,
  FiHeart,
} from 'react-icons/fi';

// ============================================================
// ROLE → DISPLAY LABEL MAPS
// ============================================================
const MENU_LABELS = {
  admin: 'ADMIN MENU',
  teacher: 'TEACHER MENU',
  bursar: 'BURSAR MENU',
  parent: 'PARENT MENU',
  pupil: 'PUPIL MENU',
};

const ROLE_LABELS = {
  admin: 'Administrator',
  teacher: 'Teacher',
  bursar: 'Bursar',
  parent: 'Parent / Guardian',
  pupil: 'Pupil',
};

const PORTAL_TITLES = {
  admin: 'School Manager',
  teacher: 'Teacher Portal',
  bursar: 'Bursar Portal',
  parent: 'Parent Portal',
  pupil: 'Pupil Portal',
};

const Sidebar = ({ isMobile, isOpen, onClose }) => {
  const { user, logout } = useAuth();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && isOpen) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.contains(e.target)) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen, onClose]);

  // ============================================================
  // MENUS PER ROLE
  // ============================================================
  const adminMenu = [
    { path: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/admin/pupils', icon: FiUsers, label: 'Students' },
    { path: '/admin/teachers', icon: FiUserCheck, label: 'Teachers' },

    // ✅ COMBINED: Events & Exams (single nav item, single page with tabs)
    { path: '/admin/events-exams', icon: FiCalendar, label: 'Events & Exams' },

    // ✅ COMBINED: Transferred / Alumni (single nav item, single page with tabs)
    { path: '/admin/transferred-alumni', icon: FiRefreshCw, label: 'Transferred / Alumni' },

    { path: '/admin/modify-results', icon: FiEdit3, label: 'Modify Results' },
    { path: '/admin/reports', icon: FiBarChart2, label: 'Reports/Results' },
    // { path: '/admin/fees', icon: FiDollarSign, label: 'Fees' },
    { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
  ];

  const teacherMenu = [
    { path: '/teacher/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/teacher/students', icon: FiUsers, label: 'My Students' },
    { path: '/teacher/results', icon: FiBookOpen, label: 'Update Results' },
    { path: '/teacher/performance', icon: FiBarChart2, label: 'Performance' },
    { path: '/teacher/announcements', icon: FiBell, label: 'Exams/Events' },

    // 👇 Consolidated Hubs
    { path: '/teacher/parent-hub', icon: FiHeart, label: 'Parent Collaboration' },
    { path: '/teacher/pupil-hub', icon: FiTarget, label: 'Pupil Learning' },
  ];

  const bursarMenu = [
    { path: '/bursar/fees', icon: FiDollarSign, label: 'Fees' },
  ];

  const parentMenu = [
    { path: '/parent/dashboard', icon: FiHome, label: 'Dashboard' },
  ];

  const pupilMenu = [
    { path: '/pupil/dashboard', icon: FiHome, label: 'My Learning Journey' },
  ];

  // ============================================================
  // PICK MENU + LABELS BY ROLE
  // ============================================================
  const menuItems =
    user?.role === 'admin'
      ? adminMenu
      : user?.role === 'bursar'
      ? bursarMenu
      : user?.role === 'parent'
      ? parentMenu
      : user?.role === 'pupil'
      ? pupilMenu
      : teacherMenu;

  const menuLabel = MENU_LABELS[user?.role] || 'MENU';
  const roleLabel = ROLE_LABELS[user?.role] || 'User';
  const portalTitle = PORTAL_TITLES[user?.role] || 'Portal';

  // ============================================================
  // NAV LINK ACTIVE RESOLVER
  // Extends active-state detection to legacy URLs for combined routes,
  // so the sidebar highlight stays correct during redirects.
  // ============================================================
  const isPathActive = (isActive, itemPath) => {
    if (isActive) return true;

    // Combined Events/Exams — treat legacy URLs as active
    if (itemPath === '/admin/events-exams') {
      const legacy = ['/admin/events', '/admin/exams'];
      return legacy.some(
        (p) =>
          window.location.pathname === p ||
          window.location.pathname.startsWith(p + '/')
      );
    }

    // Combined Transferred/Alumni — treat legacy URLs as active
    if (itemPath === '/admin/transferred-alumni') {
      const legacy = ['/admin/transferred-learners', '/admin/alumni'];
      return legacy.some(
        (p) =>
          window.location.pathname === p ||
          window.location.pathname.startsWith(p + '/')
      );
    }

    return false;
  };

  // ============================================================
  // MOBILE SIDEBAR
  // ============================================================
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}

        <aside
          id="sidebar"
          className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-900 via-blue-800 to-green-800 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="p-4 border-b border-blue-700/50">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 shadow-lg flex-shrink-0">
                <FiAward className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-white truncate">
                  {portalTitle}
                </h2>
                <p className="text-[8px] text-blue-200">CBE Education System</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 text-blue-300" />
            </button>
          </div>

          {/* Menu */}
          <nav className="flex-1 py-3 overflow-y-auto h-[calc(100vh-120px)]">
            <div className="px-3 mb-2">
              <p className="text-[8px] text-blue-300 uppercase tracking-wider font-semibold">
                {menuLabel}
              </p>
            </div>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg transition-all duration-200 ${
                    isPathActive(isActive, item.path)
                      ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info */}
          <div className="p-3 border-t border-blue-700/50">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-800/40 backdrop-blur-sm border border-blue-700/30">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-[10px] font-bold text-white">
                  {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate text-white">
                  {user?.name || 'User'}
                </p>
                <p className="text-[8px] text-blue-300">{roleLabel}</p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                title="Logout"
              >
                <FiLogOut className="w-3 h-3 text-blue-300 hover:text-red-400" />
              </button>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // ============================================================
  // DESKTOP SIDEBAR
  // ============================================================
  return (
    <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-green-800 text-white min-h-screen flex flex-col shadow-xl flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-blue-700/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 shadow-lg flex-shrink-0">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-white truncate">
              {portalTitle}
            </h2>
            <p className="text-[10px] text-blue-200">CBE Education System</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-3">
          <p className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">
            {menuLabel}
          </p>
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                isPathActive(isActive, item.path)
                  ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-blue-700/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-800/40 backdrop-blur-sm border border-blue-700/30">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-white">
              {user?.name || 'User'}
            </p>
            <p className="text-[9px] text-blue-300">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
            title="Logout"
          >
            <FiLogOut className="w-3.5 h-3.5 text-blue-300 hover:text-red-400" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;