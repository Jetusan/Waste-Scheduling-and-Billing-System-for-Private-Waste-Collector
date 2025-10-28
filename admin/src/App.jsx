import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Welcome from './pages/Welcome';
import ALogin from './pages/ALogin';
import Dashboard from './pages/MDashboard';
import CollectionSchedule from './pages/CollectionSchedule';
import ModernLayout from './pages/ModernLayout';
import Assignments from './pages/Assignments';
import UsersCollectors from './pages/UserCollector';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import About from './pages/About';
import Billing from './pages/Billing';
import Profile from './pages/Profile';
import SpecialPickup from './pages/SpecialPickup';
import Pricing from './pages/Pricing';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {

  return (
    <Router>
      <Routes>
        {/* Welcome page - Landing */}
        <Route path="/" element={<Welcome />} />
        
        {/* Public route - Login */}
        <Route path="/login" element={<ALogin />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <ModernLayout />
          </ProtectedRoute>
        }>
          {/* Redirect /admin to /admin/home */}
          <Route index element={<Navigate to="/admin/home" replace />} />
          
          {/* Home */}
          <Route path="home" element={<Dashboard />} />
          
          {/* Redirect old dashboard route to home */}
          <Route path="dashboard" element={<Navigate to="/admin/home" replace />} />
          
          {/* Operations Routes */}
          <Route path="operations">
            <Route index element={<Navigate to="schedule" replace />} />
            <Route path="schedule" element={<CollectionSchedule />} />
            <Route path="subscribers" element={<UsersCollectors />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="special-pickup" element={<SpecialPickup />} />
          </Route>
          
          {/* Billing Routes */}
          <Route path="billing" element={<Billing />} />
          
          {/* Pricing Routes */}
          <Route path="pricing" element={<Pricing />} />
          
          {/* Insights Routes */}
          <Route path="insights">
            <Route index element={<Navigate to="reports" replace />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          {/* Settings Routes */}
          <Route path="settings">
            <Route index element={<Navigate to="notifications" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="about" element={<About />} />
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
