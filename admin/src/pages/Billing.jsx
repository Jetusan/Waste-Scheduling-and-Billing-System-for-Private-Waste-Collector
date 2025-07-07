import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Billing.css';

const API_BASE_URL = 'http://localhost:5000/api';

const Billing = () => {
  // Data states
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View states
  const [activeView, setActiveView] = useState('invoices'); // ['invoices', 'aging', 'history']
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Cash',
    reference: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter states
  const [filters, setFilters] = useState({
    plan: 'All Plans',
    status: 'All Status',
    date: '',
    aging: 'all' // ['all', '30', '60', '90']
  });

  // Add new state for export modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRange, setExportRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'all' // 'all', 'monthly', 'yearly', 'custom'
  });

  // Helper functions
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const calculateAging = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const days = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      console.log('🔄 Fetching billing data...');
      setLoading(true);
      setError(null);

      // Fetch subscription plans
      console.log('📋 Fetching subscription plans...');
      const plansResponse = await axios.get(`${API_BASE_URL}/billing/subscription-plans`);
      console.log('✅ Subscription plans:', plansResponse.data);
      setSubscriptionPlans(plansResponse.data);

      // Fetch customer subscriptions
      console.log('📋 Fetching customer subscriptions...');
      const subscriptionsResponse = await axios.get(`${API_BASE_URL}/billing/subscriptions`);
      console.log('✅ Customer subscriptions:', subscriptionsResponse.data);
      setCustomers(subscriptionsResponse.data);

      // Fetch invoices
      console.log('📋 Fetching invoices...');
      const invoicesResponse = await axios.get(`${API_BASE_URL}/billing/invoices`);
      console.log('✅ Invoices:', invoicesResponse.data);
      setInvoices(invoicesResponse.data);

    } catch (error) {
      console.error('❌ Error fetching billing data:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError(`Failed to load billing data: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    console.log('🚀 Billing component mounted');
    fetchData();
  }, []);

  // Payment handling
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      const paymentData = {
        invoice_id: selectedInvoice.invoice_id || selectedInvoice.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        payment_date: paymentForm.date,
        reference_number: paymentForm.reference || `PAY-${Date.now()}`,
        notes: `Payment for invoice ${selectedInvoice.id}`
      };

      await axios.post(`${API_BASE_URL}/billing/payments`, paymentData);
      
      // Refresh data
      await fetchData();
      
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: '',
        method: 'Cash',
        reference: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    }
  };

  // Invoice actions
  const handleDownload = (invoice) => {
    // In a real app, this would generate a PDF
    console.log('Downloading invoice:', invoice.id);
  };

  const handlePrint = (invoice) => {
    // In a real app, this would open the print dialog
    window.print();
  };

  const handleExportToCSV = () => {
    let filteredForExport = [...filteredInvoices];

    // Filter based on date range
    if (exportRange.type !== 'all') {
      const start = new Date(exportRange.startDate);
      const end = new Date(exportRange.endDate);
      
      filteredForExport = filteredForExport.filter(inv => {
        const invDate = new Date(inv.generatedDate);
        return invDate >= start && invDate <= end;
      });
    }

    // Generate CSV content
    const headers = ['Invoice ID', 'Subscriber', 'Plan', 'Amount', 'Due Date', 'Status', 'Payment History'];
    const csvContent = [
      headers.join(','),
      ...filteredForExport.map(inv => [
        inv.id,
        inv.subscriber,
        inv.plan,
        inv.amount,
        inv.dueDate,
        inv.status,
        inv.paymentHistory ? inv.paymentHistory.map(p => `${p.date}:${p.amount}`).join(';') : ''
      ].join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = exportRange.type === 'all' 
      ? 'all_invoices.csv'
      : `invoices_${exportRange.startDate}_to_${exportRange.endDate}.csv`;
    a.download = fileName;
    a.click();
    setIsExportModalOpen(false);
  };

  const handleExportRangeChange = (type) => {
    const today = new Date();
    let startDate = today.toISOString().split('T')[0];
    let endDate = today.toISOString().split('T')[0];

    switch (type) {
      case 'monthly':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString().split('T')[0];
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1)
          .toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), 11, 31)
          .toISOString().split('T')[0];
        break;
      default:
        break;
    }

    setExportRange({ startDate, endDate, type });
  };

  // Late fee calculation
  const calculateLateFees = async (invoiceId) => {
    try {
      const dueDate = new Date(selectedInvoice.dueDate);
      const today = new Date();
      const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysLate > 0) {
        const lateFees = daysLate * 50; // ₱50 per day late fee
        
        await axios.put(`${API_BASE_URL}/billing/invoices/${invoiceId}/late-fees`, {
          lateFees: lateFees
        });
        
        // Refresh data
        await fetchData();
        alert(`Added ₱${lateFees} late fees to invoice ${selectedInvoice.id}`);
      }
    } catch (error) {
      console.error('Error adding late fees:', error);
      alert('Failed to add late fees. Please try again.');
    }
  };

  // Filter handlers
  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Filter invoices based on current filters
  const filteredInvoices = invoices.filter(invoice => {
    if (filters.plan !== 'All Plans' && invoice.plan !== filters.plan) return false;
    if (filters.status !== 'All Status' && invoice.status !== filters.status) return false;
    if (filters.date && invoice.dueDate !== filters.date) return false;
    if (filters.aging !== 'all') {
      const agingDays = calculateAging(invoice.dueDate);
      const agingFilter = parseInt(filters.aging);
      if (agingFilter === 30 && (agingDays <= 0 || agingDays > 30)) return false;
      if (agingFilter === 60 && (agingDays <= 30 || agingDays > 60)) return false;
      if (agingFilter === 90 && (agingDays <= 60 || agingDays > 90)) return false;
      if (agingFilter === 91 && agingDays <= 90) return false;
    }
    return true;
  });

  console.log('📊 Current state:', { loading, error, invoices: invoices.length, subscriptionPlans: subscriptionPlans.length });

  if (loading) {
    return (
      <section className="billing-content">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h3>Loading billing data...</h3>
          <p>Please wait while we fetch your billing information.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="billing-content">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h3>Error Loading Billing Data</h3>
          <p>{error}</p>
          <button onClick={fetchData} style={{ marginTop: '20px', padding: '10px 20px' }}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="billing-content">
      <div className="billing-header">
        <h2>Billing Management</h2>
        <div className="view-controls">
          <button 
            className={`btn ${activeView === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveView('invoices')}
          >
            <i className="fas fa-file-invoice"></i> Invoices
          </button>
          <button 
            className={`btn ${activeView === 'aging' ? 'active' : ''}`}
            onClick={() => setActiveView('aging')}
          >
            <i className="fas fa-clock"></i> Aging Report
          </button>
          <button 
            className="btn export"
            onClick={() => setIsExportModalOpen(true)}
          >
            <i className="fas fa-file-export"></i> Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="billing-filters">
        <select 
          name="plan" 
          value={filters.plan} 
          onChange={handleFilterChange}
        >
          <option>All Plans</option>
          {subscriptionPlans.map(plan => (
            <option key={plan.plan_id}>{plan.plan_name}</option>
          ))}
        </select>
        
        <select 
          name="status" 
          value={filters.status} 
          onChange={handleFilterChange}
        >
          <option>All Status</option>
          <option>Paid</option>
          <option>Partially Paid</option>
          <option>Unpaid</option>
          <option>Overdue</option>
        </select>
        
        <input 
          type="date" 
          name="date" 
          value={filters.date} 
          onChange={handleFilterChange} 
        />

        {activeView === 'aging' && (
          <select
            name="aging"
            value={filters.aging}
            onChange={handleFilterChange}
          >
            <option value="all">All Aging</option>
            <option value="30">1-30 Days</option>
            <option value="60">31-60 Days</option>
            <option value="90">61-90 Days</option>
            <option value="91">90+ Days</option>
          </select>
        )}
      </div>

      {/* Invoice Table */}
      <table className="billing-table">
        <thead>
          <tr>
            <th>Invoice ID</th>
            <th>Subscriber</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            {activeView === 'aging' && <th>Days Overdue</th>}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.map(invoice => (
            <tr key={invoice.id}>
              <td>{invoice.id}</td>
              <td>{invoice.subscriber}</td>
              <td>{invoice.plan}</td>
              <td>
                {invoice.amount}
                {invoice.lateFee && (
                  <span className="late-fee"> (+{invoice.lateFee})</span>
                )}
              </td>
              <td>{invoice.dueDate}</td>
              <td>
                <span className={`status-badge ${invoice.status.toLowerCase().replace(' ', '-')}`}>
                  {invoice.status}
                </span>
              </td>
              {activeView === 'aging' && (
                <td>
                  {calculateAging(invoice.dueDate)}
                </td>
              )}
              <td className="actions">
                <div className="action-buttons-group">
                  <button 
                    className="action-btn view"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setIsPaymentModalOpen(true);
                    }}
                    title="Record Payment"
                  >
                    <i className="fas fa-money-bill-wave"></i>
                    <span>Record Payment</span>
                  </button>
                  <button 
                    className="action-btn download"
                    onClick={() => handleDownload(invoice)}
                    title="Download Invoice"
                  >
                    <i className="fas fa-download"></i>
                    <span>Download</span>
                  </button>
                  <button 
                    className="action-btn print"
                    onClick={() => handlePrint(invoice)}
                    title="Print Invoice"
                  >
                    <i className="fas fa-print"></i>
                    <span>Print</span>
                  </button>
                  {invoice.status !== 'Paid' && (
                    <button 
                      className="action-btn remind"
                      onClick={() => calculateLateFees(invoice.id)}
                      title="Add Late Fee"
                    >
                      <i className="fas fa-exclamation-circle"></i>
                      <span>Add Late Fee</span>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="modal-overlay">
          <div className="payment-modal">
            <h3>Record Payment for Invoice {selectedInvoice.id}</h3>
            <div className="invoice-summary">
              <p>Subscriber: {selectedInvoice.subscriber}</p>
              <p>Amount Due: {selectedInvoice.amount}</p>
              <p>Due Date: {selectedInvoice.dueDate}</p>
            </div>
            
            <h4>Payment History</h4>
            {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 ? (
              <table className="payment-history">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.paymentHistory.map((payment, idx) => (
                    <tr key={idx}>
                      <td>{payment.date}</td>
                      <td>{payment.amount}</td>
                      <td>{payment.method}</td>
                      <td>{payment.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No payment history</p>
            )}

            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={e => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={e => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Check</option>
                  <option>Online Payment</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={e => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div className="export-modal">
            <h3>Export Invoices</h3>
            <div className="export-options">
              <div className="export-type-buttons">
                <button 
                  className={`export-type-btn ${exportRange.type === 'all' ? 'active' : ''}`}
                  onClick={() => handleExportRangeChange('all')}
                >
                  All Invoices
                </button>
                <button 
                  className={`export-type-btn ${exportRange.type === 'monthly' ? 'active' : ''}`}
                  onClick={() => handleExportRangeChange('monthly')}
                >
                  Current Month
                </button>
                <button 
                  className={`export-type-btn ${exportRange.type === 'yearly' ? 'active' : ''}`}
                  onClick={() => handleExportRangeChange('yearly')}
                >
                  Current Year
                </button>
                <button 
                  className={`export-type-btn ${exportRange.type === 'custom' ? 'active' : ''}`}
                  onClick={() => handleExportRangeChange('custom')}
                >
                  Custom Range
                </button>
              </div>

              {exportRange.type === 'custom' && (
                <div className="date-range-picker">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={exportRange.startDate}
                      onChange={(e) => setExportRange(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={exportRange.endDate}
                      onChange={(e) => setExportRange(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="export-btn"
                onClick={handleExportToCSV}
              >
                Export to CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Billing;