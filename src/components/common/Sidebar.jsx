// src/components/common/Sidebar.jsx
import React from 'react';
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
  FiDollarSign // Add this icon for fees
} from 'react-icons/fi';

const Sidebar = () => {
  const { user, logout } = useAuth();

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
    { path: '/admin/fees', icon: FiDollarSign, label: 'Update Fee' }, // NEW
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

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-green-800 text-white min-h-screen flex flex-col shadow-xl">
      {/* Logo Section */}
      <div className="p-5 border-b border-blue-700/50">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-1.5 shadow-lg">
            <FiAward className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">School Manager</h2>
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
            <item.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-blue-700/50">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-blue-800/40 backdrop-blur-sm border border-blue-700/30">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center shadow-md">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0) || user?.role?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium truncate text-white">{user?.name || 'School Admin'}</p>
            <p className="text-[9px] text-blue-300 capitalize">
              {user?.role === 'admin' ? 'Administrator' : 'Teacher'}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
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