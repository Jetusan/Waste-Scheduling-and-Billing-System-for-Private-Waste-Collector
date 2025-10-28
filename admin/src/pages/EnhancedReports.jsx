import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import '../styles/EnhancedReports.css';

const API_URL = `${API_CONFIG.BASE_URL}/api`;

const EnhancedReports = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  
  // Enhanced report form with your requested structure
  const [reportForm, setReportForm] = useState({
    type: 'financial', // financial, collection, combined
    period: 'monthly', // monthly, annual
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    startDate: '',
    endDate: '',
    customRange: false
  });

  // Get current date info
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate report with enhanced structure
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let startDate, endDate;
      
      if (reportForm.customRange) {
        startDate = reportForm.startDate;
        endDate = reportForm.endDate;
      } else if (reportForm.period === 'monthly') {
        // Monthly report
        startDate = `${reportForm.year}-${String(reportForm.month).padStart(2, '0')}-01`;
        const lastDay = new Date(reportForm.year, reportForm.month, 0).getDate();
        endDate = `${reportForm.year}-${String(reportForm.month).padStart(2, '0')}-${lastDay}`;
      } else {
        // Annual report
        startDate = `${reportForm.year}-01-01`;
        endDate = `${reportForm.year}-12-31`;
      }

      const requestData = {
        type: reportForm.type,
        period: reportForm.period,
        start_date: startDate,
        end_date: endDate,
        year: reportForm.year,
        month: reportForm.month,
        generated_by: 'Admin User',
        format: 'enhanced'
      };

      console.log('Generating enhanced report:', requestData);

      const response = await axios.post(`${API_URL}/reports/generate-enhanced`, requestData);
      
      if (response.data && response.data.report) {
        setReportPreview(response.data.report);
        // Auto-download PDF
        await downloadEnhancedPDF(response.data.report);
      }
      
      setShowModal(false);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Download enhanced PDF with WSBS branding
  const downloadEnhancedPDF = async (reportData) => {
    try {
      const pdfResponse = await axios.post(`${API_URL}/reports/generate-enhanced-pdf`, {
        reportData: reportData,
        branding: {
          systemName: 'WSBS Management',
          logo: true,
          generatedDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename based on report type and period
      const periodText = reportForm.period === 'monthly' 
        ? `${months[reportForm.month - 1]}_${reportForm.year}`
        : `Annual_${reportForm.year}`;
      
      link.download = `WSBS_${reportData.type}_Report_${periodText}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <section className="enhanced-reports-content">
      <div className="reports-header">
        <div className="header-content">
          <div className="wsbs-branding">
            <div className="logo-section">
              <div className="wsbs-logo">🗑️</div>
              <div className="system-info">
                <h1>WSBS Management</h1>
                <p>Waste Scheduling and Billing System</p>
              </div>
            </div>
          </div>
          <button 
            className="btn generate-btn"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-file-alt"></i> Generate Report
          </button>
        </div>
      </div>

      <div className="reports-info">
        <div className="info-grid">
          <div className="info-card financial">
            <div className="card-icon">💰</div>
            <h4>Financial Reports</h4>
            <p>Billing, payments, and revenue analysis with detailed transaction records</p>
          </div>
          
          <div className="info-card collection">
            <div className="card-icon">🚛</div>
            <h4>Collection Reports</h4>
            <p>Waste collection activities, routes, and operational performance</p>
          </div>
          
          <div className="info-card combined">
            <div className="card-icon">📊</div>
            <h4>Combined Reports</h4>
            <p>Comprehensive overview including both financial and collection data</p>
          </div>
        </div>
      </div>

      {/* Enhanced Report Generation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content enhanced-report-modal">
            <div className="modal-header">
              <div className="modal-title">
                <div className="wsbs-mini-logo">🗑️</div>
                <div>
                  <h3>Generate WSBS Report</h3>
                  <p>Professional business reports with WSBS branding</p>
                </div>
              </div>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="enhanced-form">
              {/* Report Type Selection */}
              <div className="form-section">
                <h4><i className="fas fa-chart-bar"></i> Report Type</h4>
                <div className="report-type-grid">
                  <label className={`report-type-card ${reportForm.type === 'financial' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="financial"
                      checked={reportForm.type === 'financial'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <div className="card-content">
                      <div className="card-icon">💰</div>
                      <h5>Financial Report</h5>
                      <p>Payments, billing, revenue</p>
                    </div>
                  </label>
                  
                  <label className={`report-type-card ${reportForm.type === 'collection' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="collection"
                      checked={reportForm.type === 'collection'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <div className="card-content">
                      <div className="card-icon">🚛</div>
                      <h5>Collection Report</h5>
                      <p>Waste collection activities</p>
                    </div>
                  </label>
                  
                  <label className={`report-type-card ${reportForm.type === 'combined' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="combined"
                      checked={reportForm.type === 'combined'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <div className="card-content">
                      <div className="card-icon">📊</div>
                      <h5>Combined Report</h5>
                      <p>Complete overview</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Period Selection */}
              <div className="form-section">
                <h4><i className="fas fa-calendar"></i> Report Period</h4>
                <div className="period-selection">
                  <label className={`period-option ${reportForm.period === 'monthly' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="period"
                      value="monthly"
                      checked={reportForm.period === 'monthly'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, period: e.target.value, customRange: false }))}
                    />
                    <span>📅 Monthly Report</span>
                  </label>
                  
                  <label className={`period-option ${reportForm.period === 'annual' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="period"
                      value="annual"
                      checked={reportForm.period === 'annual'}
                      onChange={(e) => setReportForm(prev => ({ ...prev, period: e.target.value, customRange: false }))}
                    />
                    <span>📆 Annual Report</span>
                  </label>
                  
                  <label className={`period-option ${reportForm.customRange ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="period"
                      value="custom"
                      checked={reportForm.customRange}
                      onChange={(e) => setReportForm(prev => ({ ...prev, customRange: true }))}
                    />
                    <span>📋 Custom Range</span>
                  </label>
                </div>
              </div>

              {/* Date Selection */}
              <div className="form-section">
                <h4><i className="fas fa-clock"></i> Date Selection</h4>
                
                {!reportForm.customRange ? (
                  <div className="date-selectors">
                    {/* Year Selection */}
                    <div className="selector-group">
                      <label>Year</label>
                      <select
                        value={reportForm.year}
                        onChange={(e) => setReportForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = currentYear - i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                    
                    {/* Month Selection (only for monthly reports) */}
                    {reportForm.period === 'monthly' && (
                      <div className="selector-group">
                        <label>Month</label>
                        <select
                          value={reportForm.month}
                          onChange={(e) => setReportForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                        >
                          {months.map((month, index) => (
                            <option key={index + 1} value={index + 1}>{month}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="custom-date-range">
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
                )}
              </div>

              {/* Report Preview Info */}
              <div className="form-section preview-section">
                <h4><i className="fas fa-eye"></i> Report Preview</h4>
                <div className="preview-info">
                  <div className="preview-item">
                    <strong>System:</strong> WSBS Management
                  </div>
                  <div className="preview-item">
                    <strong>Type:</strong> {reportForm.type.charAt(0).toUpperCase() + reportForm.type.slice(1)} Report
                  </div>
                  <div className="preview-item">
                    <strong>Period:</strong> 
                    {reportForm.customRange 
                      ? `${reportForm.startDate} to ${reportForm.endDate}`
                      : reportForm.period === 'monthly' 
                        ? `${months[reportForm.month - 1]} ${reportForm.year}`
                        : `Annual ${reportForm.year}`
                    }
                  </div>
                  <div className="preview-item">
                    <strong>Format:</strong> Professional PDF with WSBS branding
                  </div>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-cancel"
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-generate"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Generating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download"></i> Generate & Download
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview (if available) */}
      {reportPreview && (
        <div className="report-preview-section">
          <h3>Generated Report Preview</h3>
          <div className="preview-content">
            <div className="report-header-preview">
              <div className="wsbs-header">
                <div className="logo">🗑️</div>
                <div className="system-name">WSBS Management</div>
                <div className="report-date">As of {new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <p>Report has been generated and downloaded as PDF.</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default EnhancedReports;
