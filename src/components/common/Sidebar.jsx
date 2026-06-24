import React, { useState, useEffect } from 'react';
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
  FiFileText,
  FiEdit3,
  FiUsers as FiAlumni,
  FiSettings,
  FiAward,
  FiDollarSign,
  FiMenu,
  FiX
} from 'react-icons/fi';

// ===== AI Device Detection Hook =====
const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    viewportWidth: 0,
    viewportHeight: 0,
    isTouchDevice: false
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const isDesktop = !isMobile && !isTablet;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      let type = 'desktop';
      if (isMobile) type = 'mobile';
      else if (isTablet) type = 'tablet';
      
      setDeviceInfo({
        type,
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth: width,
        viewportHeight: height,
        isTouchDevice
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const deviceInfo = useDeviceDetection();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (deviceInfo.isMobile) {
      setIsSidebarOpen(false);
    }
  }, [window.location.pathname, deviceInfo.isMobile]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deviceInfo.isMobile && isSidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (sidebar && !sidebar.contains(e.target) && toggleBtn && !toggleBtn.contains(e.target)) {
          setIsSidebarOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [deviceInfo.isMobile, isSidebarOpen]);

  const adminMenu = [
    { path: '/admin/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/admin/pupils', icon: FiUsers, label: 'Students' },
    { path: '/admin/transferred-learners', icon: FiRefreshCw, label: 'Transferred' },
    { path: '/admin/teachers', icon: FiUserCheck, label: 'Teachers' },
    { path: '/admin/exams', icon: FiFileText, label: 'Exams' },
    { path: '/admin/modify-results', icon: FiEdit3, label: 'Modify Results' },
    { path: '/admin/reports', icon: FiBarChart2, label: 'Reports' },
    { path: '/admin/alumni', icon: FiAlumni, label: 'Alumni' },
    { path: '/admin/events', icon: FiCalendar, label: 'Events' },
    { path: '/admin/fees', icon: FiDollarSign, label: 'Fees' },
    { path: '/admin/settings', icon: FiSettings, label: 'Settings' },
  ];

  const teacherMenu = [
    { path: '/teacher/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/teacher/students', icon: FiUsers, label: 'Students' },
    { path: '/teacher/results', icon: FiBookOpen, label: 'Update Results' },
    { path: '/teacher/performance', icon: FiBarChart2, label: 'Performance' },
    { path: '/teacher/announcements', icon: FiBell, label: 'Announcements' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenu : teacherMenu;
  const isMobile = deviceInfo.isMobile;

  // Mobile: Show hamburger menu - NO SIDEBAR, ONLY TOGGLE BUTTON
  if (isMobile) {
    return (
      <>
        {/* Hamburger Menu Button - Positioned top-left */}
        <button
          id="sidebar-toggle"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg text-white shadow-lg hover:shadow-xl transition-all"
        >
          {isSidebarOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>

        {/* Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          id="sidebar"
          className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-blue-900 via-blue-800 to-green-800 text-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo Section */}
          <div className="p-4 border-b border-blue-700/50">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 shadow-lg flex-shrink-0">
                <FiAward className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-white truncate">School Manager</h2>
                <p className="text-[8px] text-blue-200">CBC Education System</p>
              </div>
            </div>
            {/* Close button inside sidebar for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 text-blue-300" />
            </button>
          </div>
          
          {/* Navigation Menu */}
          <nav className="flex-1 py-3 overflow-y-auto h-[calc(100vh-120px)]">
            <div className="px-3 mb-2">
              <p className="text-[8px] text-blue-300 uppercase tracking-wider font-semibold">
                {user?.role === 'admin' ? 'ADMIN MENU' : 'TEACHER MENU'}
              </p>
            </div>
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg transition-all duration-200 ${
                    isActive
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

          {/* User Info & Logout */}
          <div className="p-3 border-t border-blue-700/50">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-800/40 backdrop-blur-sm border border-blue-700/30">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-[10px] font-bold text-white">
                  {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate text-white">{user?.name || 'School Admin'}</p>
                <p className="text-[8px] text-blue-300 capitalize">
                  {user?.role === 'admin' ? 'Admin' : 'Teacher'}
                </p>
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

  // Desktop: Full sidebar
  return (
    <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-green-800 text-white min-h-screen flex flex-col shadow-xl flex-shrink-0">
      {/* Logo Section */}
      <div className="p-5 border-b border-blue-700/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 shadow-lg flex-shrink-0">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-white truncate">School Manager</h2>
            <p className="text-[10px] text-blue-200">CBC Education System</p>
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-3">
          <p className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">
            {user?.role === 'admin' ? 'ADMIN MENU' : 'TEACHER MENU'}
          </p>
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200 ${
                isActive
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

      {/* User Info & Logout */}
      <div className="p-4 border-t border-blue-700/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-800/40 backdrop-blur-sm border border-blue-700/30">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-white">{user?.name || 'School Admin'}</p>
            <p className="text-[9px] text-blue-300 capitalize">
              {user?.role === 'admin' ? 'Administrator' : 'Teacher'}
            </p>
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