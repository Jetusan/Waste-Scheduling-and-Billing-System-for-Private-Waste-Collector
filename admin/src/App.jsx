import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ALogin from './pages/ALogin';
import Dashboard from './pages/MDashboard';
import CollectionSchedule from './pages/CollectionSchedule';
import Layout from './pages/Layout';
import UsersCollectors from './pages/UserCollector';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Preferences from './pages/Preferences';
import Billing from './pages/Billing';
import BillingHistory from './pages/BillingHistory';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public route - Login */}
        <Route path="/login" element={<ALogin />} />
        
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Redirect /admin to /admin/dashboard */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Operations Routes */}
          <Route path="operations">
            <Route index element={<Navigate to="schedule" replace />} />
            <Route path="schedule" element={<CollectionSchedule />} />
            <Route path="subscribers" element={<UsersCollectors />} />
          </Route>
          
          {/* Billing Routes */}
          <Route path="billing" element={<Billing />} />
          <Route path="billing-history" element={<BillingHistory />} />
          
          {/* Insights Routes */}
          <Route path="insights">
            <Route index element={<Navigate to="reports" replace />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          {/* Settings Routes */}
          <Route path="settings">
            <Route index element={<Navigate to="notifications" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="preferences" element={<Preferences />} />
          </Route>
          
          {/* Profile */}
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch all unknown routes and redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
