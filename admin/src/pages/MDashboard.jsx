import React, { useEffect, useState } from 'react';
import '../styles/MDashboard.css';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    missedPickups: { count: 0, locations: '' },
    overduePayments: { count: 0, amount: 0 },
    activeSubscribers: { Basic: 0, Regular: 0, AllIn: 0 },
    failedPayments: 0,
    totalTrucks: 0,
  });
  const [nextPickups, setNextPickups] = useState([]);
  const [dueInvoices, setDueInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch billing stats
        const statsRes = await axios.get(`${API_BASE_URL}/billing/stats`);
        // Fetch all invoices
        const invoicesRes = await axios.get(`${API_BASE_URL}/billing/invoices`);
        console.log('Fetched invoices (full):', invoicesRes.data);
        // Fetch all trucks
        const trucksRes = await axios.get(`${API_BASE_URL}/trucks`);
        // Fetch all customer subscriptions
        const subsRes = await axios.get(`${API_BASE_URL}/billing/subscriptions`);
        // Fetch missed pickups (if available)
        let missedPickups = { count: 0, locations: '' };
        try {
          const missedRes = await axios.get(`${API_BASE_URL}/collection-schedules/missed`);
          missedPickups = {
            count: missedRes.data.length,
            locations: missedRes.data.map(m => m.barangay_name || m.subdivision_name).join(', ')
          };
        } catch (e) {
          // fallback if endpoint not available
        }
        // Next 5 pickups (from collection schedules)
        let pickups = [];
        try {
          const pickupsRes = await axios.get(`${API_BASE_URL}/collection-schedules`);
          pickups = pickupsRes.data
            .sort((a, b) => new Date(a.schedule_date) - new Date(b.schedule_date))
            .slice(0, 5)
            .map(s => ({
              date: new Date(s.schedule_date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit' }),
              subdivision: s.barangay_name || s.subdivision_name || 'N/A',
              truck: s.truck_number || s.truck_id || 'N/A',
              status: s.status || 'Scheduled',
            }));
        } catch (e) {}
        // Next 5 due invoices
        const now = new Date();
        const due = invoicesRes.data
          .filter(inv => {
            const dueDate = new Date(inv.dueDate || inv.due_date);
            return dueDate >= now;
          })
          .sort((a, b) => new Date(a.dueDate || a.due_date) - new Date(b.dueDate || b.due_date))
          .slice(0, 5)
          .map(inv => ({
            id: inv.id || inv.invoice_number,
            name: inv.subscriber || inv.username || 'N/A',
            due: new Date(inv.dueDate || inv.due_date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit' }),
            amount: inv.amount || `₱${parseFloat(inv.amount || 0).toLocaleString()}`,
          }));
        // Overdue payments
        const overdue = invoicesRes.data.filter(inv => {
          const dueDate = new Date(inv.dueDate || inv.due_date);
          return dueDate < now && (inv.status === 'Unpaid' || inv.status === 'Overdue');
        });
        // Failed payments (simulate as count of invoices with status 'Failed' in last 7 days)
        const failedPayments = invoicesRes.data.filter(inv => {
          const genDate = new Date(inv.generatedDate || inv.generated_date);
          return inv.status === 'Failed' && (now - genDate) / (1000 * 60 * 60 * 24) <= 7;
        }).length;
        // Active subscribers by plan
        const activeSubs = { Basic: 0, Regular: 0, AllIn: 0 };
        subsRes.data.forEach(sub => {
          if (sub.status === 'active') {
            if (sub.plan_name === 'Basic') activeSubs.Basic++;
            else if (sub.plan_name === 'Regular') activeSubs.Regular++;
            else if (sub.plan_name === 'AllIn') activeSubs.AllIn++;
          }
        });
        setMetrics({
          totalRevenue: statsRes.data.totalRevenue || 0,
          missedPickups,
          overduePayments: { count: overdue.length, amount: overdue.reduce((sum, i) => sum + (parseFloat(i.amount?.replace(/[^\d.]/g, '') || 0)), 0) },
          activeSubscribers: activeSubs,
          failedPayments,
          totalTrucks: trucksRes.data.length,
        });
        setNextPickups(pickups);
        setDueInvoices(due);
        console.log('Due invoices for dashboard table:', due);
      } catch (err) {
        let errorMsg = 'Failed to load dashboard data.';
        if (err.response) {
          errorMsg += `\nStatus: ${err.response.status} ${err.response.statusText}`;
          if (err.response.data) {
            if (typeof err.response.data === 'object') {
              errorMsg += '\nBackend error: ' + JSON.stringify(err.response.data, null, 2);
            } else {
              errorMsg += '\nBackend error: ' + err.response.data;
            }
          }
        }
        if (err.message) {
          errorMsg += '\nMessage: ' + err.message;
        }
        errorMsg += '\nRaw error: ' + JSON.stringify(err, Object.getOwnPropertyNames(err));
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="main-dashboard"><div>Loading dashboard...</div></div>;
  if (error) return <div className="main-dashboard"><div className="error-message">{error}</div></div>;

  return (
    <div className="main-dashboard">
      {/* ====================
          Metric Cards
          ==================== */}
      <div className="dashboard-cards-wrapper">
        <section className="dashboard-cards">
          <div className="metric-card">
            <div className="icon-circle revenue-icon"><i className="fas fa-dollar-sign"></i></div>
            <div className="metric-content">
              <h3>{typeof metrics.totalRevenue === 'number' ? `₱${metrics.totalRevenue.toLocaleString()}` : metrics.totalRevenue}</h3><p>Total Revenue</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon-circle missed-pickup-icon"><i className="fas fa-calendar-times"></i></div>
            <div className="metric-content">
              <h3>{metrics.missedPickups.count}</h3><p>Missed Pickups</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon-circle overdue-icon"><i className="fas fa-exclamation-triangle"></i></div>
            <div className="metric-content">
              <h3>{metrics.overduePayments.count}</h3><p>Overdue Payments</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon-circle subscribers-icon"><i className="fas fa-users"></i></div>
            <div className="metric-content">
              <h3>
                {metrics.activeSubscribers.Basic +
                 metrics.activeSubscribers.Regular +
                 metrics.activeSubscribers.AllIn}
              </h3>
              <p>
                Active Subs • Basic: {metrics.activeSubscribers.Basic}
                {' • '}Regular: {metrics.activeSubscribers.Regular}<br/>
                {' • '}AllIn: {metrics.activeSubscribers.AllIn}
              </p>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon-circle failed-icon"><i className="fas fa-times-circle"></i></div>
            <div className="metric-content">
              <h3>{metrics.failedPayments}</h3><p>Failed Payments (7d)</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="icon-circle truck-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="metric-content">
              <h3>{metrics.totalTrucks}</h3>
              <p>Active Trucks</p>
            </div>
          </div>
        </section>
      </div>

      {/* ====================
          Quick Actions
          ==================== */}

      {/* ====================
          Scheduling & Billing Glance
          ==================== */}
      <section className="glance-section">
        <div className="table-card">
          <h4>Next 5 Pickups</h4>
          <table>
            <thead>
              <tr><th>Date</th><th>Subdivision</th><th>Truck</th><th>Status</th></tr>
            </thead>
            <tbody>
              {nextPickups.map((r,i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td>{r.subdivision}</td>
                  <td>{r.truck}</td>
                  <td>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-card">
          <h4>Next 5 Due Invoices</h4>
          <table>
            <thead>
              <tr><th>Invoice</th><th>Name</th><th>Due Date</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {dueInvoices.map((r,i) => (
                <tr key={i}>
                  <td>{r.id}</td>
                  <td>{r.name}</td>
                  <td>{r.due}</td>
                  <td>{r.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ====================
          Collections vs. Billing Chart
          ==================== */}
    </div>
  );
};

export default Dashboard;
