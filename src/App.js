// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import Pupils from './components/admin/Pupils';
import Teachers from './components/admin/Teachers';
import Events from './components/admin/Events';
import TransferredLearners from './components/admin/TransferredLearners';
import Exams from './components/admin/Exams';
import ModifyResults from './components/admin/ModifyResults';
import Reports from './components/admin/Reports';
import Alumni from './components/admin/Alumni';
import SchoolSettings from './components/admin/SchoolSettings';
import FeeManagement from './components/admin/FeeManagement'; // NEW
import MyStudents from './components/teacher/MyStudents';
import UpdateResults from './components/teacher/UpdateResults';
import ClassPerformance from './components/teacher/ClassPerformance';
import Announcements from './components/teacher/Announcements';
import PrivateRoute from './components/common/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
         
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute role="admin" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="pupils" element={<Pupils />} />
            <Route path="teachers" element={<Teachers />} />
            <Route path="events" element={<Events />} />
            <Route path="transferred-learners" element={<TransferredLearners />} />
            <Route path="exams" element={<Exams />} />
            <Route path="modify-results" element={<ModifyResults />} />
            <Route path="reports" element={<Reports />} />
            <Route path="alumni" element={<Alumni />} />
            <Route path="fees" element={<FeeManagement />} /> {/* NEW */}
            <Route path="settings" element={<SchoolSettings />} />
          </Route>
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={<PrivateRoute role="teacher" />}>
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="students" element={<MyStudents />} />
            <Route path="results" element={<UpdateResults />} />
            <Route path="performance" element={<ClassPerformance />} />
            <Route path="announcements" element={<Announcements />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;