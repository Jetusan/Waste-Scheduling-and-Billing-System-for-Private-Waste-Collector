import React, { useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import '../styles/Reports.css';

const API_URL = `${API_CONFIG.BASE_URL}/api`;

// Helper functions for date presets
const getToday = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getLastMonth = () => {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  return lastMonth.toISOString().split('T')[0];
};

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Simplified report form
  const [reportForm, setReportForm] = useState({
    type: 'billing',
    startDate: '',
    endDate: '',
    format: 'pdf'
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
  // Removed unused selectedWeekdays and weekdaysList

  // Add new state for report focus, waste type, scheduling, and selected report output
  // Map reportFocus to backend type
  const [reportFocus, setReportFocus] = useState('regular-pickup');
  // Map frontend reportFocus to backend type
  const reportFocusToType = {
    'regular-pickup': 'regular-pickup',
    'billing-payment': 'billing-payment',
    'special-pickup': 'special-pickup',
  };
  // Removed unused wasteType, scheduleReport, scheduleFrequency
  const [generatedReportData, setGeneratedReportData] = useState(null);

  // Removed unused invoiceStatus, planType
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
        filters: {}
      };

      // Add specific filters based on report type
      if (reportFocus === 'regular-pickup') {
        requestData.filters = {
          barangay: reportForm.barangay,
          team: reportForm.team,
          truck: reportForm.truck,
          route: reportForm.route,
          status: reportForm.status,
          scheduleType: reportForm.scheduleType,
          wasteType: reportForm.wasteType
        };
      } else if (reportFocus === 'billing-payment') {
        requestData.filters = {
          barangay: reportForm.barangay,
          plan: reportForm.plan,
          status: reportForm.paymentStatus,
          paymentMethod: reportForm.paymentMethod,
          invoiceType: reportForm.invoiceType,
          minAmount: reportForm.minAmount,
          maxAmount: reportForm.maxAmount,
          wasteType: reportForm.wasteType
        };
      } else if (reportFocus === 'special-pickup') {
        requestData.filters = {
          barangay: reportForm.barangay,
          wasteType: reportForm.wasteType,
          status: reportForm.status,
          priceStatus: reportForm.priceStatus,
          collector: reportForm.collector,
          minAmount: reportForm.minAmount,
          maxAmount: reportForm.maxAmount
        };
      }

      console.log('Generating report with data:', requestData);

      // Call the backend API to generate the report
      const response = await axios.post(`${API_URL}/reports/generate`, requestData);
      
      console.log('Report generation response:', response.data);

      // Store the generated report data for visualization
      setGeneratedReportData(response.data.report);
      
      // Close the modal and refresh the reports list
      setShowModal(false);
      
      // Reset form
      setReportForm({
        type: 'regular-pickup',
        period: 'weekly',
        startDate: '',
        endDate: '',
        generatedBy: 'Admin User',
        format: 'pdf',
        schedule: null,
        // Regular Pickup filters
        barangay: '',
        team: '',
        truck: '',
        route: '',
        status: 'all',
        scheduleType: '',
        // Billing/Payment filters
        plan: '',
        paymentStatus: 'all',
        paymentMethod: '',
        invoiceType: '',
        minAmount: '',
        maxAmount: '',
        // Special Pickup filters
        wasteType: '',
        priceStatus: '',
        collector: '',
        // Common options
        includeCharts: true,
        includeDetails: true
      });
      setReportFocus('regular-pickup');

      // Refresh the reports list
      const { data } = await axios.get(`${API_URL}/reports`);
      setReports(data);

      // Show success message with better UX
      const successMessage = document.createElement('div');
      successMessage.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1001;
          font-family: 'Segoe UI', sans-serif;
          font-weight: 500;
        ">
          <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
          Report generated successfully! View the visualization below.
        </div>
      `;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        document.body.removeChild(successMessage);
      }, 4000);
    } catch (err) {
      console.error('Error generating report:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Unknown error occurred';
      setError('Failed to generate report: ' + errorMessage);
      
      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1001;
          font-family: 'Segoe UI', sans-serif;
          font-weight: 500;
          max-width: 400px;
        ">
          <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
          ${errorMessage}
        </div>
      `;
      document.body.appendChild(errorNotification);
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 6000);
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
          const barangaysRes = await axios.get(`${API_URL}/reports/barangays`);
          setBarangays(barangaysRes.data);

          // Fetch collection teams
          const teamsRes = await axios.get(`${API_URL}/reports/teams`);
          setTeams(teamsRes.data);

          // Fetch trucks
          const trucksRes = await axios.get(`${API_URL}/reports/trucks`);
          setTrucks(trucksRes.data);

          // Fetch routes
          const routesRes = await axios.get(`${API_URL}/reports/routes`);
          setRoutes(routesRes.data);

          // Fetch subscription plans
          const plansRes = await axios.get(`${API_URL}/reports/plans`);
          setPlans(plansRes.data);

          // Fetch collectors
          const collectorsRes = await axios.get(`${API_URL}/reports/collectors`);
          setCollectors(collectorsRes.data);

          // Fetch waste types
          const wasteTypesRes = await axios.get(`${API_URL}/reports/waste-types`);
          setWasteTypes(wasteTypesRes.data);

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
      type: reportFocusToType[reportFocus] || 'regular-pickup',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportFocus]);

  const handleScheduleFormChange = e => {
    const { name, value } = e.target;
    setScheduleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleShareFormChange = e => {
    const { name, value } = e.target;
    setShareForm(prev => ({ ...prev, [name]: value }));
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
      // Check if this is a freshly generated report (has data directly)
      const isGeneratedReport = report && report.data && !report.report_id;
      
      if (!isGeneratedReport && report.status !== 'Completed') {
        alert('Report is not ready for download. Status: ' + report.status);
        return;
      }
      
      if (format === 'pdf') {
        let pdfResponse;
        
        if (isGeneratedReport) {
          // For freshly generated reports, send the data directly to PDF generation
          pdfResponse = await axios.post(`${API_URL}/reports/generate-pdf`, {
            reportData: {
              type: report.reportType || report.type,
              generated_by: 'Admin User',
              date: new Date().toISOString().split('T')[0],
              period: 'custom',
              data: report,
              report_id: 'preview',
              start_date: report.dateRange?.startDate,
              end_date: report.dateRange?.endDate
            }
          }, {
            responseType: 'blob'
          });
        } else {
          // For stored reports, use existing download endpoint
          pdfResponse = await axios.get(`${API_URL}/reports/${report.report_id}/download?format=pdf`, {
            responseType: 'blob'
          });
        }
        
        // Create download link
        const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const reportId = report.report_id || 'preview';
        const reportType = report.reportType || report.type || 'report';
        link.download = `WSBS_Report_${reportType}_${reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }
      
      // For other formats, get the report data first
      const response = await axios.get(`${API_URL}/reports/${report.report_id}/download`);
      const reportData = response.data;
      
      // Create downloadable file
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportData.type}_report_${reportData.report_id}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
              <p className="subtitle">Create comprehensive analytics and insights for your waste management operations</p>
              {error && (
                <div className="error-message" style={{
                  background: '#fee2e2',
                  color: '#dc2626',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #fecaca',
                  fontSize: '14px'
                }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                  {error}
                </div>
              )}

              {/* Report Type Selection */}
              <div className="form-section">
                <h4>Report Type</h4>
                <div className="report-type-cards">
                  <div
                    className={`report-type-card ${reportFocus === 'regular-pickup' ? 'active' : ''}`}
                    onClick={() => setReportFocus('regular-pickup')}
                  >
                    <i className="fas fa-calendar-alt"></i>
                    <h5>Regular Pickup</h5>
                    <p>Track scheduled collection routes and team performance</p>
                  </div>
                  <div
                    className={`report-type-card ${reportFocus === 'billing-payment' ? 'active' : ''}`}
                    onClick={() => setReportFocus('billing-payment')}
                  >
                    <i className="fas fa-credit-card"></i>
                    <h5>Billing & Payments</h5>
                    <p>Analyze subscription payments and financial performance</p>
                  </div>
                  <div
                    className={`report-type-card ${reportFocus === 'special-pickup' ? 'active' : ''}`}
                    onClick={() => setReportFocus('special-pickup')}
                  >
                    <i className="fas fa-truck"></i>
                    <h5>Special Pickups</h5>
                    <p>Monitor on-demand pickup requests and revenue</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Date Range with Presets */}
              <div className="form-section">
                <h4>Date Range & Quick Filters</h4>
                <div className="date-range-inputs">
                  {/* Quick Date Presets */}
                  <div className="date-presets">
                    <button
                      type="button"
                      className={`preset-btn ${reportForm.startDate === getToday() && reportForm.endDate === getToday() ? 'active' : ''}`}
                      onClick={() => setReportForm(prev => ({ ...prev, startDate: getToday(), endDate: getToday() }))}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${reportForm.startDate === getYesterday() && reportForm.endDate === getYesterday() ? 'active' : ''}`}
                      onClick={() => setReportForm(prev => ({ ...prev, startDate: getYesterday(), endDate: getYesterday() }))}
                    >
                      Yesterday
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${reportForm.startDate === getThisWeekStart() && reportForm.endDate === getThisWeekEnd() ? 'active' : ''}`}
                      onClick={() => setReportForm(prev => ({ ...prev, startDate: getThisWeekStart(), endDate: getThisWeekEnd() }))}
                    >
                      This Week
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${reportForm.startDate === getLastWeekStart() && reportForm.endDate === getLastWeekEnd() ? 'active' : ''}`}
                      onClick={() => setReportForm(prev => ({ ...prev, startDate: getLastWeekStart(), endDate: getLastWeekEnd() }))}
                    >
                      Last Week
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${reportForm.startDate === getThisMonthStart() && reportForm.endDate === getThisMonthEnd() ? 'active' : ''}`}
                      onClick={() => setReportForm(prev => ({ ...prev, startDate: getThisMonthStart(), endDate: getThisMonthEnd() }))}
                    >
                      This Month
                    </button>
                  </div>

                  {/* Custom Date Range */}
                  <div className="custom-date-range">
                    <input
                      type="date"
                      name="startDate"
                      value={reportForm.startDate}
                      onChange={handleFormChange}
                      placeholder="Start date"
                      required
                    />
                    <span>to</span>
                    <input
                      type="date"
                      name="endDate"
                      value={reportForm.endDate}
                      onChange={handleFormChange}
                      placeholder="End date"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Regular Pickup Filters */}
              {reportFocus === 'regular-pickup' && (
                <div className="form-section">
                  <div className="filter-header">
                    <h4>🚛 Collection Filters</h4>
                    <div className="modern-filter-suggestions">
                      <div className="filter-category">
                        <span className="category-label">📅 Time-based Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip primary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'collected', startDate: getToday(), endDate: getToday()}));
                          }}>
                            <i className="fas fa-calendar-day"></i>
                            Today's Collections
                          </button>
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisWeekStart(), endDate: getThisWeekEnd()}));
                          }}>
                            <i className="fas fa-calendar-week"></i>
                            This Week
                          </button>
                          <button type="button" className="filter-chip info" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisMonthStart(), endDate: getThisMonthEnd()}));
                          }}>
                            <i className="fas fa-calendar-alt"></i>
                            This Month
                          </button>
                        </div>
                      </div>
                      
                      <div className="filter-category">
                        <span className="category-label">📊 Performance Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'collected'}));
                          }}>
                            <i className="fas fa-check-circle"></i>
                            Collected Only
                          </button>
                          <button type="button" className="filter-chip warning" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'missed'}));
                          }}>
                            <i className="fas fa-exclamation-triangle"></i>
                            Missed Collections
                          </button>
                          <button type="button" className="filter-chip secondary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'all', startDate: getLastWeekStart(), endDate: getLastWeekEnd()}));
                          }}>
                            <i className="fas fa-chart-line"></i>
                            Last Week Analysis
                          </button>
                        </div>
                      </div>

                      <div className="filter-category">
                        <span className="category-label">🎯 Quick Reports</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip gradient-primary" onClick={() => {
                            setReportForm(prev => ({
                              ...prev, 
                              status: 'collected', 
                              startDate: getToday(), 
                              endDate: getToday(),
                              includeCharts: true
                            }));
                          }}>
                            <i className="fas fa-bolt"></i>
                            Daily Performance
                          </button>
                          <button type="button" className="filter-chip gradient-success" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              startDate: getThisWeekStart(),
                              endDate: getThisWeekEnd(),
                              includeCharts: true,
                              includeDetails: true
                            }));
                          }}>
                            <i className="fas fa-chart-bar"></i>
                            Weekly Summary
                          </button>
                          <button type="button" className="filter-chip gradient-info" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              startDate: getThisMonthStart(),
                              endDate: getThisMonthEnd(),
                              includeCharts: true,
                              includeDetails: true
                            }));
                          }}>
                            <i className="fas fa-analytics"></i>
                            Monthly Analytics
                          </button>
                        </div>
                      </div>

                      <div className="filter-category">
                        <span className="category-label">🗑️ Waste Type Filters</span>
                        <div className="filter-chips">
                          {wasteTypes.slice(0, 4).map((wasteType, index) => (
                            <button 
                              key={wasteType.waste_type_id} 
                              type="button" 
                              className={`filter-chip ${['gradient-primary', 'gradient-success', 'gradient-info', 'gradient-warning'][index]}`}
                              onClick={() => {
                                setReportForm(prev => ({...prev, wasteType: wasteType.waste_type_name}));
                              }}
                            >
                              <i className={`fas ${['fa-trash', 'fa-leaf', 'fa-wine-bottle', 'fa-box'][index]}`}></i>
                              {wasteType.waste_type_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="filters-grid">
                    <div className="form-group">
                      <label>Barangay</label>
                      <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                        <option value="">All Barangays</option>
                        {barangays.map(barangay => (
                          <option key={barangay.barangay_id} value={barangay.barangay_id}>
                            {barangay.barangay_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Collection Team</label>
                      <select name="team" value={reportForm.team} onChange={handleFormChange}>
                        <option value="">All Teams</option>
                        {teams.map(team => (
                          <option key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Truck</label>
                      <select name="truck" value={reportForm.truck} onChange={handleFormChange}>
                        <option value="">All Trucks</option>
                        {trucks.map(truck => (
                          <option key={truck.truck_id} value={truck.truck_id}>
                            {truck.truck_number}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Route</label>
                      <select name="route" value={reportForm.route} onChange={handleFormChange}>
                        <option value="">All Routes</option>
                        {routes.map(route => (
                          <option key={route.route_id} value={route.route_id}>
                            {route.route_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Collection Status</label>
                      <select name="status" value={reportForm.status} onChange={handleFormChange}>
                        <option value="all">All Collections</option>
                        <option value="collected">✅ Collected</option>
                        <option value="missed">⚠️ Missed</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="cancelled">❌ Cancelled</option>
                        <option value="completed">📅 Completed (Legacy)</option>
                        <option value="today_completed">📅 Today's Completed</option>
                        <option value="ontime">🟢 On-Time Collections</option>
                        <option value="late">🟡 Late Collections</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Schedule Type</label>
                      <select name="scheduleType" value={reportForm.scheduleType} onChange={handleFormChange}>
                        <option value="">All Types</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Waste Type</label>
                      <select name="wasteType" value={reportForm.wasteType} onChange={handleFormChange}>
                        <option value="">All Waste Types</option>
                        {wasteTypes.map(wasteType => (
                          <option key={wasteType.waste_type_id} value={wasteType.waste_type_name}>
                            {wasteType.waste_type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing/Payment Filters */}
              {reportFocus === 'billing-payment' && (
                <div className="form-section">
                  <div className="filter-header">
                    <h4>💰 Billing & Payment Filters</h4>
                    <div className="modern-filter-suggestions">
                      <div className="filter-category">
                        <span className="category-label">📅 Time-based Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip primary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'paid', startDate: getToday(), endDate: getToday()}));
                          }}>
                            <i className="fas fa-calendar-day"></i>
                            Today's Payments
                          </button>
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisWeekStart(), endDate: getThisWeekEnd()}));
                          }}>
                            <i className="fas fa-calendar-week"></i>
                            This Week
                          </button>
                          <button type="button" className="filter-chip info" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisMonthStart(), endDate: getThisMonthEnd()}));
                          }}>
                            <i className="fas fa-calendar-alt"></i>
                            This Month
                          </button>
                        </div>
                      </div>
                      
                      <div className="filter-category">
                        <span className="category-label">📊 Payment Status</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'paid'}));
                          }}>
                            <i className="fas fa-check-circle"></i>
                            Paid Invoices
                          </button>
                          <button type="button" className="filter-chip warning" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'unpaid'}));
                          }}>
                            <i className="fas fa-exclamation-triangle"></i>
                            Unpaid Invoices
                          </button>
                          <button type="button" className="filter-chip secondary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'overdue'}));
                          }}>
                            <i className="fas fa-clock"></i>
                            Overdue Payments
                          </button>
                        </div>
                      </div>

                      <div className="filter-category">
                        <span className="category-label">💎 Revenue Analytics</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip gradient-primary" onClick={() => {
                            setReportForm(prev => ({
                              ...prev, 
                              status: 'paid',
                              startDate: getThisMonthStart(),
                              endDate: getThisMonthEnd()
                            }));
                          }}>
                            <i className="fas fa-chart-bar"></i>
                            Monthly Revenue
                          </button>
                          <button type="button" className="filter-chip gradient-success" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              minAmount: '1000',
                              status: 'all'
                            }));
                          }}>
                            <i className="fas fa-gem"></i>
                            High Value (₱1000+)
                          </button>
                          <button type="button" className="filter-chip gradient-info" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              status: 'unpaid',
                              startDate: getLastMonthStart(),
                              endDate: getLastMonthEnd()
                            }));
                          }}>
                            <i className="fas fa-exclamation-circle"></i>
                            Collection Issues
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="filters-grid">
                    <div className="form-group">
                      <label>Barangay</label>
                      <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                        <option value="">All Barangays</option>
                        {barangays.map(barangay => (
                          <option key={barangay.barangay_id} value={barangay.barangay_id}>
                            {barangay.barangay_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Subscription Plan</label>
                      <select name="plan" value={reportForm.plan} onChange={handleFormChange}>
                        <option value="">All Plans</option>
                        {plans.map(plan => (
                          <option key={plan.plan_id} value={plan.plan_id}>
                            {plan.plan_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Payment Performance</label>
                      <select name="paymentStatus" value={reportForm.paymentStatus} onChange={handleFormChange}>
                        <option value="all">All Payments</option>
                        <option value="paid">💰 Paid</option>
                        <option value="unpaid">⏳ Unpaid</option>
                        <option value="overdue">🔴 Overdue</option>
                        <option value="partially_paid">🟡 Partially Paid</option>
                        <option value="cancelled">❌ Cancelled</option>
                        <option value="paid_ontime">🟢 Paid On-Time</option>
                        <option value="paid_late">🟡 Paid Late</option>
                        <option value="high_value">💎 High Value (₱1000+)</option>
                        <option value="low_value">💵 Low Value (₱0-₱500)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Payment Method</label>
                      <select name="paymentMethod" value={reportForm.paymentMethod} onChange={handleFormChange}>
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="online">Online</option>
                        <option value="check">Check</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Invoice Type</label>
                      <select name="invoiceType" value={reportForm.invoiceType} onChange={handleFormChange}>
                        <option value="">All Types</option>
                        <option value="regular">Regular</option>
                        <option value="special">Special</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Min Amount</label>
                      <input
                        type="number"
                        name="minAmount"
                        value={reportForm.minAmount}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Max Amount</label>
                      <input
                        type="number"
                        name="maxAmount"
                        value={reportForm.maxAmount}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Waste Type</label>
                      <select name="wasteType" value={reportForm.wasteType} onChange={handleFormChange}>
                        <option value="">All Waste Types</option>
                        {wasteTypes.map(wasteType => (
                          <option key={wasteType.waste_type_id} value={wasteType.waste_type_name}>
                            {wasteType.waste_type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Pickup Filters */}
              {reportFocus === 'special-pickup' && (
                <div className="form-section">
                  <div className="filter-header">
                    <h4>🚛 Special Pickup Filters</h4>
                    <div className="modern-filter-suggestions">
                      <div className="filter-category">
                        <span className="category-label">📅 Time-based Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip primary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'collected', startDate: getToday(), endDate: getToday()}));
                          }}>
                            <i className="fas fa-calendar-day"></i>
                            Today's Pickups
                          </button>
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisWeekStart(), endDate: getThisWeekEnd()}));
                          }}>
                            <i className="fas fa-calendar-week"></i>
                            This Week
                          </button>
                          <button type="button" className="filter-chip info" onClick={() => {
                            setReportForm(prev => ({...prev, startDate: getThisMonthStart(), endDate: getThisMonthEnd()}));
                          }}>
                            <i className="fas fa-calendar-alt"></i>
                            This Month
                          </button>
                        </div>
                      </div>
                      
                      <div className="filter-category">
                        <span className="category-label">📊 Status Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip warning" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'pending'}));
                          }}>
                            <i className="fas fa-clock"></i>
                            Pending Requests
                          </button>
                          <button type="button" className="filter-chip success" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'collected'}));
                          }}>
                            <i className="fas fa-check-circle"></i>
                            Completed Pickups
                          </button>
                          <button type="button" className="filter-chip secondary" onClick={() => {
                            setReportForm(prev => ({...prev, status: 'in_progress'}));
                          }}>
                            <i className="fas fa-spinner"></i>
                            In Progress
                          </button>
                        </div>
                      </div>

                      <div className="filter-category">
                        <span className="category-label">💰 Value-based Filters</span>
                        <div className="filter-chips">
                          <button type="button" className="filter-chip gradient-primary" onClick={() => {
                            setReportForm(prev => ({
                              ...prev, 
                              minAmount: '500',
                              status: 'all'
                            }));
                          }}>
                            <i className="fas fa-gem"></i>
                            High Value (₱500+)
                          </button>
                          <button type="button" className="filter-chip gradient-success" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              priceStatus: 'agreed',
                              status: 'all'
                            }));
                          }}>
                            <i className="fas fa-handshake"></i>
                            Price Agreed
                          </button>
                          <button type="button" className="filter-chip gradient-info" onClick={() => {
                            setReportForm(prev => ({
                              ...prev,
                              startDate: getToday(),
                              endDate: getToday(),
                              status: 'collected'
                            }));
                          }}>
                            <i className="fas fa-chart-line"></i>
                            Today's Revenue
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="filters-grid">
                    <div className="form-group">
                      <label>Barangay</label>
                      <select name="barangay" value={reportForm.barangay} onChange={handleFormChange}>
                        <option value="">All Barangays</option>
                        {barangays.map(barangay => (
                          <option key={barangay.barangay_id} value={barangay.barangay_id}>
                            {barangay.barangay_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Waste Type</label>
                      <select name="wasteType" value={reportForm.wasteType} onChange={handleFormChange}>
                        <option value="">All Types</option>
                        {wasteTypes.map(wasteType => (
                          <option key={wasteType.waste_type_id} value={wasteType.waste_type_name}>
                            {wasteType.waste_type_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Pickup Status</label>
                      <select name="status" value={reportForm.status} onChange={handleFormChange}>
                        <option value="all">All Pickups</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="in_progress">🔄 In Progress</option>
                        <option value="collected">✅ Collected</option>
                        <option value="cancelled">❌ Cancelled</option>
                        <option value="completed_today">📅 Completed Today</option>
                        <option value="urgent">🚨 Urgent Requests</option>
                        <option value="high_value">💎 High Value (₱500+)</option>
                        <option value="low_value">💵 Low Value (₱0-₱200)</option>
                        <option value="negotiating">🤝 Negotiating Price</option>
                        <option value="agreed">✅ Price Agreed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Price Status</label>
                      <select name="priceStatus" value={reportForm.priceStatus} onChange={handleFormChange}>
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="negotiating">Negotiating</option>
                        <option value="agreed">Agreed</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Collector</label>
                      <select name="collector" value={reportForm.collector} onChange={handleFormChange}>
                        <option value="">All Collectors</option>
                        {collectors.map(collector => (
                          <option key={collector.collector_id} value={collector.collector_id}>
                            {collector.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Min Amount</label>
                      <input
                        type="number"
                        name="minAmount"
                        value={reportForm.minAmount}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Max Amount</label>
                      <input
                        type="number"
                        name="maxAmount"
                        value={reportForm.maxAmount}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Options Section */}
              <div className="form-section">
                <h4>Report Options & Analytics</h4>
                <div className="options-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="includeCharts"
                      checked={reportForm.includeCharts}
                      onChange={e => setReportForm(prev => ({ ...prev, includeCharts: e.target.checked }))}
                    />
                    📊 Include Charts & Visualizations
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="includeDetails"
                      checked={reportForm.includeDetails}
                      onChange={e => setReportForm(prev => ({ ...prev, includeDetails: e.target.checked }))}
                    />
                    📋 Include Detailed Data Tables
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="includePerformance"
                      checked={reportForm.includePerformance}
                      onChange={e => setReportForm(prev => ({ ...prev, includePerformance: e.target.checked }))}
                    />
                    📈 Include Performance Analytics
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="includeTrends"
                      checked={reportForm.includeTrends}
                      onChange={e => setReportForm(prev => ({ ...prev, includeTrends: e.target.checked }))}
                    />
                    📉 Include Trend Analysis
                  </label>
                </div>

                {/* Advanced Analytics Options */}
                <div className="advanced-options">
                  <h5>Advanced Analytics</h5>
                  <div className="analytics-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="comparePeriods"
                        checked={reportForm.comparePeriods}
                        onChange={e => setReportForm(prev => ({ ...prev, comparePeriods: e.target.checked }))}
                      />
                      ⚖️ Compare with Previous Period
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="showTargets"
                        checked={reportForm.showTargets}
                        onChange={e => setReportForm(prev => ({ ...prev, showTargets: e.target.checked }))}
                      />
                      🎯 Show Performance Targets
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="includeRecommendations"
                        checked={reportForm.includeRecommendations}
                        onChange={e => setReportForm(prev => ({ ...prev, includeRecommendations: e.target.checked }))}
                      />
                      💡 Include AI Recommendations
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="submit"
                  disabled={isGenerating}
                  style={{
                    opacity: isGenerating ? 0.7 : 1,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <div className="spinner" style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff40',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chart-bar"></i>
                      Generate Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="cancel"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  disabled={isGenerating}
                  style={{
                    opacity: isGenerating ? 0.7 : 1,
                    cursor: isGenerating ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
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

      {/* Report Visualization Section */}
      {generatedReportData && (
        <section className="report-output-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2>Generated Report: {generatedReportData.type}</h2>
            <div className="report-actions">
              <button 
                className="action-btn" 
                onClick={() => handleExport('pdf', generatedReportData)}
                style={{ marginRight: '8px', padding: '8px 16px' }}
              >
                <i className="fas fa-download"></i> Download PDF
              </button>
              <button 
                className="action-btn"
                onClick={() => setGeneratedReportData(null)}
                style={{ padding: '8px 16px' }}
              >
                <i className="fas fa-times"></i> Close
              </button>
            </div>
          </div>
          <ReportVisualization 
            reportData={generatedReportData} 
            reportType={generatedReportData.type}
          />
        </section>
      )}
    </>
  );
};

export default Reports;
