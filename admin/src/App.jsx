import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ALogin from './pages/ALogin';
import Dashboard from './pages/MDashboard';
import CollectionSchedule from './pages/CollectionSchedule';
import Layout from './pages/Layout';
import Assignments from './pages/Assignments';
import UsersCollectors from './pages/UserCollector';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Preferences from './pages/Preferences';
import Billing from './pages/Billing';
import BillingHistory from './pages/BillingHistory';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect, useRef } from "react";

const App = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    // Only initialize if not already initialized
    if (window.L && !mapRef.current) {
      mapRef.current = window.L.map('map').setView([51.505, -0.09], 13);
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current);
      window.L.marker([51.5, -0.09]).addTo(mapRef.current)
        .bindPopup('A pretty CSS popup.<br> Easily customizable.')
        .openPopup();
    }
    // Cleanup function to remove the map instance
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

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
            <Route path="assignments" element={<Assignments />} />
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
      <div id="map" style={{ height: "400px", width: "100%" }}></div>
    </Router>
  );
};

export default App;
