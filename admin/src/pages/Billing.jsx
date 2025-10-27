import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Billing.css';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const Billing = () => {
  // Data states
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLedger, setUserLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState(null);

  // View states
  const [activeView, setActiveView] = useState('users'); // ['users', 'ledger']
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Cash',
    reference: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'All Status',
    barangay: 'All Barangays'
  });

  // Fetch users with billing history
  const fetchUsers = async () => {
    try {
      console.log('🔄 Fetching users with billing history...');
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_BASE_URL}/billing/users-with-history`);
      console.log('✅ Users with billing history:', response.data);
      setUsers(response.data);

    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setError(`Failed to load users: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user ledger
  const fetchUserLedger = async (userId) => {
    try {
      console.log(`🔄 Fetching ledger for user ${userId}...`);
      setLedgerLoading(true);

      const response = await axios.get(`${API_BASE_URL}/billing/user-ledger/${userId}`);
      console.log('✅ User ledger:', response.data);
      setUserLedger(response.data);

    } catch (error) {
      console.error('❌ Error fetching user ledger:', error);
      setError(`Failed to load user ledger: ${error.response?.data?.error || error.message}`);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    console.log('🚀 Billing component mounted');
    fetchUsers();
  }, []);

  // Handle user selection
  const handleUserSelect = async (user) => {
    setSelectedUser(user);
    setActiveView('ledger');
    await fetchUserLedger(user.user_id);
  };

  // Handle back to users list
  const handleBackToUsers = () => {
    setActiveView('users');
    setSelectedUser(null);
    setUserLedger([]);
  };

  // Payment handling
  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const paymentData = {
        user_id: selectedUser.user_id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        payment_date: paymentForm.date,
        reference_number: paymentForm.reference || `PAY-${Date.now()}`,
        notes: `Manual payment entry`
      };

      await axios.post(`${API_BASE_URL}/billing/manual-payment`, paymentData);
      
      // Refresh ledger
      await fetchUserLedger(selectedUser.user_id);
      
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

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = filters.search === '' || 
      user.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.user_id.toString().includes(filters.search);
    
    const matchesStatus = filters.status === 'All Status' || 
      user.account_status === filters.status;
    
    const matchesBarangay = filters.barangay === 'All Barangays' || 
      user.barangay_name === filters.barangay;

    return matchesSearch && matchesStatus && matchesBarangay;
  });

  // Calculate ledger totals
  const calculateLedgerTotals = () => {
    let totalDebits = 0;
    let totalCredits = 0;
    let balance = 0;

    userLedger.forEach(entry => {
      if (entry.debit) totalDebits += parseFloat(entry.debit);
      if (entry.credit) totalCredits += parseFloat(entry.credit);
      balance = parseFloat(entry.balance);
    });

    return { totalDebits, totalCredits, balance };
  };

  if (loading) {
    return (
      <div className="billing-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="billing-container">
        <div className="error-state">
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={fetchUsers} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="billing-container">
      {/* Header */}
      <div className="billing-header">
        <div className="header-left">
          {activeView === 'ledger' && (
            <button onClick={handleBackToUsers} className="back-btn">
              ← Back to Users
            </button>
          )}
          <h2>
            {activeView === 'users' ? 'Billing Management' : `${selectedUser?.full_name} - Ledger`}
          </h2>
          <p className="header-subtitle">
            {activeView === 'users' 
              ? 'Manage user accounts and billing history' 
              : `User ID: ${selectedUser?.user_id} | ${selectedUser?.barangay_name}`
            }
          </p>
        </div>
        <div className="header-actions">
          {activeView === 'ledger' && (
            <button 
              onClick={() => setIsPaymentModalOpen(true)}
              className="btn btn-primary"
            >
              + Add Payment
            </button>
          )}
          <button onClick={activeView === 'users' ? fetchUsers : () => fetchUserLedger(selectedUser.user_id)} className="btn btn-secondary">
            🔄 Refresh
          </button>
        </div>
      </div>

      {activeView === 'users' ? (
        // Users List View
        <>
          {/* Filters */}
          <div className="billing-filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="filter-select"
              >
                <option value="All Status">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                value={filters.barangay}
                onChange={(e) => setFilters(prev => ({ ...prev, barangay: e.target.value }))}
                className="filter-select"
              >
                <option value="All Barangays">All Barangays</option>
                {[...new Set(users.map(u => u.barangay_name))].map(barangay => (
                  <option key={barangay} value={barangay}>{barangay}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="billing-content">
            <div className="table-container">
              <table className="billing-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Barangay</th>
                    <th>Status</th>
                    <th>Total Invoices</th>
                    <th>Outstanding Balance</th>
                    <th>Last Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.user_id}>
                      <td>#{user.user_id}</td>
                      <td className="user-name">
                        <div>
                          <strong>{user.full_name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </td>
                      <td>{user.barangay_name}</td>
                      <td>
                        <span className={`status-badge ${user.account_status}`}>
                          {user.account_status}
                        </span>
                      </td>
                      <td>{user.total_invoices || 0}</td>
                      <td className={`amount ${parseFloat(user.outstanding_balance || 0) > 0 ? 'negative' : 'positive'}`}>
                        ₱{parseFloat(user.outstanding_balance || 0).toFixed(2)}
                      </td>
                      <td>{user.last_payment_date || 'No payments'}</td>
                      <td>
                        <button
                          onClick={() => handleUserSelect(user)}
                          className="btn btn-sm btn-primary"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // User Ledger View
        <div className="billing-content">
          {ledgerLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading user ledger...</p>
            </div>
          ) : (
            <>
              {/* Ledger Summary */}
              <div className="ledger-summary">
                <div className="summary-card">
                  <h4>Total Debits</h4>
                  <p className="amount negative">₱{calculateLedgerTotals().totalDebits.toFixed(2)}</p>
                </div>
                <div className="summary-card">
                  <h4>Total Credits</h4>
                  <p className="amount positive">₱{calculateLedgerTotals().totalCredits.toFixed(2)}</p>
                </div>
                <div className="summary-card">
                  <h4>Current Balance</h4>
                  <p className={`amount ${calculateLedgerTotals().balance > 0 ? 'negative' : 'positive'}`}>
                    ₱{Math.abs(calculateLedgerTotals().balance).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="table-container">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Reference</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLedger.map((entry, index) => (
                      <tr key={index}>
                        <td>{new Date(entry.date).toLocaleDateString()}</td>
                        <td>{entry.description}</td>
                        <td>{entry.reference}</td>
                        <td className="amount negative">
                          {entry.debit ? `₱${parseFloat(entry.debit).toFixed(2)}` : '-'}
                        </td>
                        <td className="amount positive">
                          {entry.credit ? `₱${parseFloat(entry.credit).toFixed(2)}` : '-'}
                        </td>
                        <td className={`amount ${parseFloat(entry.balance) > 0 ? 'negative' : 'positive'}`}>
                          ₱{Math.abs(parseFloat(entry.balance)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Record Payment - {selectedUser?.full_name}</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
