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

  // Remove users, schedules, invoices state and dropdowns
  const [reportForm, setReportForm] = useState({
    type: 'waste-collection',
    period: 'weekly',
    startDate: '',
    endDate: '',
    generatedBy: 'Admin User',
    format: 'pdf',
    schedule: null
  });

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

  // Remove useEffect for fetching users, schedules, invoices


  // Quick KPI calculations
  const stats = {
    total: reports.length,
    completed: reports.filter(r => r.status.toLowerCase().includes('completed')).length,
    pending: reports.filter(r => r.status.toLowerCase().includes('pending')).length,
    draft: reports.filter(r => r.status.toLowerCase().includes('draft')).length
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setReportForm(prev => ({ ...prev, [name]: value }));
  };

  const handleScheduleFormChange = e => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleShareFormChange = e => {
    const { name, value } = e.target;
    setShareForm(prev => ({ ...prev, [name]: value }));
  };

  // Add this function to handle report creation
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        type: reportForm.type,
        period: reportForm.period,
        generated_by: reportForm.generatedBy,
        status: 'Pending',
        schedule: null,
        format: reportForm.format,
        recipients: '',
        message: '',
        start_date: reportForm.startDate || null,
        end_date: reportForm.endDate || null
      };
      await axios.post(`${API_URL}/reports`, payload);
      setShowModal(false);
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
      alert('Failed to create report');
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

  const handleExport = (format, report) => {
    if (format === 'pdf' && report.file_url) {
      window.open(report.file_url, '_blank');
    } else {
      alert('Exporting as ' + format + ' is not implemented yet.');
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
                      <button className="action-btn view" onClick={() => handleView(r)}>
                        <i className="fas fa-eye"></i>
                      </button>
                      <button className="action-btn export" onClick={() => handleExport('pdf', r)} disabled={!r.file_url} title={r.file_url ? 'Download PDF' : 'No PDF available'}>
                        <i className="fas fa-download"></i>
                      </button>
                      <button className="action-btn share" onClick={() => { setSelectedReport(r); setShowShareModal(true); }}>
                        <i className="fas fa-share-alt"></i>
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(r.report_id || r.id)}>
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

      {/* === NEW REPORT MODAL === */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form className="generate-report-form" onSubmit={handleSubmit}>
              <h3>New Report</h3>
              <label>Report Type</label>
              <select name="type" value={reportForm.type} onChange={handleFormChange}>
                <option value="waste-collection">Waste Collection</option>
                <option value="financial-summary">Financial Summary</option>
                <option value="user-activity">User Activity</option>
                <option value="route-efficiency">Route Efficiency</option>
                <option value="partner-performance">Partner Performance</option>
                <option value="waste-composition">Waste Composition</option>
              </select>

              <label>Period</label>
              <select name="period" value={reportForm.period} onChange={handleFormChange}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom</option>
              </select>

              {reportForm.period === 'custom' && (
                <div className="date-range">
                  <input type="date" name="startDate" value={reportForm.startDate} onChange={handleFormChange}/>
                  <input type="date" name="endDate" value={reportForm.endDate} onChange={handleFormChange}/>
                </div>
              )}

              <label>Export Format</label>
              <select name="format" value={reportForm.format} onChange={handleFormChange}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>

              <label>Generated By</label>
              <input type="text" name="generatedBy" value={reportForm.generatedBy} disabled />

              {/* Remove User, Schedule, Invoice dropdowns */}

              <div className="form-actions">
                <button type="submit">Generate</button>
                <button type="button" className="cancel" onClick={() => setShowModal(false)}>Cancel</button>
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
    </>
  );
};

export default Reports;
