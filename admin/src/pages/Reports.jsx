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
  
  // Simplified report form - no modal needed
  const [reportForm, setReportForm] = useState({
    type: 'billing',
    startDate: '',
    endDate: ''
  });

  // Generate report - always PDF format
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
        format: 'pdf', // Always PDF
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
    <section className="simple-reports-page">
      <div className="reports-header">
        <h2><i className="fas fa-chart-bar"></i> Reports</h2>
        <p className="reports-subtitle">Generate PDF reports for your waste collection business</p>
      </div>

      {/* Simple Report Form - No Modal */}
      <div className="simple-report-form">
        <form onSubmit={handleGenerateReport}>
          {/* Report Type Selection */}
          <div className="form-section">
            <h3>Select Report Type</h3>
            <div className="report-type-cards">
              <div 
                className={`report-type-card ${reportForm.type === 'billing' ? 'active' : ''}`}
                onClick={() => setReportForm(prev => ({ ...prev, type: 'billing' }))}
              >
                <i className="fas fa-file-invoice-dollar"></i>
                <h4>Billing Report</h4>
                <p>Subscriber payments and billing information</p>
              </div>
              
              <div 
                className={`report-type-card ${reportForm.type === 'collection' ? 'active' : ''}`}
                onClick={() => setReportForm(prev => ({ ...prev, type: 'collection' }))}
              >
                <i className="fas fa-truck"></i>
                <h4>Collection Report</h4>
                <p>Waste collection activities and routes (includes regular and special pickups)</p>
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="form-section">
            <h3>Select Date Range</h3>
            
            {/* Quick Date Buttons */}
            <div className="quick-dates">
              <button type="button" className="quick-date-btn" onClick={() => setQuickRange('today')}>
                <i className="fas fa-calendar-day"></i> Today
              </button>
              <button type="button" className="quick-date-btn" onClick={() => setQuickRange('week')}>
                <i className="fas fa-calendar-week"></i> Last 7 Days
              </button>
              <button type="button" className="quick-date-btn" onClick={() => setQuickRange('month')}>
                <i className="fas fa-calendar-alt"></i> This Month
              </button>
              <button type="button" className="quick-date-btn" onClick={() => setQuickRange('lastMonth')}>
                <i className="fas fa-calendar"></i> Last Month
              </button>
            </div>

            {/* Custom Date Range */}
            <div className="date-inputs">
              <div className="date-input-group">
                <label><i className="fas fa-calendar-plus"></i> Start Date</label>
                <input
                  type="date"
                  value={reportForm.startDate}
                  onChange={(e) => setReportForm(prev => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="date-separator">to</div>
              <div className="date-input-group">
                <label><i className="fas fa-calendar-minus"></i> End Date</label>
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
          <div className="generate-section">
            <button 
              type="submit" 
              disabled={loading || !reportForm.startDate || !reportForm.endDate}
              className="generate-report-btn"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Generating Report...
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf"></i> Generate PDF Report
                </>
              )}
            </button>
            <p className="generate-note">
              <i className="fas fa-info-circle"></i> 
              Report will be downloaded as PDF automatically
            </p>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Reports;
