// src/components/bursar/BursarLayout.jsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiPieChart, 
  FiDollarSign, 
  FiFileText, 
  FiLogOut, 
  FiSettings,
  FiUser
} from 'react-icons/fi';

const BursarLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout('manual');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl fixed h-full z-20">
        
        {/* Header / User Info */}
        <div className="p-6 border-b border-gray-800 text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <FiUser className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-bold text-lg">Bursar Portal</h2>
          <p className="text-xs text-gray-400 mt-1 truncate px-2">
            {user?.name || user?.email || 'Finance Officer'}
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLink 
            to="/bursar/dashboard" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            <FiPieChart className="w-5 h-5" /> Dashboard
          </NavLink>

          <NavLink 
            to="/bursar/payments" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            <FiDollarSign className="w-5 h-5" /> Record Payments
          </NavLink>

          <NavLink 
            to="/bursar/class-fees" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            <FiSettings className="w-5 h-5" /> Class Fee Structures
          </NavLink>

          <NavLink 
            to="/bursar/reports" 
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            <FiFileText className="w-5 h-5" /> Financial Reports
          </NavLink>
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout} 
            className="flex items-center justify-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 bg-red-900/20 hover:bg-red-900/40 transition-colors font-medium"
          >
            <FiLogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 min-h-screen bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
      
    </div>
  );
};

export default BursarLayout;