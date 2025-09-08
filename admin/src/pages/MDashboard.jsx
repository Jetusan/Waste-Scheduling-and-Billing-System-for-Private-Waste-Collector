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
  
  // New state for schedules and billing
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Parallel API calls for better performance
        const [dashboardStats, upcomingSchedulesRes, overdueInvoicesRes, recentInvoicesRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/dashboard/stats`),
          axios.get(`${API_BASE_URL}/dashboard/upcoming-schedules?limit=5`),
          axios.get(`${API_BASE_URL}/dashboard/overdue-invoices?limit=5`),
          axios.get(`${API_BASE_URL}/billing/invoices?limit=10`)
        ]);

        // Handle dashboard stats
        if (dashboardStats.status === 'fulfilled') {
          const stats = dashboardStats.value.data;
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
        }

        // Handle upcoming schedules
        if (upcomingSchedulesRes.status === 'fulfilled') {
          setUpcomingSchedules(upcomingSchedulesRes.value.data || []);
        }

        // Handle overdue invoices
        if (overdueInvoicesRes.status === 'fulfilled') {
          setOverdueInvoices(overdueInvoicesRes.value.data || []);
        }

        // Handle recent invoices
        if (recentInvoicesRes.status === 'fulfilled') {
          setRecentInvoices(recentInvoicesRes.value.data?.slice(0, 5) || []);
        }

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

      {/* Upcoming Schedules Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3><i className="fas fa-calendar-alt"></i> Upcoming Collections</h3>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/admin/operations/schedule')}
          >
            View All
          </button>
        </div>
        <div className="schedules-grid">
          {upcomingSchedules.length > 0 ? (
            upcomingSchedules.map((schedule, index) => (
              <div key={schedule.schedule_id || index} className="schedule-card">
                <div className="schedule-date">
                  <div className="date-day">
                    {schedule.next_occurrence ? 
                      new Date(schedule.next_occurrence).getDate() : 
                      new Date().getDate()}
                  </div>
                  <div className="date-month">
                    {schedule.next_occurrence ? 
                      new Date(schedule.next_occurrence).toLocaleDateString('en-US', { month: 'short' }) : 
                      new Date().toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </div>
                <div className="schedule-details">
                  <h4>{schedule.waste_type || 'General Collection'}</h4>
                  <p className="schedule-time">
                    <i className="fas fa-clock"></i> {schedule.time_range || 'All Day'}
                  </p>
                  <p className="schedule-day">
                    <i className="fas fa-calendar"></i> Every {schedule.day_of_week || schedule.schedule_date}
                  </p>
                  <p className="schedule-locations">
                    <i className="fas fa-map-marker-alt"></i> 
                    {schedule.barangays?.map(b => b.barangay_name).join(', ') || 'Multiple Areas'}
                  </p>
                  <p className="schedule-truck">
                    <i className="fas fa-truck"></i> Truck {schedule.truck_number || 'TBD'}
                  </p>
                </div>
                <div className={`schedule-status ${schedule.status?.toLowerCase() || 'scheduled'}`}>
                  {schedule.status || 'Scheduled'}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <i className="fas fa-calendar-check"></i>
              <p>No upcoming collections scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing & Invoices Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3><i className="fas fa-file-invoice-dollar"></i> Billing Overview</h3>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/admin/billing')}
          >
            View All
          </button>
        </div>
        
        {/* Billing Summary Cards */}
        <div className="billing-summary">
          <div className="billing-card revenue">
            <div className="billing-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="billing-content">
              <h4>₱{typeof metrics.monthlyRevenue === 'number' ? metrics.monthlyRevenue.toLocaleString() : '0'}</h4>
              <p>Monthly Revenue</p>
              <span className="billing-trend positive">+12% from last month</span>
            </div>
          </div>
          
          <div className="billing-card overdue">
            <div className="billing-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="billing-content">
              <h4>{metrics.overduePayments.count}</h4>
              <p>Overdue Invoices</p>
              <span className="billing-amount">₱{typeof metrics.overduePayments.amount === 'number' ? metrics.overduePayments.amount.toLocaleString() : '0'}</span>
            </div>
          </div>
          
          <div className="billing-card payments">
            <div className="billing-icon">
              <i className="fas fa-credit-card"></i>
            </div>
            <div className="billing-content">
              <h4>{metrics.successfulPayments}</h4>
              <p>Recent Payments</p>
              <span className="billing-trend neutral">{metrics.failedPayments} failed</span>
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="recent-invoices">
          <h4>Recent Invoices</h4>
          <div className="invoices-list">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((invoice, index) => (
                <div key={invoice.id || index} className="invoice-item">
                  <div className="invoice-info">
                    <span className="invoice-id">#{invoice.id || invoice.invoice_id}</span>
                    <span className="invoice-customer">{invoice.subscriber || invoice.username}</span>
                    <span className="invoice-plan">{invoice.plan || invoice.invoice_type}</span>
                  </div>
                  <div className="invoice-amount">
                    ₱{typeof invoice.amount === 'number' ? invoice.amount.toLocaleString() : 
                       (typeof invoice.amount === 'string' ? invoice.amount.replace('₱', '').replace(',', '') : '0')}
                  </div>
                  <div className={`invoice-status ${invoice.status?.toLowerCase() || 'unpaid'}`}>
                    {invoice.status || 'Unpaid'}
                  </div>
                  <div className="invoice-due">
                    Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 
                          invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-file-invoice"></i>
                <p>No recent invoices</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Alerts - Enhanced */}
      {(metrics.overduePayments.count > 0 || metrics.missedPickups.count > 0 || overdueInvoices.length > 0) && (
        <div className="simple-alerts">
          <h3><i className="fas fa-exclamation-triangle"></i> Critical Alerts</h3>
          <div className="alerts-list">
            {metrics.overduePayments.count > 0 && (
              <div className="simple-alert warning">
                <i className="fas fa-clock"></i>
                <span>{metrics.overduePayments.count} overdue payments (₱{metrics.overduePayments.amount.toLocaleString()})</span>
                <button onClick={() => navigate('/admin/billing')} className="alert-link">View</button>
              </div>
            )}
            {metrics.missedPickups.count > 0 && (
              <div className="simple-alert danger">
                <i className="fas fa-times-circle"></i>
                <span>{metrics.missedPickups.count} missed collections</span>
                <button onClick={() => navigate('/admin/operations/schedule')} className="alert-link">View</button>
              </div>
            )}
            {overdueInvoices.length > 0 && (
              <div className="simple-alert urgent">
                <i className="fas fa-file-invoice"></i>
                <span>{overdueInvoices.length} urgent invoices require attention</span>
                <button onClick={() => navigate('/admin/billing')} className="alert-link">Review</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
