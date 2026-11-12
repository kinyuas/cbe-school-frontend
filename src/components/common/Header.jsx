// src/components/common/Header.jsx
import React from 'react';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';

// ============================================================
// ROLE → DISPLAY LABEL
// ============================================================
const ROLE_LABELS = {
  admin: 'Administrator',
  teacher: 'Teacher',
  bursar: 'Bursar',
  parent: 'Parent / Guardian',
  pupil: 'Pupil',
};

// Roles that get the notification bell
const BELL_ROLES = ['teacher', 'parent', 'pupil'];

const Header = ({ title, subtitle, isMobile, onMenuToggle }) => {
  const { user } = useAuth();

  const roleLabel = ROLE_LABELS[user?.role] || 'User';
  const showBell = !!user && BELL_ROLES.includes(user.role);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
      <div className="flex items-start justify-between px-4 py-3 gap-2">
        {/* Left side */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 mt-0.5"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {/* Long titles wrap instead of being cut off */}
            <h1 className="text-lg font-semibold text-gray-800 whitespace-normal break-words leading-snug">
              {title || 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 whitespace-normal break-words mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* 🔔 Notification bell (teacher / parent / pupil only) */}
          {showBell && <NotificationBell />}

          {/* Desktop user chip — unchanged */}
          {!isMobile && user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md">
                <span className="text-xs font-bold text-white">
                  {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;