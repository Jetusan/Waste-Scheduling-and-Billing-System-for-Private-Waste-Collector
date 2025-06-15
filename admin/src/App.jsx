import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ALogin from './pages/ALogin';
import Dashboard from './pages/MDashboard';
import CollectionSchedule from './pages/CollectionSchedule';
import Layout from './pages/Layout';
import UsersCollectors from './pages/UserCollector';
import Reports from './pages/Reports';
import Partnerships from './pages/Partnerships';
import Notifications from './pages/Notifications';
import PricingRule from './pages/PricingRule';
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ALogin />} />

        {/* Protected Layout-wrapped pages */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/collectionschedule" element={<CollectionSchedule />} />
          <Route path="/usercollector" element={<UsersCollectors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/partnerships" element={<Partnerships />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/pricingRule" element={<PricingRule />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
