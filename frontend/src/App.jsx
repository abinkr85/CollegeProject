import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Spinner from './components/ui/Spinner.jsx';
import { PORTAL_HOME_PATH, PORTAL_ROLE } from './portalConfig.js';
import AdminLayout from './layouts/AdminLayout.jsx';

import Login from './pages/Login.jsx';
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));

// Student Pages
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const SubmitComplaint = lazy(() => import('./pages/student/SubmitComplaint.jsx'));
const ComplaintHistory = lazy(() => import('./pages/student/ComplaintHistory.jsx'));
const StudentSettings = lazy(() => import('./pages/student/StudentSettings.jsx'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const ComplaintManagement = lazy(() => import('./pages/admin/ComplaintManagement.jsx'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement.jsx'));
const Analytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));

export default function App() {
  const isAdminPortal = PORTAL_ROLE === 'admin';

  return (
    <Router>
      <Suspense fallback={<Spinner fullPage />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          {isAdminPortal ? (
            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="complaints" element={<ComplaintManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          ) : (
            <>
              <Route path="/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/submit" element={<ProtectedRoute role="student"><SubmitComplaint /></ProtectedRoute>} />
              <Route path="/history" element={<ProtectedRoute role="student"><ComplaintHistory /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute role="student"><StudentSettings /></ProtectedRoute>} />
            </>
          )}

          <Route path="/" element={<Navigate to={PORTAL_HOME_PATH} replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
