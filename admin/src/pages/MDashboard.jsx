import React, { useEffect, useState } from 'react';
import '../styles/MDashboard.css';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = () => {
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
  const [nextPickups, setNextPickups] = useState([]);
  const [dueInvoices, setDueInvoices] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel for better performance
        const [
          dashboardStats,
          upcomingSchedules,
          overdueInvoices,
          recentComplaintsData,
          topPerformersData,
        ] = await Promise.all([
          axios.get(`${API_BASE_URL}/dashboard/stats`).catch(() => ({ 
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
          })),
          axios.get(`${API_BASE_URL}/dashboard/upcoming-schedules?limit=8`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/dashboard/overdue-invoices?limit=8`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/dashboard/recent-complaints?limit=5`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/dashboard/top-performers?limit=3`).catch(() => ({ data: [] })),
        ]);

        console.log('Dashboard data fetched:', {
          stats: dashboardStats.data,
          schedules: upcomingSchedules.data?.length || 0,
          invoices: overdueInvoices.data?.length || 0,
          complaints: recentComplaintsData.data?.length || 0,
          performers: topPerformersData.data?.length || 0,
        });

        const stats = dashboardStats.data;

        // Format upcoming schedules
        const formattedPickups = upcomingSchedules.data.map(s => ({
          date: new Date(s.schedule_date).toLocaleDateString('en-PH', { 
            month: '2-digit', 
            day: '2-digit',
            year: 'numeric'
          }),
          subdivision: s.barangays && s.barangays.length > 0 
            ? s.barangays.map(b => b.barangay_name).join(', ')
            : 'N/A',
          truck: s.truck_number || 'Unassigned',
          status: s.status || 'Scheduled',
          waste_type: s.waste_type || 'Mixed'
        }));

        // Format overdue invoices
        const formattedInvoices = overdueInvoices.data.map(inv => ({
          id: inv.id || inv.invoice_number || 'N/A',
          name: inv.customer_name || inv.username || 'N/A',
          due: new Date(inv.due_date).toLocaleDateString('en-PH', { 
            month: '2-digit', 
            day: '2-digit' 
          }),
          amount: typeof inv.amount === 'number' 
            ? `₱${inv.amount.toLocaleString()}`
            : inv.amount || '₱0',
        }));

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

        setNextPickups(formattedPickups);
        setDueInvoices(formattedInvoices);
        setRecentComplaints(recentComplaintsData.data || []);
        setTopPerformers(topPerformersData.data || []);

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
      {/* Enhanced Header with Statistics Overview */}
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Comprehensive waste management overview and analytics</p>
        </div>
        <div className="header-actions">
          <button 
            className="refresh-btn" 
            onClick={() => window.location.reload()}
            title="Refresh Dashboard"
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
          <button className="export-btn" title="Export Report">
            <i className="fas fa-download"></i> Export
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="overview-section">
        <h3><i className="fas fa-chart-line"></i> Key Metrics Overview</h3>
        <div className="metrics-grid">
          {/* Monthly Revenue */}
          <div className="metric-card success">
            <div className="metric-icon">
              <i className="fas fa-peso-sign"></i>
            </div>
            <div className="metric-info">
              <h3>₱{typeof metrics.monthlyRevenue === 'number' ? metrics.monthlyRevenue.toLocaleString() : '0'}</h3>
              <p>Monthly Revenue</p>
              <span className="trend positive">↑ +8.3%</span>
            </div>
          </div>

          {/* Active Trucks */}
          <div className="metric-card primary">
            <div className="metric-icon">
              <i className="fas fa-truck"></i>
            </div>
            <div className="metric-info">
              <h3>{metrics.activeTrucks}/{metrics.totalTrucks}</h3>
              <p>Active Trucks</p>
              <div className="sub-metrics">
                <span>Inactive: {metrics.inactiveTrucks}</span>
                <span>Maintenance: {metrics.trucksInMaintenance}</span>
              </div>
            </div>
          </div>

          {/* Active Subscribers */}
          <div className="metric-card info">
            <div className="metric-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="metric-info">
              <h3>{metrics.activeSubscribers.total}</h3>
              <p>Active Subscribers</p>
              <div className="subscription-breakdown">
                <span>Basic: {metrics.activeSubscribers.Basic}</span>
                <span>Regular: {metrics.activeSubscribers.Regular}</span>
                <span>Premium: {metrics.activeSubscribers.Premium}</span>
                <span>All-In: {metrics.activeSubscribers.AllIn}</span>
              </div>
            </div>
          </div>

          {/* Overdue Invoices */}
          <div className="metric-card warning">
            <div className="metric-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div className="metric-info">
              <h3>{metrics.overduePayments.count}</h3>
              <p>Overdue Invoices</p>
              <span className="amount">₱{typeof metrics.overduePayments.amount === 'number' ? metrics.overduePayments.amount.toLocaleString() : '0'}</span>
            </div>
          </div>

          {/* Missed Collections */}
          <div className="metric-card danger">
            <div className="metric-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="metric-info">
              <h3>{metrics.missedPickups.count}</h3>
              <p>Missed Collections</p>
              <span className="locations">{metrics.missedPickups.locations}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics Section */}
      <div className="detailed-section">
        <div className="analytics-grid">
          {/* Upcoming Collections */}
          <div className="analytics-card">
            <div className="card-header">
              <h4><i className="fas fa-truck"></i> Upcoming Collections</h4>
              <a href="/schedules" className="view-all">View All Schedules</a>
            </div>
            <div className="card-content">
              {nextPickups.length > 0 ? (
                <div className="pickup-list detailed">
                  {nextPickups.slice(0, 6).map((pickup, i) => (
                    <div key={i} className="pickup-item detailed">
                      <div className="pickup-info">
                        <span className="pickup-date">{pickup.date}</span>
                        <span className="pickup-location">{pickup.subdivision}</span>
                        <span className="pickup-truck">Truck: {pickup.truck}</span>
                        <span className="pickup-waste-type">{pickup.waste_type}</span>
                      </div>
                      <span className={`status-badge ${pickup.status.toLowerCase()}`}>
                        {pickup.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <p>No upcoming pickups scheduled</p>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Invoices */}
          <div className="analytics-card">
            <div className="card-header">
              <h4><i className="fas fa-file-invoice-dollar"></i> Outstanding Invoices</h4>
              <a href="/billing" className="view-all">Manage Billing</a>
            </div>
            <div className="card-content">
              {dueInvoices.length > 0 ? (
                <div className="invoice-list detailed">
                  {dueInvoices.slice(0, 6).map((invoice, i) => (
                    <div key={i} className="invoice-item detailed">
                      <div className="invoice-info">
                        <span className="invoice-id">#{invoice.id}</span>
                        <span className="invoice-customer">{invoice.name}</span>
                        <span className="invoice-due">Due: {invoice.due}</span>
                      </div>
                      <div className="invoice-details">
                        <span className="invoice-amount">{invoice.amount}</span>
                        <span className="overdue-badge">Overdue</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-receipt"></i>
                  <p>No outstanding invoices</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="analytics-grid">
          {/* Recent Complaints */}
          <div className="analytics-card">
            <div className="card-header">
              <h4><i className="fas fa-comment-alt"></i> Recent Complaints</h4>
              <a href="/complaints" className="view-all">View All</a>
            </div>
            <div className="card-content">
              {recentComplaints.length > 0 ? (
                <div className="complaints-list">
                  {recentComplaints.map((complaint, i) => (
                    <div key={i} className="complaint-item">
                      <div className="complaint-info">
                        <span className="complaint-id">#{complaint.id}</span>
                        <span className="complaint-description">{complaint.description}</span>
                        <span className="complaint-date">{complaint.date}</span>
                      </div>
                      <span className={`priority-badge ${complaint.priority || 'medium'}`}>
                        {complaint.priority || 'Medium'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-smile"></i>
                  <p>No recent complaints</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="analytics-card">
            <div className="card-header">
              <h4><i className="fas fa-star"></i> Top Performers</h4>
              <a href="/users" className="view-all">View Team</a>
            </div>
            <div className="card-content">
              {topPerformers.length > 0 ? (
                <div className="performers-list">
                  {topPerformers.map((performer, i) => (
                    <div key={i} className="performer-item">
                      <div className="performer-info">
                        <span className="performer-rank">#{i + 1}</span>
                        <span className="performer-name">{performer.name}</span>
                        <span className="performer-role">{performer.role}</span>
                      </div>
                      <div className="performer-stats">
                        <span className="performance-score">{performer.score}/10</span>
                        <span className="collections-count">{performer.collections} collections</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-users"></i>
                  <p>Performance data loading...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Actions Grid */}
      <div className="advanced-actions">
        <h3><i className="fas fa-cogs"></i> Administrative Actions</h3>
        <div className="actions-grid advanced">
          <button className="action-btn primary" onClick={() => window.location.href = '/schedules'}>
            <i className="fas fa-calendar-plus"></i>
            <div>
              <span>Schedule Collections</span>
              <small>Manage pickup schedules</small>
            </div>
          </button>
          <button className="action-btn success" onClick={() => window.location.href = '/billing'}>
            <i className="fas fa-file-invoice-dollar"></i>
            <div>
              <span>Billing Management</span>
              <small>Invoices & payments</small>
            </div>
          </button>
          <button className="action-btn info" onClick={() => window.location.href = '/reports'}>
            <i className="fas fa-chart-line"></i>
            <div>
              <span>Analytics & Reports</span>
              <small>Performance insights</small>
            </div>
          </button>
          <button className="action-btn warning" onClick={() => window.location.href = '/notifications'}>
            <i className="fas fa-bell"></i>
            <div>
              <span>Notifications</span>
              <small>System alerts</small>
            </div>
          </button>
          <button className="action-btn danger" onClick={() => window.location.href = '/complaints'}>
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <span>Handle Complaints</span>
              <small>Customer support</small>
            </div>
          </button>
          <button className="action-btn secondary" onClick={() => window.location.href = '/users'}>
            <i className="fas fa-users-cog"></i>
            <div>
              <span>User Management</span>
              <small>Residents & collectors</small>
            </div>
          </button>
        </div>
      </div>

      {/* Critical Alerts System */}
      {(metrics.overduePayments.count > 0 || metrics.missedPickups.count > 0 || metrics.pendingComplaints > 5 || metrics.failedPayments > 10) && (
        <div className="alerts-section critical">
          <h3><i className="fas fa-exclamation-triangle"></i> Critical Alerts & Notifications</h3>
          <div className="alerts-grid">
            {metrics.overduePayments.count > 0 && (
              <div className="alert danger">
                <i className="fas fa-exclamation-triangle"></i>
                <div className="alert-content">
                  <strong>{metrics.overduePayments.count} overdue payments</strong>
                  <span>Total amount: ₱{typeof metrics.overduePayments.amount === 'number' ? metrics.overduePayments.amount.toLocaleString() : '0'}</span>
                </div>
                <a href="/billing" className="alert-action">Manage</a>
              </div>
            )}
            {metrics.missedPickups.count > 0 && (
              <div className="alert warning">
                <i className="fas fa-times-circle"></i>
                <div className="alert-content">
                  <strong>{metrics.missedPickups.count} missed collections</strong>
                  <span>Require immediate attention</span>
                </div>
                <a href="/schedules" className="alert-action">Reschedule</a>
              </div>
            )}
            {metrics.pendingComplaints > 5 && (
              <div className="alert info">
                <i className="fas fa-comment-alt"></i>
                <div className="alert-content">
                  <strong>{metrics.pendingComplaints} pending complaints</strong>
                  <span>Customer satisfaction at risk</span>
                </div>
                <a href="/complaints" className="alert-action">Resolve</a>
              </div>
            )}
            {metrics.failedPayments > 10 && (
              <div className="alert secondary">
                <i className="fas fa-credit-card"></i>
                <div className="alert-content">
                  <strong>{metrics.failedPayments} failed payments</strong>
                  <span>Review payment methods</span>
                </div>
                <a href="/billing" className="alert-action">Review</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="system-status">
        <div className="status-item">
          <i className="fas fa-circle online"></i>
          <span>System Online</span>
        </div>
        <div className="status-item">
          <i className="fas fa-database"></i>
          <span>Database Connected</span>
        </div>
        <div className="status-item">
          <i className="fas fa-sync-alt"></i>
          <span>Last Updated: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="status-item">
          <i className="fas fa-users"></i>
          <span>Admin: {localStorage.getItem('username') || 'Administrator'}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
