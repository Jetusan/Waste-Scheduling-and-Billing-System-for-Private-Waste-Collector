import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/BillingHistory.css';

const API_BASE_URL = 'http://localhost:5000/api';

const BillingHistory = () => {
  // Data states
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View states
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filter and search states
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    plan: 'All Plans',
    paymentMethod: 'All Methods',
    status: 'All Status',
    collector: 'All Collectors'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data from API
  const fetchBillingHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters from filters
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.plan !== 'All Plans') params.append('plan', filters.plan);
      if (filters.paymentMethod !== 'All Methods') params.append('paymentMethod', filters.paymentMethod);
      if (filters.status !== 'All Status') params.append('status', filters.status);
      if (filters.collector !== 'All Collectors') params.append('collector', filters.collector);

      const response = await axios.get(`${API_BASE_URL}/billing/history?${params.toString()}`);
      setTransactions(response.data);

    } catch (error) {
      console.error('Error fetching billing history:', error);
      setError('Failed to load billing history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchBillingHistory();
  }, []);

  // Get unique collectors
  const uniqueCollectors = [...new Set(transactions.map(t => t.details?.collectorName).filter(Boolean))];

  // Filter handlers
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Search handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      plan: 'All Plans',
      paymentMethod: 'All Methods',
      status: 'All Status',
      collector: 'All Collectors'
    });
    setSearchTerm('');
  };

  // Apply filters and search
  const filteredTransactions = transactions.filter(transaction => {
    // Search term filter
    if (searchTerm && !transaction.subscriber.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.id.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom && new Date(transaction.paymentDate) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(transaction.paymentDate) > new Date(filters.dateTo)) return false;

    // Plan filter
    if (filters.plan !== 'All Plans' && transaction.plan !== filters.plan) return false;

    // Payment method filter
    if (filters.paymentMethod !== 'All Methods' && transaction.paymentMethod !== filters.paymentMethod) return false;

    // Status filter
    if (filters.status !== 'All Status' && transaction.status !== filters.status) return false;

    // Collector filter
    if (filters.collector !== 'All Collectors' && transaction.details?.collectorName !== filters.collector) return false;

    return true;
  });

  // Export function
  const handleExport = () => {
    const exportData = filteredTransactions.map(t => ({
      'Transaction ID': t.id,
      'Invoice ID': t.invoiceId,
      'Subscriber': t.subscriber,
      'Plan': t.plan,
      'Amount': t.amount,
      'Payment Date': t.paymentDate,
      'Payment Method': t.paymentMethod,
      'Status': t.status,
      'Notes': t.notes,
      'Collector': t.details?.collectorName || 'N/A',
      'Reference Number': t.details?.referenceNumber || 'N/A'
    }));

    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <section className="billing-history-content">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h3>Loading billing history...</h3>
          <p>Please wait while we fetch your transaction history.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="billing-history-content">
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <h3>Error Loading Billing History</h3>
          <p>{error}</p>
          <button onClick={fetchBillingHistory} style={{ marginTop: '20px', padding: '10px 20px' }}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="billing-history-content">
      <div className="history-header">
        <h2>Transaction History</h2>
        <div className="header-actions">
          <button className="btn export" onClick={handleExport}>
            <i className="fas fa-file-export"></i> Export to CSV
          </button>
        </div>
      </div>

      <div className="history-filters">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search by subscriber, invoice ID, or transaction ID..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className="filter-group">
          <div className="date-filters">
            <div className="filter-item">
              <label>From Date</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-item">
              <label>To Date</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="filter-item">
            <label>Plan</label>
            <select
              name="plan"
              value={filters.plan}
              onChange={handleFilterChange}
            >
              <option>All Plans</option>
              <option>Household</option>
              <option>Mixed/Heavy</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Payment Method</label>
            <select
              name="paymentMethod"
              value={filters.paymentMethod}
              onChange={handleFilterChange}
            >
              <option>All Methods</option>
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Online Payment</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option>All Status</option>
              <option>Completed</option>
              <option>Pending</option>
              <option>Failed</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Collector</label>
            <select
              name="collector"
              value={filters.collector}
              onChange={handleFilterChange}
            >
              <option>All Collectors</option>
              {uniqueCollectors.map(collector => (
                <option key={collector}>{collector}</option>
              ))}
            </select>
          </div>

          <button className="btn clear-filters" onClick={clearFilters}>
            <i className="fas fa-times"></i> Clear Filters
          </button>
        </div>
      </div>

      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Invoice ID</th>
              <th>Subscriber</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Payment Date</th>
              <th>Payment Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map(transaction => (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>{transaction.invoiceId}</td>
                <td>{transaction.subscriber}</td>
                <td>{transaction.plan}</td>
                <td>{transaction.amount}</td>
                <td>{transaction.paymentDate}</td>
                <td>{transaction.paymentMethod}</td>
                <td>
                  <span className={`status-badge ${transaction.status.toLowerCase()}`}>
                    {transaction.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn view-details"
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setIsDetailModalOpen(true);
                    }}
                  >
                    <i className="fas fa-eye"></i> View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transaction Detail Modal */}
      {isDetailModalOpen && selectedTransaction && (
        <div className="modal-overlay">
          <div className="transaction-detail-modal">
            <div className="modal-header">
              <h3>Transaction Details</h3>
              <button 
                className="close-btn"
                onClick={() => setIsDetailModalOpen(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="transaction-info">
              <div className="info-section">
                <h4>Transaction Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Transaction ID</label>
                    <span>{selectedTransaction.id}</span>
                  </div>
                  <div className="info-item">
                    <label>Invoice ID</label>
                    <span>{selectedTransaction.invoiceId}</span>
                  </div>
                  <div className="info-item">
                    <label>Amount</label>
                    <span>{selectedTransaction.amount}</span>
                  </div>
                  <div className="info-item">
                    <label>Status</label>
                    <span className={`status-badge ${selectedTransaction.status.toLowerCase()}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Payment Method</label>
                    <span>{selectedTransaction.paymentMethod}</span>
                  </div>
                  <div className="info-item">
                    <label>Reference Number</label>
                    <span>{selectedTransaction.details?.referenceNumber || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Transaction Date</label>
                    <span>{selectedTransaction.paymentDate}</span>
                  </div>
                  <div className="info-item">
                    <label>Transaction Time</label>
                    <span>{selectedTransaction.details?.transactionTime || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>Subscriber Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Name</label>
                    <span>{selectedTransaction.subscriber}</span>
                  </div>
                  <div className="info-item">
                    <label>Plan</label>
                    <span>{selectedTransaction.plan}</span>
                  </div>
                  <div className="info-item">
                    <label>Address</label>
                    <span>{selectedTransaction.details?.address || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    <span>{selectedTransaction.details?.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    <span>{selectedTransaction.details?.phone || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Collection Schedule</label>
                    <span>{selectedTransaction.details?.collectionSchedule || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>Additional Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Collector Name</label>
                    <span>{selectedTransaction.details?.collectorName || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Notes</label>
                    <span>{selectedTransaction.notes || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn print"
                onClick={() => window.print()}
              >
                <i className="fas fa-print"></i> Print
              </button>
              <button 
                className="btn close"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BillingHistory; 