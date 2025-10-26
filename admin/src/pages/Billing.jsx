import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Billing.css';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const Billing = () => {
  // Data states
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
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

  // Helper functions (removed unused helpers)

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

      // (Removed) Fetch customer subscriptions - no longer used

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

  // Generate monthly invoices (for recurring billing cycles)
  const handleGenerateInvoices = async () => {
    const confirmGenerate = window.confirm(
      'This will generate monthly invoices for all active subscriptions. ' +
      'Note: New user subscriptions automatically create invoices. ' +
      'This is for recurring monthly billing. Continue?'
    );
    
    if (!confirmGenerate) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/billing/generate-monthly-invoices`);
      
      if (response.data) {
        alert(`Successfully generated ${response.data.invoices?.length || 0} recurring monthly invoices!`);
        // Refresh the data to show new invoices
        await fetchData();
      }
    } catch (error) {
      console.error('Error generating monthly invoices:', error);
      alert('Failed to generate monthly invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced status mapping for better filtering
  const getStatusCategory = (status, dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    const isOverdue = today > due;
    
    console.log('Status check:', { status, dueDate, today: today.toDateString(), due: due.toDateString(), isOverdue });
    
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'partially_paid':
        return 'Partially Paid';
      case 'unpaid':
        return isOverdue ? 'Overdue' : 'Unpaid';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return isOverdue ? 'Overdue' : 'Unpaid';
    }
  };

  // Filter invoices based on current filters
  const filteredInvoices = invoices.filter(invoice => {
    // Plan filter
    if (filters.plan !== 'All Plans' && invoice.plan !== filters.plan) return false;
    
    // Status filter with enhanced logic
    if (filters.status !== 'All Status') {
      const invoiceStatus = getStatusCategory(invoice.status, invoice.dueDate);
      if (invoiceStatus !== filters.status) return false;
    }
    
    // Date filter
    if (filters.date) {
      const invoiceDate = new Date(invoice.dueDate).toISOString().split('T')[0];
      if (invoiceDate !== filters.date) return false;
    }
    
    // Aging filter
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
            className="btn active"
            disabled
          >
            <i className="fas fa-file-invoice"></i> Invoices
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
          <option>Cancelled</option>
        </select>
        
        <input 
          type="date" 
          name="date" 
          value={filters.date} 
          onChange={handleFilterChange} 
        />

      </div>

      {/* Info Banner */}
      <div className="billing-info-banner">
        <div className="info-content">
          <h4><i className="fas fa-info-circle"></i> How Billing Works</h4>
          <p>
            <strong>Automatic Invoice Creation:</strong> When users subscribe via mobile app, invoices are automatically generated. 
            <strong>Your Role:</strong> Monitor subscriber billing information and track payment status.
            <strong>Days Overdue:</strong> Shows how many days invoices are past their due date to help prioritize collection efforts.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="billing-summary">
        <div className="summary-card">
          <h4>Total Invoices</h4>
          <span className="summary-number">{invoices.length}</span>
        </div>
        <div className="summary-card">
          <h4>Unpaid</h4>
          <span className="summary-number unpaid">
            {invoices.filter(inv => getStatusCategory(inv.status, inv.dueDate) === 'Unpaid').length}
          </span>
        </div>
        <div className="summary-card">
          <h4>Overdue</h4>
          <span className="summary-number overdue">
            {invoices.filter(inv => getStatusCategory(inv.status, inv.dueDate) === 'Overdue').length}
          </span>
        </div>
        <div className="summary-card">
          <h4>Paid</h4>
          <span className="summary-number paid">
            {invoices.filter(inv => getStatusCategory(inv.status, inv.dueDate) === 'Paid').length}
          </span>
        </div>
      </div>

      {/* Invoice Table */}
      <table className="billing-table">
        <thead>
          <tr>
            <th>Subscriber</th>
            <th>Plan</th>
            <th>Amount</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Days Overdue</th>
          </tr>
        </thead>
        <tbody>
          {filteredInvoices.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ color: '#666' }}>
                  <h4>No Invoices Found</h4>
                  <p>No invoices match your current filters. Try adjusting your search criteria.</p>
                  {invoices.length === 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <p><strong>Note:</strong> No invoices have been generated yet.</p>
                      <button 
                        onClick={() => window.location.reload()} 
                        style={{ 
                          padding: '10px 20px', 
                          backgroundColor: '#4CAF50', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '5px',
                          cursor: 'pointer',
                          marginTop: '10px'
                        }}
                      >
                        Refresh Data
                      </button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filteredInvoices.map(invoice => {
              const displayStatus = getStatusCategory(invoice.status, invoice.dueDate);
              const agingDays = calculateAging(invoice.dueDate);
              
              return (
                <tr key={invoice.id}>
                  <td>{invoice.subscriber || 'Unknown User'}</td>
                  <td>{invoice.plan || 'Unknown Plan'}</td>
                  <td>
                    ₱{typeof invoice.amount === 'number' ? invoice.amount.toLocaleString() : invoice.amount}
                    {invoice.lateFee && invoice.lateFee > 0 && (
                      <span className="late-fee"> (+₱{typeof invoice.lateFee === 'number' ? invoice.lateFee.toLocaleString() : invoice.lateFee})</span>
                    )}
                  </td>
                  <td>
                    {new Date(invoice.dueDate).toLocaleDateString()}
                    {agingDays > 0 && (
                      <small style={{ display: 'block', color: '#e74c3c' }}>
                        {agingDays} days overdue
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${displayStatus.toLowerCase().replace(' ', '-')}`}>
                      {displayStatus}
                    </span>
                  </td>
                  <td>
                    <span className={agingDays > 0 ? 'aging-overdue' : 'aging-current'}>
                      {agingDays > 0 ? `${agingDays} days` : 'Current'}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </section>
  );
};

export default Billing;