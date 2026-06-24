import React from 'react';
import { FiMenu, FiRefreshCw } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const Header = ({ title, subtitle, isMobile, onMenuToggle, isSidebarOpen }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Hamburger + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={onMenuToggle}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              <FiMenu className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-800 truncate">
              {title || 'Dashboard'}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side - User info and actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* User info - hidden on mobile to save space */}
          {!isMobile && user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md">
                <span className="text-xs font-bold text-white">
                  {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;