import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MDashboard.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    todayRevenue: 0,
    missedPickups: { count: 0, locations: '' },
    todayPickups: { total: 0, completed: 0, pending: 0, cancelled: 0 },
    weekPickups: { total: 0, completed: 0 },
    monthPickups: { total: 0, completed: 0 },
    overduePayments: { count: 0, amount: 0 },
    activeSubscribers: { Basic: 0, Regular: 0, Premium: 0, AllIn: 0, total: 0 },
    inactiveSubscribers: 0,
    failedPayments: 0,
    successfulPayments: 0,
    totalTrucks: 0,
    activeTrucks: 0,
    inactiveTrucks: 0,
    trucksInMaintenance: 0,
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    totalResidents: 0,
    newResidents: 0,
    collectionEfficiency: 0,
    routeEfficiency: 0,
    driverPerformance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch only essential dashboard stats
        const dashboardStats = await axios.get(`${API_BASE_URL}/dashboard/stats`).catch(() => ({ 
          data: { 
            revenue: { total: 0, monthly: 0, yearly: 0, today: 0 },
            subscribers: { Basic: 0, Regular: 0, Premium: 0, AllIn: 0, total: 0, inactive: 0 },
            collections: { 
              efficiency: 0, 
              route_efficiency: 0,
              today: { total: 0, completed: 0, pending: 0, cancelled: 0 },
              week: { total: 0, completed: 0 },
              month: { total: 0, completed: 0 },
              missed: 0 
            },
            payments: { 
              overdue: { count: 0, amount: 0 }, 
              failed_7d: 0,
              successful_7d: 0
            },
            fleet: { total: 0, active: 0, inactive: 0, maintenance: 0 },
            residents: { total: 0, new_30d: 0 },
            complaints: { total: 0, pending: 0, resolved: 0 },
            performance: { driver_avg: 0 }
          } 
        }));

        console.log('Dashboard stats fetched:', dashboardStats.data);

        const stats = dashboardStats.data;

        setMetrics({
          totalRevenue: stats.revenue?.total || 0,
          monthlyRevenue: stats.revenue?.monthly || 0,
          yearlyRevenue: stats.revenue?.yearly || 0,
          todayRevenue: stats.revenue?.today || 0,
          missedPickups: {
            count: stats.collections?.missed || 0,
            locations: 'Various locations'
          },
          todayPickups: {
            total: stats.collections?.today?.total || 0,
            completed: stats.collections?.today?.completed || 0,
            pending: stats.collections?.today?.pending || 0,
            cancelled: stats.collections?.today?.cancelled || 0
          },
          weekPickups: {
            total: stats.collections?.week?.total || 0,
            completed: stats.collections?.week?.completed || 0
          },
          monthPickups: {
            total: stats.collections?.month?.total || 0,
            completed: stats.collections?.month?.completed || 0
          },
          overduePayments: { 
            count: stats.payments?.overdue?.count || 0, 
            amount: stats.payments?.overdue?.amount || 0
          },
          activeSubscribers: {
            Basic: stats.subscribers?.Basic || 0,
            Regular: stats.subscribers?.Regular || 0,
            Premium: stats.subscribers?.Premium || 0,
            AllIn: stats.subscribers?.AllIn || 0,
            total: stats.subscribers?.total || 0
          },
          inactiveSubscribers: stats.subscribers?.inactive || 0,
          failedPayments: stats.payments?.failed_7d || 0,
          successfulPayments: stats.payments?.successful_7d || 0,
          totalTrucks: stats.fleet?.total || 0,
          activeTrucks: stats.fleet?.active || 0,
          inactiveTrucks: stats.fleet?.inactive || 0,
          trucksInMaintenance: stats.fleet?.maintenance || 0,
          totalComplaints: stats.complaints?.total || 0,
          pendingComplaints: stats.complaints?.pending || 0,
          resolvedComplaints: stats.complaints?.resolved || 0,
          totalResidents: stats.residents?.total || 0,
          newResidents: stats.residents?.new_30d || 0,
          collectionEfficiency: stats.collections?.efficiency || 0,
          routeEfficiency: stats.collections?.route_efficiency || 0,
          driverPerformance: stats.performance?.driver_avg || 0,
        });

      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        let errorMsg = 'Failed to load dashboard data.';
        if (err.response?.status) {
          errorMsg += ` Status: ${err.response.status}`;
        }
        if (err.message) {
          errorMsg += ` ${err.message}`;
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="main-dashboard"><div>Loading dashboard...</div></div>;
  if (error) return <div className="main-dashboard"><div className="error-message">{error}</div></div>;

  return (
    <div className="main-dashboard">
      {/* Simplified Header */}
      <div className="dashboard-header">
        <div>
          <h3>Waste management overview</h3>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn" 
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
      </div>

      {/* Simplified Key Metrics */}
      <div className="overview-section">
        <h3><i className="fas fa-tachometer-alt"></i> Dashboard Overview</h3>
        <div className="simple-metrics-grid">
          {/* Revenue */}
          <div className="simple-metric-card success">
            <div className="metric-icon">
              <i className="fas fa-peso-sign"></i>
            </div>
            <div className="metric-content">
              <h3>₱{typeof metrics.monthlyRevenue === 'number' ? metrics.monthlyRevenue.toLocaleString() : '0'}</h3>
              <p>Monthly Revenue</p>
            </div>
          </div>

          {/* Total Subscribers */}
          <div className="simple-metric-card info">
            <div className="metric-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="metric-content">
              <h3>{metrics.activeSubscribers.total}</h3>
              <p>Subscriber</p>
            </div>
          </div>

          {/* Fleet Status */}
          <div className="simple-metric-card primary">
            <div className="metric-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="metric-content">
              <h3>{metrics.totalTrucks}</h3>
              <p>Trucks</p>
            </div>
          </div>

          {/* Invoices */}
          <div className="simple-metric-card warning">
            <div className="metric-icon">
              <i className="fas fa-file-invoice-dollar"></i>
            </div>
            <div className="metric-content">
              <h3>{metrics.overduePayments.count}</h3>
              <p>Overdue Invoices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="today-summary">
        <h3><i className="fas fa-calendar-day"></i> Today's Overview</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Collections Scheduled</span>
            <span className="summary-value">{metrics.todayPickups.total}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Completed</span>
            <span className="summary-value success">{metrics.todayPickups.completed}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Pending</span>
            <span className="summary-value warning">{metrics.todayPickups.pending}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Revenue Today</span>
            <span className="summary-value">₱{typeof metrics.todayRevenue === 'number' ? metrics.todayRevenue.toLocaleString() : '0'}</span>
          </div>
        </div>
      </div>

      {/* Simplified Quick Actions */}
      <div className="quick-actions-section">
        <h3><i className="fas fa-bolt"></i> Quick Actions</h3>
        <div className="simple-actions-grid">
          <button className="simple-action-btn" onClick={() => navigate('/admin/operations/schedule')}>
            <i className="fas fa-calendar-alt"></i>
            <span>Schedules</span>
          </button>
          <button className="simple-action-btn" onClick={() => navigate('/admin/billing')}>
            <i className="fas fa-file-invoice"></i>
            <span>Billing</span>
          </button>
          <button className="simple-action-btn" onClick={() => navigate('/admin/insights/reports')}>
            <i className="fas fa-chart-bar"></i>
            <span>Reports</span>
          </button>
          <button className="simple-action-btn" onClick={() => navigate('/admin/operations/subscribers')}>
            <i className="fas fa-users"></i>
            <span>Users</span>
          </button>
        </div>
      </div>

      {/* Critical Alerts - Simplified */}
      {(metrics.overduePayments.count > 0 || metrics.missedPickups.count > 0) && (
        <div className="simple-alerts">
          <h3><i className="fas fa-exclamation-triangle"></i> Alerts</h3>
          <div className="alerts-list">
            {metrics.overduePayments.count > 0 && (
              <div className="simple-alert warning">
                <i className="fas fa-clock"></i>
                <span>{metrics.overduePayments.count} overdue payments</span>
                <a href="/billing" className="alert-link">View</a>
              </div>
            )}
            {metrics.missedPickups.count > 0 && (
              <div className="simple-alert danger">
                <i className="fas fa-times-circle"></i>
                <span>{metrics.missedPickups.count} missed collections</span>
                <a href="/schedules" className="alert-link">View</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
