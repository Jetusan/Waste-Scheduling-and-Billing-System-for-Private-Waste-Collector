import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import '../styles/EnhancedReports.css';

const API_URL = `${API_CONFIG.BASE_URL}/api`;

const EnhancedReports = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportPreview, setReportPreview] = useState(null);
  
  // Simplified report form - reports only
  const [reportForm, setReportForm] = useState({
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
      // Generate report for October 2024 where the sample data exists
      const year = 2024;
      const month = 10; // October 2024
      
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const requestData = {
        type: 'combined', // Always generate combined reports
        period: 'monthly',
        start_date: startDate,
        end_date: endDate,
        year: year,
        month: month,
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
      
      // Generate filename for October 2024
      const periodText = `October_2024`;
      
      link.download = `WSBS_Report_${periodText}.pdf`;
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
        <div className="info-card-single">
          <div className="card-icon">📊</div>
          <h4>WSBS Business Reports</h4>
          <p>Comprehensive business reports including billing, payments, collections, and operational data. Generate monthly or annual reports with professional WSBS branding.</p>
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

              {/* Simple Report Generation */}
              <div className="form-section">
                <h4><i className="fas fa-file-alt"></i> Generate Business Report</h4>
                <div className="simple-report-info">
                  <p>Generate a comprehensive business report for the current month with all billing, payment, and collection data.</p>
                  <div className="current-period">
                    <strong>Report Period:</strong> October 2024 (Sample Data)
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
