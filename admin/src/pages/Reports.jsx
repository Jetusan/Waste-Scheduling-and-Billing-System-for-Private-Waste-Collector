import React, { useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import ReportVisualization from '../components/ReportVisualization';
import logo from '../assets/images/LOGO.png';
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
  const [generatedReport, setGeneratedReport] = useState(null);
  const [showReport, setShowReport] = useState(false);
  
  // Simplified report form
  const [reportForm, setReportForm] = useState({
    type: 'billing-payment',
    startDate: '',
    endDate: ''
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
        period: 'custom',
        start_date: reportForm.startDate,
        end_date: reportForm.endDate,
        format: 'pdf',
        generated_by: 'Admin User'
      };

      // Call the backend API to generate the report
      const response = await axios.post(`${API_URL}/reports/generate`, requestData);
      
      // Store the generated report for display
      if (response.data && response.data.report) {
        setGeneratedReport(response.data.report);
        setShowReport(true);
      }
      
      alert('Report generated successfully!');
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download report as PDF
  const downloadReport = async () => {
    try {
      const pdfResponse = await axios.post(`${API_URL}/reports/generate-pdf`, {
        reportData: generatedReport
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const reportType = generatedReport.type || 'report';
      const dateRange = `${generatedReport.start_date} to ${generatedReport.end_date}`;
      link.download = `WSBS_${reportType}_${dateRange}.pdf`;
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

  // Close report view
  const closeReport = () => {
    setShowReport(false);
    setGeneratedReport(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="reports-container">
      {/* Report View Section */}
      {showReport && generatedReport ? (
        <div className="report-view-section">
          <div className="report-header-simple">
            <div className="report-logo">
              <img src={logo} alt="WSBS Logo" className="logo-image" />
              <span className="logo-text">Waste Scheduling and Billing System</span>
            </div>
            <div className="report-info">
              <h2>{generatedReport.type === 'billing-payment' ? 'Billing & Payment Report' : 
                   generatedReport.type === 'regular-pickup' ? 'Collection Report' : 
                   'Special Pickup Report'}</h2>
              <p className="date-range">Period: {formatDate(generatedReport.start_date)} - {formatDate(generatedReport.end_date)}</p>
            </div>
            <div className="report-actions-simple">
              <button className="btn-secondary" onClick={downloadReport}>
                Download PDF
              </button>
              <button className="btn-primary" onClick={closeReport}>
                Close Report
              </button>
            </div>
          </div>
          <ReportVisualization 
            reportData={generatedReport} 
            reportType={generatedReport.type}
          />
        </div>
      ) : (
        <>
          {/* Simple Report Form */}
          <div className="reports-header-simple">
            <h1>Reports</h1>
            <p>Generate and view reports for your waste collection business</p>
          </div>

          <div className="simple-report-form">
            <form onSubmit={handleGenerateReport}>
              {/* Report Type Selection */}
              <div className="form-group">
                <label>Report Type</label>
                <div className="report-type-options">
                  <button
                    type="button"
                    className={`type-option ${reportForm.type === 'billing-payment' ? 'active' : ''}`}
                    onClick={() => setReportForm(prev => ({ ...prev, type: 'billing-payment' }))}
                  >
                    Billing Report
                  </button>
                  <button
                    type="button"
                    className={`type-option ${reportForm.type === 'regular-pickup' ? 'active' : ''}`}
                    onClick={() => setReportForm(prev => ({ ...prev, type: 'regular-pickup' }))}
                  >
                    Collection Report
                  </button>
                  <button
                    type="button"
                    className={`type-option ${reportForm.type === 'special-pickup' ? 'active' : ''}`}
                    onClick={() => setReportForm(prev => ({ ...prev, type: 'special-pickup' }))}
                  >
                    Special Pickup Report
                  </button>
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="form-group">
                <label>Date Range</label>
                <div className="date-range-presets">
                  <button type="button" onClick={() => setQuickRange('today')}>Today</button>
                  <button type="button" onClick={() => setQuickRange('week')}>Last 7 Days</button>
                  <button type="button" onClick={() => setQuickRange('month')}>This Month</button>
                  <button type="button" onClick={() => setQuickRange('lastMonth')}>Last Month</button>
                </div>
                <div className="date-inputs-simple">
                  <div className="date-input-group">
                    <input
                      type="date"
                      value={reportForm.startDate}
                      onChange={(e) => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={reportForm.endDate}
                      onChange={(e) => setReportForm(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="form-actions">
                <button 
                  type="submit" 
                  disabled={loading || !reportForm.startDate || !reportForm.endDate}
                  className="btn-generate"
                >
                  {loading ? 'Generating Report...' : 'Generate Report'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;