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

  // Generate report
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!reportForm.startDate || !reportForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    
    try {
      const requestData = {
        type: reportForm.type,
        start_date: reportForm.startDate,
        end_date: reportForm.endDate,
        format: reportForm.format,
        generated_by: 'Admin User'
      };

      console.log('Generating report with data:', requestData);

      // Call the backend API to generate the report
      const response = await axios.post(`${API_URL}/reports/generate`, requestData);
      
      console.log('Report generation response:', response.data);

      // Download the generated report
      if (response.data && response.data.report) {
        await downloadReport(response.data.report);
      }
      
      setShowModal(false);
      alert('Report generated successfully!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download report as PDF
  const downloadReport = async (reportData) => {
    try {
      const pdfResponse = await axios.post(`${API_URL}/reports/generate-pdf`, {
        reportData: {
          type: reportData.type,
          generated_by: 'Admin User',
          date: new Date().toISOString().split('T')[0],
          period: 'custom',
          start_date: reportForm.startDate,
          end_date: reportForm.endDate,
          data: reportData
        }
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const reportType = reportData.type || 'report';
      link.download = `WSBS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  // Set quick date ranges
  const setQuickRange = (range) => {
    const today = new Date();
    let startDate, endDate;

    switch (range) {
      case 'today':
        startDate = endDate = getToday();
        break;
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        endDate = getToday();
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = getToday();
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setReportForm(prev => ({ ...prev, startDate, endDate }));
  };

  return (
    <section className="reports-content">
      <div className="reports-header">
        <h2>Reports</h2>
        <button 
          className="btn generate-btn"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus"></i> Generate Report
        </button>
      </div>

      <div className="reports-info">
        <div className="info-card">
          <h4><i className="fas fa-info-circle"></i> Simple Reporting</h4>
          <p>
            Generate PDF reports for your waste collection business. 
            Choose a report type, select date range, and download your report.
          </p>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content report-modal">
            <div className="modal-header">
              <h3>Generate Report</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGenerateReport}>
              {/* Report Type */}
              <div className="form-section">
                <h4>Report Type</h4>
                <div className="report-type-simple">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="billing"
                      checked={reportForm.type === 'billing'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <span>Billing Report</span>
                    <small>Subscriber payments and billing information</small>
                  </label>
                  
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="type"
                      value="collection"
                      checked={reportForm.type === 'collection'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <span>Collection Report</span>
                    <small>Waste collection activities and routes</small>
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="form-section">
                <h4>Date Range</h4>
                
                {/* Quick Date Buttons */}
                <div className="quick-dates">
                  <button type="button" onClick={() => setQuickRange('today')}>Today</button>
                  <button type="button" onClick={() => setQuickRange('week')}>Last 7 Days</button>
                  <button type="button" onClick={() => setQuickRange('month')}>This Month</button>
                  <button type="button" onClick={() => setQuickRange('lastMonth')}>Last Month</button>
                </div>

                {/* Custom Date Range */}
                <div className="date-inputs">
                  <div className="date-input-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={reportForm.startDate}
                      onChange={(e) => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="date-input-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={reportForm.endDate}
                      onChange={(e) => setReportForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Format */}
              <div className="form-section">
                <h4>Format</h4>
                <select
                  value={reportForm.format}
                  onChange={(e) => setReportForm(prev => ({ ...prev, format: e.target.value }))}
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              {/* Submit */}
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-generate"
                >
                  {loading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Reports;
