import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import '../styles/SimpleReports.css';

const API_URL = `${API_CONFIG.BASE_URL}/api`;

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    reportType: 'collection', // 'collection' or 'billing'
    startDate: '',
    endDate: '',
    barangay: '',
    status: ''
  });

  // Sample barangays (you can fetch from API)
  const barangays = ['All Barangays', 'Barangay 1', 'Barangay 2', 'Barangay 3'];

  // Load existing reports when component mounts
  useEffect(() => {
    loadExistingReports();
  }, []);

  const loadExistingReports = async () => {
    try {
      setLoadingReports(true);
      console.log('🔄 Loading existing reports from database...');
      const response = await axios.get(`${API_URL}/reports`);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedReports = response.data.map(report => ({
          id: report.report_id,
          type: report.type === 'collection-report' ? 'collection' : 'billing',
          description: `${report.type === 'collection-report' ? 'Collection Report' : 'Billing Report'} - ${report.start_date} to ${report.end_date}`,
          dateGenerated: new Date(report.date).toLocaleDateString(),
          data: report // Store the full database report object
        }));
        
        console.log('✅ Loaded reports from database:', formattedReports);
        setGeneratedReports(formattedReports);
      }
    } catch (error) {
      console.error('❌ Error loading existing reports:', error);
      // Don't show alert for loading errors, just log them
    } finally {
      setLoadingReports(false);
    }
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!filters.startDate || !filters.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    
    try {
      const requestData = {
        type: filters.reportType === 'collection' ? 'waste-collection' : 'billing-payment',
        period: 'custom',
        start_date: filters.startDate,
        end_date: filters.endDate,
        filters: {
          barangay: filters.barangay !== 'All Barangays' ? filters.barangay : '',
          status: filters.status
        },
        generated_by: 'Admin User'
      };

      const response = await axios.post(`${API_URL}/reports/generate`, requestData);
      
      if (response.data && response.data.report) {
        // Reload the reports list to include the newly generated report from database
        await loadExistingReports();
        alert('Report generated successfully!');
      }
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download report as PDF
  const downloadReport = async (report) => {
    try {
      let pdfResponse;
      
      // Check if this is a database report (has report_id) or a new report
      if (report.data.report_id) {
        // Use the database report download endpoint
        pdfResponse = await axios.get(`${API_URL}/reports/${report.data.report_id}/download?format=pdf`, {
          responseType: 'blob'
        });
      } else {
        // Use the generate-pdf endpoint for new reports
        pdfResponse = await axios.post(`${API_URL}/reports/generate-pdf`, {
          reportData: report.data
        }, {
          responseType: 'blob'
        });
      }

      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `WSBS_${report.type}_${report.dateGenerated.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // View report details
  const viewReport = (report) => {
    alert(`Viewing report: ${report.description}\n\nGenerated on: ${report.dateGenerated}\n\nThis would open a detailed view of the report.`);
  };

  // Set quick date ranges
  const setQuickRange = (range) => {
    const today = new Date();
    let startDate, endDate;

    switch (range) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setFilters(prev => ({ ...prev, startDate, endDate }));
  };

  // Delete report
  const deleteReport = async (report) => {
    if (!window.confirm(`Are you sure you want to delete this report?\n\n${report.description}`)) {
      return;
    }

    try {
      if (report.data.report_id) {
        await axios.delete(`${API_URL}/reports/${report.data.report_id}`);
        await loadExistingReports(); // Reload the list
        alert('Report deleted successfully!');
      } else {
        // For local reports, just remove from state
        setGeneratedReports(prev => prev.filter(r => r.id !== report.id));
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  return (
    <div className="simple-reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1>Reports</h1>
        <p>Generate collection and billing reports</p>
      </div>

      {/* Simple Design Section */}
      <div className="simple-design-section">
        <h3>Report Generation</h3>
        
        {/* Report Type Selection */}
        <div className="report-type-selection">
          <button 
            className={`report-type-btn ${filters.reportType === 'collection' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, reportType: 'collection' }))}
          >
            Collection Report
          </button>
          <button 
            className={`report-type-btn ${filters.reportType === 'billing' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, reportType: 'billing' }))}
          >
            Billing Report
          </button>
        </div>
      </div>

      {/* Filtering Section */}
      <div className="filtering-section">
        <h3>Filters</h3>
        
        <div className="filter-grid">
          {/* Date Range */}
          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-range-inputs">
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
              <span>to</span>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="quick-dates">
              <button onClick={() => setQuickRange('today')}>Today</button>
              <button onClick={() => setQuickRange('week')}>Last 7 Days</button>
              <button onClick={() => setQuickRange('month')}>This Month</button>
            </div>
          </div>

          {/* Barangay Filter */}
          <div className="filter-group">
            <label>Barangay</label>
            <select 
              value={filters.barangay} 
              onChange={(e) => setFilters(prev => ({ ...prev, barangay: e.target.value }))}
            >
              {barangays.map(barangay => (
                <option key={barangay} value={barangay}>{barangay}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              {filters.reportType === 'collection' ? (
                <>
                  <option value="collected">✅ Collected</option>
                  <option value="missed">⚠️ Missed</option>
                  <option value="pending">⏳ Pending</option>
                </>
              ) : (
                <>
                  <option value="paid">✅ Paid</option>
                  <option value="unpaid">❌ Unpaid</option>
                  <option value="overdue">⚠️ Overdue</option>
                </>
              )}
            </select>
          </div>

          {/* Generate Button */}
          <div className="filter-group">
            <button 
              className="generate-btn"
              onClick={handleGenerateReport}
              disabled={loading || !filters.startDate || !filters.endDate}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Reports Table */}
      <div className="generated-reports-section">
        <h3>Generated Reports</h3>
        
        {loadingReports ? (
          <div className="no-reports">
            <p>Loading existing reports...</p>
          </div>
        ) : generatedReports.length === 0 ? (
          <div className="no-reports">
            <p>No reports generated yet. Use the filters above to generate your first report.</p>
          </div>
        ) : (
          <div className="reports-table">
            <table>
              <thead>
                <tr>
                  <th>Report Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedReports.map(report => (
                  <tr key={report.id}>
                    <td>
                      <div className="report-description">
                        <strong>{report.description}</strong>
                        <small>Generated on {report.dateGenerated}</small>
                      </div>
                    </td>
                    <td>
                      <div className="report-actions">
                        <button 
                          className="btn-view"
                          onClick={() => viewReport(report)}
                        >
                          View
                        </button>
                        <button 
                          className="btn-download"
                          onClick={() => downloadReport(report)}
                        >
                          Download PDF
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => deleteReport(report)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;