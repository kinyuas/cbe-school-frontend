// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './lib/queryClient';
import { AuthProvider } from './context/AuthContext';

// Main Login
import Login from './pages/Login';

// Admin Components
import AdminDashboard from './components/admin/AdminDashboard';
import Pupils from './components/admin/Pupils';
import Teachers from './components/admin/Teachers';
import EventsExams from './components/admin/EventsExams';
import TransferredAlumni from './components/admin/TransferredAlumni';
import ModifyResults from './components/admin/ModifyResults';
import Reports from './components/admin/Reports';
import SchoolSettings from './components/admin/SchoolSettings';

// Teacher Components
import TeacherDashboard from './components/teacher/TeacherDashboard';
import MyStudents from './components/teacher/MyStudents';
import UpdateResults from './components/teacher/UpdateResults';
import ClassPerformance from './components/teacher/ClassPerformance';
import Announcements from './components/teacher/Announcements';

// Teacher Hubs
import ParentHub from './components/teacher/ParentHub';
import PupilHub from './components/teacher/PupilHub';

// Bursar Components
import BursarLayout from './components/bursar/BursarLayout';
import BursarDashboard from './components/bursar/BursarDashboard';
import BursarPayments from './components/bursar/BursarPayments';
import BursarClassFees from './components/bursar/BursarClassFees';
import BursarReports from './components/bursar/BursarReports';

// Super Admin Components
import SuperAdminLogin from './pages/SuperAdmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import ScholarshipsAndEvents from './pages/SuperAdmin/ScholarshipsAndEvents';

// Parent Portal
import ParentDashboard from './pages/parent/ParentDashboard';

// Pupil Portal
import PupilDashboard from './pages/pupil/PupilDashboard';

// Notifications Page
import NotificationsPage from './pages/common/NotificationsPage';

// Route Protection
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  // 🆕 Track online/offline status for the banner
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* 🆕 Offline banner — visible on every screen (login + all portals) */}
        {!online && (
          <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-xs py-1 font-medium shadow-md">
            You are offline — showing last saved data
          </div>
        )}

        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Super Admin Routes */}
            <Route path="/sys-admin-login" element={<SuperAdminLogin />} />
            <Route path="/sys-admin-dashboard" element={<SuperAdminDashboard />} />
            <Route path="/sys-admin/scholarships" element={<ScholarshipsAndEvents />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<PrivateRoute role="admin" />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="pupils" element={<Pupils />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="events-exams" element={<EventsExams />} />
              <Route path="events" element={<Navigate to="/admin/events-exams" replace />} />
              <Route path="exams" element={<Navigate to="/admin/events-exams" replace />} />
              <Route path="transferred-alumni" element={<TransferredAlumni />} />
              <Route path="transferred-learners" element={<Navigate to="/admin/transferred-alumni" replace />} />
              <Route path="alumni" element={<Navigate to="/admin/transferred-alumni?tab=alumni" replace />} />
              <Route path="modify-results" element={<ModifyResults />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<SchoolSettings />} />
            </Route>

            {/* Teacher Routes */}
            <Route path="/teacher" element={<PrivateRoute role="teacher" />}>
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="students" element={<MyStudents />} />
              <Route path="results" element={<UpdateResults />} />
              <Route path="performance" element={<ClassPerformance />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="parent-hub" element={<ParentHub />} />
              <Route path="pupil-hub" element={<PupilHub />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            {/* Bursar Portal */}
            <Route path="/bursar" element={<PrivateRoute role="bursar" />}>
              <Route element={<BursarLayout />}>
                <Route path="dashboard" element={<BursarDashboard />} />
                <Route path="payments" element={<BursarPayments />} />
                <Route path="class-fees" element={<BursarClassFees />} />
                <Route path="reports" element={<BursarReports />} />
                <Route index element={<Navigate to="/bursar/dashboard" replace />} />
              </Route>
            </Route>

            {/* Parent Portal */}
            <Route path="/parent" element={<PrivateRoute role="parent" />}>
              <Route path="dashboard" element={<ParentDashboard />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route index element={<Navigate to="/parent/dashboard" replace />} />
            </Route>

            {/* Pupil Portal */}
            <Route path="/pupil" element={<PrivateRoute role="pupil" />}>
              <Route path="dashboard" element={<PupilDashboard />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route index element={<Navigate to="/pupil/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;