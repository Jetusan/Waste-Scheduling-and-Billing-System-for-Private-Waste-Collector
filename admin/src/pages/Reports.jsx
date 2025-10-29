import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import ReportVisualization from '../components/ReportVisualization';
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

const getThisWeekStart = () => {
  const today = new Date();
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  return firstDay.toISOString().split('T')[0];
};

const getThisWeekEnd = () => {
  const today = new Date();
  const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 7));
  return lastDay.toISOString().split('T')[0];
};

const getThisMonthStart = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
};

const getThisMonthEnd = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
};

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [generatedReportData, setGeneratedReportData] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [plans, setPlans] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [routes, setRoutes] = useState([]);
  
  // Enhanced report form with filters
  const [reportForm, setReportForm] = useState({
    type: 'billing',
    startDate: getThisMonthStart(),
    endDate: getThisMonthEnd(),
    format: 'pdf',
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

  // Map reportFocus to backend type
  const [reportFocus, setReportFocus] = useState('billing-payment');

  // Map frontend reportFocus to backend type
  const reportFocusToType = {
    'regular-pickup': 'regular-pickup',
    'billing-payment': 'billing-payment',
    'special-pickup': 'special-pickup',
  };

  // Generate report
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!reportForm.startDate || !reportForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare the request data
      const requestData = {
        type: reportFocusToType[reportFocus] || reportFocus,
        period: 'custom',
        generated_by: 'Admin User',
        format: 'pdf',
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
          type: reportData.type || reportData.reportType,
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
      const reportType = reportData.type || reportData.reportType || 'report';
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
        startDate = getThisWeekStart();
        endDate = getThisWeekEnd();
        break;
      case 'month':
        startDate = getThisMonthStart();
        endDate = getThisMonthEnd();
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

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setReportForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch dropdown data when modal opens
  useEffect(() => {
    if (showModal) {
      const fetchDropdownData = async () => {
        try {
          // Fetch all dropdown data in parallel
          const [
            barangaysRes,
            plansRes,
            collectorsRes,
            wasteTypesRes,
            teamsRes,
            trucksRes,
            routesRes
          ] = await Promise.all([
            axios.get(`${API_URL}/reports/barangays`),
            axios.get(`${API_URL}/reports/plans`),
            axios.get(`${API_URL}/reports/collectors`),
            axios.get(`${API_URL}/reports/waste-types`),
            axios.get(`${API_URL}/reports/teams`),
            axios.get(`${API_URL}/reports/trucks`),
            axios.get(`${API_URL}/reports/routes`)
          ]);

          setBarangays(barangaysRes.data);
          setPlans(plansRes.data);
          setCollectors(collectorsRes.data);
          setWasteTypes(wasteTypesRes.data);
          setTeams(teamsRes.data);
          setTrucks(trucksRes.data);
          setRoutes(routesRes.data);

        } catch (err) {
          console.error('Error fetching dropdown data:', err);
        }
      };
      fetchDropdownData();
    }
  }, [showModal]);

  // When reportFocus changes, update reportForm.type accordingly
  useEffect(() => {
    setReportForm(prev => ({
      ...prev,
      type: reportFocusToType[reportFocus] || 'billing-payment',
    }));
  }, [reportFocus, reportFocusToType]);

  return (
    <section className="enhanced-reports-page">
      <div className="reports-header">
        <h2><i className="fas fa-chart-bar"></i> Reports</h2>
        <p className="reports-subtitle">Generate comprehensive reports for your waste collection business</p>
      </div>

      {/* Report Actions */}
      <div className="report-actions-bar">
        <button 
          className="generate-report-btn"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus"></i> Generate New Report
        </button>
      </div>

      {/* Generated Report Visualization */}
      {generatedReportData && (
        <section className="report-output-section">
          <div className="report-header">
            <h2>Generated Report: {generatedReportData.type}</h2>
            <div className="report-actions">
              <button 
                className="action-btn" 
                onClick={() => downloadReport(generatedReportData)}
              >
                <i className="fas fa-download"></i> Download PDF
              </button>
              <button 
                className="action-btn"
                onClick={() => setGeneratedReportData(null)}
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

      {/* Enhanced Report Generation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content enhanced-modal">
            <div className="modal-header">
              <h3>Generate New Report</h3>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="generate-report-form">
              
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

              {/* Date Range Selection */}
              <div className="form-section">
                <h4>Select Date Range</h4>
                
                {/* Quick Date Buttons */}
                <div className="quick-dates">
                  <button type="button" className="quick-date-btn" onClick={() => setQuickRange('today')}>
                    <i className="fas fa-calendar-day"></i> Today
                  </button>
                  <button type="button" className="quick-date-btn" onClick={() => setQuickRange('week')}>
                    <i className="fas fa-calendar-week"></i> This Week
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
                      name="startDate"
                      value={reportForm.startDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="date-separator">to</div>
                  <div className="date-input-group">
                    <label><i className="fas fa-calendar-minus"></i> End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={reportForm.endDate}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Regular Pickup Filters */}
              {reportFocus === 'regular-pickup' && (
                <div className="form-section">
                  <h4>🚛 Collection Filters</h4>
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
                  <h4>💰 Billing & Payment Filters</h4>
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
                      <label>Payment Status</label>
                      <select name="paymentStatus" value={reportForm.paymentStatus} onChange={handleFormChange}>
                        <option value="all">All Payments</option>
                        <option value="paid">💰 Paid</option>
                        <option value="unpaid">⏳ Unpaid</option>
                        <option value="overdue">🔴 Overdue</option>
                        <option value="partially_paid">🟡 Partially Paid</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Payment Method</label>
                      <select name="paymentMethod" value={reportForm.paymentMethod} onChange={handleFormChange}>
                        <option value="">All Methods</option>
                        <option value="cash">Cash</option>
                        <option value="gcash">GCash</option>
                        <option value="bank_transfer">Bank Transfer</option>
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

              {/* Special Pickup Filters */}
              {reportFocus === 'special-pickup' && (
                <div className="form-section">
                  <h4>🚛 Special Pickup Filters</h4>
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
                      <i className="fas fa-file-pdf"></i> Generate Report
                    </>
                  )}
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