// src/components/common/PrivateRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Where each role should land by default
const ROLE_HOME = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  bursar: '/bursar/dashboard',
  parent: '/parent/dashboard',
  pupil: '/pupil/dashboard',
  superadmin: '/sys-admin-dashboard',
};

const PrivateRoute = ({ role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <p className="ml-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role mismatch → bounce to that user's own home, not back to login
  if (role && user.role !== role) {
    const fallback = ROLE_HOME[user.role] || '/login';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;