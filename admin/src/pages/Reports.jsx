import React, { useState, useEffect } from 'react';
import '../styles/Reports.css';
import axios from 'axios';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = 'http://localhost:5000/api';

const Reports = () => {
  const [showModal, setShowModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [scheduleForm, setScheduleForm] = useState({
    frequency: 'weekly',
    day: 'monday',
    time: '09:00',
    recipients: '',
    format: 'pdf'
  });

  // Enhanced report form with more specific options
  const [reportForm, setReportForm] = useState({
    type: 'waste-collection',
    period: 'weekly',
    startDate: '',
    endDate: '',
    generatedBy: 'Admin User',
    format: 'pdf',
    schedule: null,
    // New specific filters
    barangay: '',
    collector: '',
    truck: '',
    status: 'all',
    includeCharts: true,
    includeDetails: true,
    // Additional filters for new report types
    customerType: '',
    billingCycle: '',
    complaintType: '',
    feedbackStatus: '',
    priority: '',
    missedReason: ''
  });

  // Additional state for dropdowns
  const [barangays, setBarangays] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [trucks, setTrucks] = useState([]);


  const [shareForm, setShareForm] = useState({
    emails: '',
    message: '',
    format: 'pdf'
  });

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewReport, setViewReport] = useState(null);
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const weekdaysList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Add new state for report focus, waste type, scheduling, and selected report output
  // Map reportFocus to backend type
  const [reportFocus, setReportFocus] = useState('waste-collection');
  // Map frontend reportFocus to backend type
  const reportFocusToType = {
    'waste-collection': 'waste-collection',
    'billing': 'financial-summary',
    'customer-feedback': 'customer-feedback',
    'user-activity': 'user-activity',
    'notifications': 'notifications',
  };
  const [wasteType, setWasteType] = useState('');
  const [scheduleReport, setScheduleReport] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [selectedReportOutput, setSelectedReportOutput] = useState(null);

  // Add new state for invoice status and plan type
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [planType, setPlanType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setReportForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission for report generation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      // Prepare the request data
      const requestData = {
        type: reportFocusToType[reportFocus] || reportFocus,
        period: reportForm.period,
        generated_by: reportForm.generatedBy,
        format: reportForm.format,
        start_date: reportForm.startDate,
        end_date: reportForm.endDate,
        filters: {
          barangay: reportForm.barangay,
          subdivision: reportForm.subdivision,
          collector: reportForm.collector,
          truck: reportForm.truck,
          status: reportForm.status,
          wasteType: wasteType,
          customerType: reportForm.customerType,
          billingCycle: reportForm.billingCycle,
          complaintType: reportForm.complaintType,
          feedbackStatus: reportForm.feedbackStatus,
          priority: reportForm.priority,
          missedReason: reportForm.missedReason
        }
      };

      console.log('Generating report with data:', requestData);

      // Call the backend API to generate the report
      const response = await axios.post(`${API_URL}/reports/generate`, requestData);
      
      console.log('Report generation response:', response.data);

      // Close the modal and refresh the reports list
      setShowModal(false);
      
      // Reset form
      setReportForm({
        type: 'waste-collection',
        period: 'weekly',
        startDate: '',
        endDate: '',
        generatedBy: 'Admin User',
        format: 'pdf',
        schedule: null,
        barangay: '',
        collector: '',
        truck: '',
        status: 'all',
        includeCharts: true,
        includeDetails: true,
        customerType: '',
        billingCycle: '',
        complaintType: '',
        feedbackStatus: '',
        priority: '',
        missedReason: ''
      });
      setReportFocus('waste-collection');
      setWasteType('');

      // Refresh the reports list
      const { data } = await axios.get(`${API_URL}/reports`);
      setReports(data);

      alert('Report generated successfully!');
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_URL}/reports`);
        setReports(data);
      } catch (err) {
        setError('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  useEffect(() => {
    if (showModal) {
      const fetchDropdownData = async () => {
        try {
          // Fetch barangays
          const barangaysRes = await axios.get(`${API_URL}/barangays`);
          setBarangays(barangaysRes.data);

          // Fetch collectors
          const collectorsRes = await axios.get(`${API_URL}/collectors`);
          setCollectors(collectorsRes.data);

          // Fetch trucks
          const trucksRes = await axios.get(`${API_URL}/trucks`);
          setTrucks(trucksRes.data);
        } catch (err) {
          console.error('Error fetching dropdown data:', err);
        }
      };
      fetchDropdownData();
    }
  }, [showModal]);


  // Quick KPI calculations
  const stats = {
    total: reports.length,
    completed: reports.filter(r => r.status.toLowerCase().includes('completed')).length,
    pending: reports.filter(r => r.status.toLowerCase().includes('pending')).length,
    draft: reports.filter(r => r.status.toLowerCase().includes('draft')).length
  };


  // When reportFocus changes, update reportForm.type accordingly
  useEffect(() => {
    setReportForm(prev => ({
      ...prev,
      type: reportFocusToType[reportFocus] || 'waste-collection',
    }));
  }, [reportFocus]);

  const handleScheduleFormChange = e => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleShareFormChange = e => {
    const { name, value } = e.target;
    setShareForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleGenerateReport = async () => {
    setLoading(true);
  
    try {
      const payload = {
        type: reportForm.type,
        period: reportForm.period,
        generated_by: reportForm.generatedBy,
        status: 'Generating',
        schedule: null,
        format: reportForm.format,
        recipients: '',
        message: '',
        start_date: reportForm.startDate,
        end_date: reportForm.endDate,
      };
  
      console.log('Generating report with payload:', payload);
  
      const response = await axios.post(`${API_URL}/reports/generate`, payload);
  
      if (response.data.status === 'Completed') {
        alert('Report generated successfully! You can now download it.');
      }
  
      setShowModal(false);
  
      // Refresh reports
      setError(null);
      const { data } = await axios.get(`${API_URL}/reports`);
      setReports(data);
  
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report: ' + (err.response?.data?.error || err.message));
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };
  
  const handleScheduleSubmit = e => {
    e.preventDefault();
    const schedule = `${scheduleForm.frequency} - ${scheduleForm.day} ${scheduleForm.time}`;
    if (selectedReport) {
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id ? { ...r, schedule } : r
      ));
    }
    setShowScheduleModal(false);
  };

  const handleShareSubmit = e => {
    e.preventDefault();
    // Here you would implement the actual sharing logic
    alert(`Report shared with: ${shareForm.emails}`);
    setShowShareModal(false);
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await axios.delete(`${API_URL}/reports/${id}`);
      // Refresh reports
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(`${API_URL}/reports`);
        setReports(data);
      } catch (err) {
        setError('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    } catch (err) {
      alert('Failed to delete report');
    }
  };

  const handleView = report => {
    setViewReport(report);
    setShowViewModal(true);
  };

  const handleExport = async (format, report) => {
    try {
      if (report.status !== 'Completed') {
        alert('Report is not ready for download. Status: ' + report.status);
        return;
      }
      
      // Download the report data
      const response = await axios.get(`${API_URL}/reports/${report.report_id}/download`);
      const reportData = response.data;
      
      if (format === 'pdf') {
        // Render the report data as a table in a new window for better appearance
        const newWindow = window.open('', '_blank');

        // Recursive function to render any value as HTML
        function renderValue(val) {
          if (Array.isArray(val)) {
            if (val.length === 0) return '<em>None</em>';
            let arr = val;
            // If array of objects and has a date/timestamp, sort chronologically (oldest to newest)
            if (typeof arr[0] === 'object' && arr[0] !== null) {
              const dateKeys = ['date', 'created_at', 'collected_at', 'generated_date', 'timestamp', 'time'];
              const sortKey = dateKeys.find(k => k in arr[0]);
              if (sortKey) {
                arr = [...arr].sort((a, b) => new Date(a[sortKey]) - new Date(b[sortKey]));
              }
              const headers = Object.keys(arr[0]);
              let html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">';
              html += '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
              html += '<tbody>' + arr.map(row => '<tr>' + headers.map(h => `<td>${renderValue(row[h])}</td>`).join('') + '</tr>').join('') + '</tbody>';
              html += '</table>';
              return html;
            } else {
              // Array of primitives
              return arr.map(v => renderValue(v)).join(', ');
            }
          } else if (val && typeof val === 'object') {
            // Object: render as key-value table
            const entries = Object.entries(val);
            let html = '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:auto">';
            html += '<tbody>' + entries.map(([k, v]) => `<tr><th>${k}</th><td>${renderValue(v)}</td></tr>`).join('') + '</tbody>';
            html += '</table>';
            return html;
          } else if (val === null || val === undefined) {
            return '&ndash;';
          } else {
            // Always show the value as string, including 'missed' status
            return String(val);
          }
        }

        let tableHtml = '';
        if (reportData.data && typeof reportData.data === 'object') {
          tableHtml = renderValue(reportData.data);
        } else if (Array.isArray(reportData.data)) {
          tableHtml = renderValue(reportData.data);
        } else {
          tableHtml = `<pre>${JSON.stringify(reportData.data, null, 2)}</pre>`;
        }

        newWindow.document.write(`
          <html>
            <head><title>${reportData.type} Report</title></head>
            <body>
              <h1>${reportData.type} Report</h1>
              <p><strong>Generated by:</strong> ${reportData.generated_by}</p>
              <p><strong>Date:</strong> ${reportData.date}</p>
              <p><strong>Period:</strong> ${reportData.period}</p>
              <hr>
              ${tableHtml}
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // For Excel/CSV, create a downloadable file
        const dataStr = JSON.stringify(reportData.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'text/plain' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportData.type}_report_${reportData.report_id}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('Failed to download report: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <>
      {/* === KPI SUMMARY CARDS === */}
      <section className="report-stats-grid">
        <div className="stat-card">
          <h4>Total Reports</h4><p>{stats.total}</p>
        </div>
        <div className="stat-card">
          <h4>Completed</h4><p>{stats.completed}</p>
        </div>
        <div className="stat-card">
          <h4>Pending</h4><p>{stats.pending}</p>
        </div>
        <div className="stat-card">
          <h4>Drafts</h4><p>{stats.draft}</p>
        </div>
      </section>



      {/* === FILTERS & GENERATE BUTTON === */}
      <section className="reports-content">
        <div className="reports-header">
          <div className="report-actions">
            <button className="generate-btn" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus"></i> New Report
            </button>
            <input type="text" placeholder="Search…" />
            <select><option>All Types</option><option>Waste Collection</option><option>User Activity</option></select>
            <select><option>All Status</option><option>Completed</option><option>Pending</option><option>Draft</option></select>
          </div>
        </div>

        {/* === RESPONSIVE TABLE WRAPPER === */}
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Period</th>
                <th>By</th>
                <th>Date</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center">Loading reports...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="text-center text-danger">{error}</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center">No reports found.</td>
                </tr>
              ) : (
                reports.map(r => (
                  <tr key={r.report_id || r.id}>
                    <td>{r.report_id || r.id}</td>
                    <td>{r.type}</td>
                    <td>{r.period}</td>
                    <td>{r.generated_by || r.generatedBy}</td>
                    <td>{r.date}</td>
                    <td>{r.schedule}</td>
                    <td>
                      <span className={`status-badge ${r.status?.toLowerCase().replace(' ', '-')}`}>{r.status}</span>
                    </td>
                    <td className="actions-cell">
                      <button className="action-btn" onClick={() => handleView(r)}>
                        <i className="fas fa-eye"></i>
                      </button>
                      <button 
                        className="action-btn" 
                        onClick={() => handleExport('pdf', r)} 
                        disabled={r.status !== 'Completed'} 
                        title={r.status === 'Completed' ? 'Download PDF' : `Status: ${r.status}`}
                      >
                        <i className="fas fa-download"></i>
                      </button>
                      <button className="action-btn" onClick={() => { setSelectedReport(r); setShowShareModal(true); }}>
                        <i className="fas fa-share-alt"></i>
                      </button>
                      <button className="action-btn" onClick={() => handleDelete(r.report_id || r.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* === PAGINATION INFO === */}
        <div className="pagination">
          <span>Showing 1 to {reports.length} of {reports.length}</span>
          <div className="pagination-controls">
            <button disabled>‹ Prev</button>
            <button className="active">1</button>
            <button>Next ›</button>
          </div>
        </div>
      </section>

      {/* === ENHANCED NEW REPORT MODAL === */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content enhanced-modal">
            <form className="generate-report-form" onSubmit={handleSubmit}>
              <h3>Generate New Report</h3>
              <div className="form-section">
                <h4>Report Scope</h4>
                <label>Report Focus</label>
                <select value={reportFocus} onChange={e => setReportFocus(e.target.value)}>
                  <option value="waste-collection">Waste Collection</option>
                  <option value="billing">Billing/Financial Summary</option>
                  <option value="customer-feedback">Customer Feedback/Complaints</option>
                  <option value="user-activity">User Activity</option>
                  <option value="notifications">Notifications/Communication</option>
                </select>
                <div className="form-group">
              </div>
                {reportFocus === 'waste-collection' && (
                  <>
                    {/* Date Range Filter */}
                    <div className="form-group">
                      <label>Collection Date Range</label>
                      <div className="date-range-inputs">
                        <input
                          type="date"
                          name="startDate"
                          value={reportForm.startDate}
                          onChange={handleFormChange}
                          placeholder="Start date"
                        />
                        <span>to</span>
                        <input
                          type="date"
                          name="endDate"
                          value={reportForm.endDate}
                          onChange={handleFormChange}
                          placeholder="End date"
                        />
                      </div>
                    </div>

                    {/* Weekday Filter */}
                    <div className="form-group">
                      <label>Scheduled Weekdays</label>
                      <div className="weekday-filters">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                          <label key={day} className="weekday-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedWeekdays.includes(day)}
                              onChange={() => setSelectedWeekdays(prev => 
                                prev.includes(day) 
                                  ? prev.filter(d => d !== day) 
                                  : [...prev, day]
                              )}
                            />
                            <span>{day.substring(0, 3)}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Area/Barangay Filter */}
                    <div className="form-group">
                      <label>Area/Barangay</label>
                      <select 
                        name="barangay" 
                        value={reportForm.barangay} 
                        onChange={handleFormChange}
                        className="form-select"
                      >
                        <option value="">All Barangays</option>
                        {barangays.map(barangay => (
                          <option key={barangay.barangay_id} value={barangay.barangay_id}>
                            {barangay.barangay_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Waste Type Filter */}
                    <div className="form-group">
                      <label>Waste Type</label>
                      <select 
                        value={wasteType} 
                        onChange={e => setWasteType(e.target.value)}
                        className="form-select"
                      >
                        <option value="">All Types</option>
                        <option value="residual">Residual</option>
                        <option value="biodegradable">Biodegradable</option>
                        <option value="bottle">Bottle</option>
                        <option value="binakbak">Binakbak</option>
                      </select>
                    </div>

                    {/* Collection Status Filter */}
                    <div className="form-group">
                      <label>Collection Status</label>
                      <select 
                        name="status" 
                        value={reportForm.status} 
                        onChange={handleFormChange}
                        className="form-select"
                      >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>

                    {/* Collector/Team Filter */}
                    <div className="form-group">
                      <label>Collector/Team</label>
                      <select 
                        name="collector" 
                        value={reportForm.collector} 
                        onChange={handleFormChange}
                        className="form-select"
                      >
                        <option value="">All Collectors</option>
                        {collectors.map(collector => (
                          <option key={collector.collector_id} value={collector.collector_id}>
                            {collector.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Truck/Route Filter */}
                    <div className="form-group">
                      <label>Truck/Route</label>
                      <select 
                        name="truck" 
                        value={reportForm.truck} 
                        onChange={handleFormChange}
                        className="form-select"
                      >
                        <option value="">All Trucks</option>
                        {trucks.map(truck => (
                          <option key={truck.truck_id} value={truck.truck_id}>
                            {truck.truck_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Missed Reason Filter */}
                    {reportForm.status === 'missed' && (
                      <div className="form-group">
                        <label>Reason for Missed Pickup</label>
                        <select 
                          name="missedReason" 
                          value={reportForm.missedReason} 
                          onChange={handleFormChange}
                          className="form-select"
                        >
                          <option value="">All Reasons</option>
                          <option value="customer-not-home">Customer Not Home</option>
                          <option value="road-blocked">Road Blocked</option>
                          <option value="vehicle-breakdown">Vehicle Breakdown</option>
                          <option value="weather">Weather Conditions</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
                {reportFocus === 'special-pickup' && (
                  <>
                    <label>Area/Barangay</label>
                    <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                      <option value="">All Barangays</option>
                      {barangays.map(barangay => (
                        <option key={barangay.barangay_id} value={barangay.barangay_id}>{barangay.barangay_name}</option>
                      ))}
                    </select>
                    <label>Status</label>
                    <select name="status" value={reportForm.status} onChange={handleFormChange}>
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </>
                )}
                {reportFocus === 'user-activity' && (
                  <>
                    <label>User</label>
                    <select name="user" value={reportForm.user || ''} onChange={handleFormChange}>
                      <option value="">All Users</option>
                      {/* You may want to fetch and map users here */}
                    </select>
                    <label>Role</label>
                    <select name="role" value={reportForm.role || ''} onChange={handleFormChange}>
                      <option value="">All Roles</option>
                      {/* You may want to fetch and map roles here */}
                    </select>
                    <label>Activity Type</label>
                    <select name="activityType" value={reportForm.activityType || ''} onChange={handleFormChange}>
                      <option value="">All Types</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="other">Other</option>
                    </select>
                  </>
                )}
                {reportFocus === 'notifications' && (
                  <>
                    <label>Notification Type</label>
                    <select name="notificationType" value={reportForm.notificationType || ''} onChange={handleFormChange}>
                      <option value="">All Types</option>
                      <option value="reminder">Reminder</option>
                      <option value="announcement">Announcement</option>
                      <option value="alert">Alert</option>
                    </select>
                    <label>Status</label>
                    <select name="notificationStatus" value={reportForm.notificationStatus || ''} onChange={handleFormChange}>
                      <option value="">All Status</option>
                      <option value="sent">Sent</option>
                      <option value="delivered">Delivered</option>
                      <option value="read">Read</option>
                    </select>
                  </>
                )}
                {reportFocus === 'billing' && (
                  <>
                    <label>Area/Barangay</label>
                    <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                      <option value="">All Barangays</option>
                      {barangays.map(barangay => (
                        <option key={barangay.barangay_id} value={barangay.barangay_id}>{barangay.barangay_name}</option>
                      ))}
                    </select>
                    <label>Customer Type</label>
                    <select name="customerType" value={reportForm.customerType} onChange={handleFormChange}>
                      <option value="">All Types</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                    </select>
                    <label>Payment Status</label>
                    <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)}>
                      <option value="all">All</option>
                      <option value="paid">Paid</option>
                      <option value="unpaid">Unpaid</option>
                      <option value="overdue">Overdue</option>
                      <option value="partial">Partial</option>
                    </select>
                    <label>Billing Cycle</label>
                    <select name="billingCycle" value={reportForm.billingCycle} onChange={handleFormChange}>
                      <option value="">All Cycles</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </>
                )}
                {reportFocus === 'customer-feedback' && (
                  <>
                    <label>Area/Barangay</label>
                    <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                      <option value="">All Barangays</option>
                      {barangays.map(barangay => (
                        <option key={barangay.barangay_id} value={barangay.barangay_id}>{barangay.barangay_name}</option>
                      ))}
                    </select>
                    <label>Complaint Type</label>
                    <select name="complaintType" value={reportForm.complaintType} onChange={handleFormChange}>
                      <option value="">All Types</option>
                      <option value="missed-pickup">Missed Pickup</option>
                      <option value="billing-issue">Billing Issue</option>
                      <option value="service-quality">Service Quality</option>
                      <option value="schedule-change">Schedule Change</option>
                      <option value="other">Other</option>
                    </select>
                    <label>Status</label>
                    <select name="feedbackStatus" value={reportForm.feedbackStatus} onChange={handleFormChange}>
                      <option value="">All Status</option>
                      <option value="resolved">Resolved</option>
                      <option value="unresolved">Unresolved</option>
                      <option value="in-progress">In Progress</option>
                    </select>
                    <label>Priority</label>
                    <select name="priority" value={reportForm.priority} onChange={handleFormChange}>
                      <option value="">All Priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </>
                )}
                <div style={{marginTop:8}}>
                  <label><input type="checkbox" checked={scheduleReport} onChange={e => setScheduleReport(e.target.checked)} /> Schedule this report</label>
                  {scheduleReport && (
                    <select value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value)}>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="form-section">
                <h4>Options</h4>
                <label><input type="checkbox" name="includeCharts" checked={reportForm.includeCharts} onChange={e => setReportForm(prev => ({ ...prev, includeCharts: e.target.checked }))}/> Include Charts</label>
                <label><input type="checkbox" name="includeDetails" checked={reportForm.includeDetails} onChange={e => setReportForm(prev => ({ ...prev, includeDetails: e.target.checked }))}/> Include Detailed Data</label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
                <button type="button" className="cancel" onClick={() => setShowModal(false)} disabled={loading}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === SCHEDULE MODAL === */}
      {showScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form className="schedule-form" onSubmit={handleScheduleSubmit}>
              <h3>Schedule Report</h3>
              
              <label>Frequency</label>
              <select name="frequency" value={scheduleForm.frequency} onChange={handleScheduleFormChange}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>

              {scheduleForm.frequency === 'weekly' && (
                <div className="form-group">
                  <label>Day</label>
                  <select name="day" value={scheduleForm.day} onChange={handleScheduleFormChange}>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                  </select>
                </div>
              )}

              <label>Time</label>
              <input 
                type="time" 
                name="time" 
                value={scheduleForm.time} 
                onChange={handleScheduleFormChange}
              />

              <label>Export Format</label>
              <select name="format" value={scheduleForm.format} onChange={handleScheduleFormChange}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>

              <label>Recipients (comma-separated emails)</label>
              <input
                type="text"
                name="recipients"
                value={scheduleForm.recipients}
                onChange={handleScheduleFormChange}
                placeholder="email1@example.com, email2@example.com"
              />

              <div className="form-actions">
                <button type="submit">Schedule</button>
                <button type="button" className="cancel" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === SHARE MODAL === */}
      {showShareModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form className="share-form" onSubmit={handleShareSubmit}>
              <h3>Share Report</h3>
              
              <label>Recipients (comma-separated emails)</label>
              <input
                type="text"
                name="emails"
                value={shareForm.emails}
                onChange={handleShareFormChange}
                placeholder="email1@example.com, email2@example.com"
              />

              <label>Message (optional)</label>
              <textarea
                name="message"
                value={shareForm.message}
                onChange={handleShareFormChange}
                placeholder="Add a message..."
                rows="3"
              ></textarea>

              <label>Export Format</label>
              <select name="format" value={shareForm.format} onChange={handleShareFormChange}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>

              <div className="form-actions">
                <button type="submit">Share</button>
                <button type="button" className="cancel" onClick={() => setShowShareModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && viewReport && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Report Details</h3>
            <p><b>ID:</b> {viewReport.report_id || viewReport.id}</p>
            <p><b>Type:</b> {viewReport.type}</p>
            <p><b>Period:</b> {viewReport.period}</p>
            <p><b>Generated By:</b> {viewReport.generated_by || viewReport.generatedBy}</p>
            <p><b>Date:</b> {viewReport.date}</p>
            <p><b>Status:</b> {viewReport.status}</p>
            <p><b>Schedule:</b> {viewReport.schedule}</p>
            <p><b>Format:</b> {viewReport.format}</p>
            <p><b>Recipients:</b> {viewReport.recipients}</p>
            <p><b>Message:</b> {viewReport.message}</p>
            <p><b>Start Date:</b> {viewReport.start_date}</p>
            <p><b>End Date:</b> {viewReport.end_date}</p>
            {viewReport.file_url ? (
              <a href={viewReport.file_url} target="_blank" rel="noopener noreferrer" className="download-link">Download PDF</a>
            ) : (
              <span className="text-muted">No PDF available</span>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add a new section below the table for report output */}
      {selectedReportOutput && (
        <section className="report-output-section">
          <h2>Report: {selectedReportOutput.title || 'Generated Report'}</h2>
          {reportFocus === 'billing' ? (
            <>
              {/* Billing Executive Summary Cards */}
              <div className="report-summary-cards">
                <div className="summary-card">Total Invoices<br/><b>80</b></div>
                <div className="summary-card">Total Revenue<br/><b>₱120,000</b></div>
                <div className="summary-card">Paid<br/><b>60</b></div>
                <div className="summary-card">Unpaid<br/><b>15</b></div>
                <div className="summary-card">Overdue<br/><b>5</b></div>
                <div className="summary-card">Avg Invoice<br/><b>₱1,500</b></div>
              </div>
              {/* Billing Trend Insights (Charts) */}
              <div className="report-charts">
                <div className="chart-card"><b>Revenue by Month</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Line Chart Placeholder</div></div>
                <div className="chart-card"><b>Invoice Status</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Pie Chart Placeholder</div></div>
                <div className="chart-card"><b>Top Customers</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Bar Chart Placeholder</div></div>
              </div>
              {/* Billing Data Overview (Tables) */}
              <div className="report-tables">
                <div className="table-card"><b>Invoice Details</b><div style={{height:120,background:'#f9fafb',marginTop:8}}>Table Placeholder</div></div>
                <div className="table-card"><b>Payments</b><div style={{height:120,background:'#f9fafb',marginTop:8}}>Table Placeholder</div></div>
              </div>
              {/* Billing Recommendations */}
              <div className="report-recommendations">
                <h4>Recommendations</h4>
                <ul>
                  <li>Follow up on overdue invoices</li>
                  <li>Offer early payment discounts</li>
                </ul>
              </div>
              {/* Download/Share */}
              <div className="report-actions" style={{marginTop:16}}>
                <button>Download PDF</button>
                <button>Download Excel</button>
                <button>Share via Email</button>
              </div>
            </>
          ) : (
            <>
              {/* Executive Summary Cards for other report types */}
              <div className="report-summary-cards">
                <div className="summary-card">Total Pickups<br/><b>120</b></div>
                <div className="summary-card">Total Waste<br/><b>3,200 kg</b></div>
                <div className="summary-card">Total Cost<br/><b>₱45,000</b></div>
                <div className="summary-card">Compliance<br/><b>100%</b></div>
                <div className="summary-card">Missed Pickups<br/><b>2</b></div>
              </div>
              {/* Trend Insights (Charts) */}
              <div className="report-charts">
                <div className="chart-card"><b>Pickups Over Time</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Line Chart Placeholder</div></div>
                <div className="chart-card"><b>Waste Type Breakdown</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Pie Chart Placeholder</div></div>
                <div className="chart-card"><b>Route Performance</b><div style={{height:180,background:'#f3f4f6',marginTop:8}}>Bar Chart Placeholder</div></div>
              </div>
              {/* Data Overview (Tables) */}
              <div className="report-tables">
                <div className="table-card"><b>Pickup Details</b><div style={{height:120,background:'#f9fafb',marginTop:8}}>Table Placeholder</div></div>
                <div className="table-card"><b>Compliance Events</b><div style={{height:120,background:'#f9fafb',marginTop:8}}>Table Placeholder</div></div>
              </div>
              {/* Recommendations */}
              <div className="report-recommendations">
                <h4>Recommendations</h4>
                <ul>
                  <li>Optimize Route 3 (low fill rate)</li>
                  <li>Educate Barangay Lagao on segregation</li>
                </ul>
              </div>
              {/* Download/Share */}
              <div className="report-actions" style={{marginTop:16}}>
                <button>Download PDF</button>
                <button>Download Excel</button>
                <button>Share via Email</button>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
};

export default Reports;
