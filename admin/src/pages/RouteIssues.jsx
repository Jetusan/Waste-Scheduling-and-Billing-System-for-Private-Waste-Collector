import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';
import './RouteIssues.css';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

export default function RouteIssues() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedIssues, setSelectedIssues] = useState(new Set());
  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    search: '',
    dateRange: 'all'
  });
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'kanban'

  const token = useMemo(() => sessionStorage.getItem('adminToken'), []);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE_URL}/collector/issues/list`, { headers: authHeaders });
      setIssues(response.data?.issues || []);
    } catch (e) {
      console.error('Failed to load route issues:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadIssues();
    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(loadIssues, 30000);
    return () => clearInterval(interval);
  }, [loadIssues]);

  const handleApprove = async (issueId) => {
    try {
      setSaving(true);
      setError('');
      await axios.post(
        `${API_BASE_URL}/collector/issues/${issueId}/approve`,
        { resolution_notes: resolutionNotes },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      await loadIssues();
      setSelectedIssue(null);
      setResolutionNotes('');
      setSuccess('Issue approved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Failed to approve issue:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (issueId) => {
    try {
      setSaving(true);
      setError('');
      await axios.post(
        `${API_BASE_URL}/collector/issues/${issueId}/reject`,
        { resolution_notes: resolutionNotes },
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      await loadIssues();
      setSelectedIssue(null);
      setResolutionNotes('');
      setSuccess('Issue rejected successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Failed to reject issue:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIssues.size === 0) {
      setError('Please select issues to perform bulk action');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const promises = Array.from(selectedIssues).map(issueId => 
        axios.post(
          `${API_BASE_URL}/collector/issues/${issueId}/${action}`,
          { resolution_notes: `Bulk ${action} action` },
          { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
        )
      );

      await Promise.all(promises);
      await loadIssues();
      setSelectedIssues(new Set());
      setSuccess(`${selectedIssues.size} issues ${action}d successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error(`Failed to ${action} issues:`, e);
      setError(`Failed to ${action} selected issues`);
    } finally {
      setSaving(false);
    }
  };

  const toggleIssueSelection = (issueId) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllPending = () => {
    const pendingIds = pendingIssues.map(issue => issue.issue_id);
    setSelectedIssues(new Set(pendingIds));
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#666';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'approved': return '#4caf50';
      case 'rejected': return '#f44336';
      case 'resolved': return '#2196f3';
      default: return '#666';
    }
  };

  const formatIssueType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatRequestedAction = (action) => {
    const actions = {
      'backup_truck': 'Request Backup Truck',
      'delay_2h': 'Delay Route (2 hours)',
      'delay_4h': 'Delay Route (4 hours)',
      'reschedule_tomorrow': 'Reschedule to Tomorrow',
      'cancel_route': 'Cancel Route'
    };
    return actions[action] || action;
  };

  // Filter issues based on current filters
  const filteredIssues = issues.filter(issue => {
    if (filters.severity !== 'all' && issue.severity !== filters.severity) return false;
    if (filters.type !== 'all' && issue.issue_type !== filters.type) return false;
    if (filters.search && !issue.description?.toLowerCase().includes(filters.search.toLowerCase()) && 
        !issue.issue_id.toString().includes(filters.search)) return false;
    
    if (filters.dateRange !== 'all') {
      const issueDate = new Date(issue.reported_at);
      const now = new Date();
      const daysDiff = Math.floor((now - issueDate) / (1000 * 60 * 60 * 24));
      
      switch (filters.dateRange) {
        case 'today': if (daysDiff !== 0) return false; break;
        case 'week': if (daysDiff > 7) return false; break;
        case 'month': if (daysDiff > 30) return false; break;
      }
    }
    
    return true;
  });

  const pendingIssues = filteredIssues.filter(issue => issue.status === 'pending');
  const resolvedIssues = filteredIssues.filter(issue => issue.status !== 'pending');

  return (
    <div className="route-issues-container">
      <div className="route-issues-header">
        <div className="header-title">
          <h1>🚛 Route Issues Management</h1>
          <p>Monitor and resolve collector route issues in real-time</p>
        </div>
        <div className="header-stats">
          <div className="stat-card critical">
            <span className="stat-number">{pendingIssues.filter(i => i.severity === 'critical').length}</span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="stat-card high">
            <span className="stat-number">{pendingIssues.filter(i => i.severity === 'high').length}</span>
            <span className="stat-label">High Priority</span>
          </div>
          <div className="stat-card pending">
            <span className="stat-number">{pendingIssues.length}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {/* Filters and Controls */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>Severity:</label>
            <select 
              value={filters.severity} 
              onChange={(e) => setFilters({...filters, severity: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="truck_breakdown">Truck Breakdown</option>
              <option value="equipment_failure">Equipment Failure</option>
              <option value="weather">Weather</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select 
              value={filters.dateRange} 
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search issues..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="search-input"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIssues.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-selected">{selectedIssues.size} issues selected</span>
            <div className="bulk-buttons">
              <button 
                onClick={() => handleBulkAction('approve')} 
                className="bulk-btn approve"
                disabled={saving}
              >
                Bulk Approve
              </button>
              <button 
                onClick={() => handleBulkAction('reject')} 
                className="bulk-btn reject"
                disabled={saving}
              >
                Bulk Reject
              </button>
              <button onClick={clearSelection} className="bulk-btn clear">
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {pendingIssues.length > 0 && (
          <div className="quick-actions">
            <button onClick={selectAllPending} className="quick-btn">
              Select All Pending
            </button>
            <button onClick={() => setViewMode(viewMode === 'cards' ? 'kanban' : 'cards')} className="quick-btn">
              {viewMode === 'cards' ? '📋 Kanban View' : '🗃️ Card View'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedIssue ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Issues List */}
        <div>
          <h3 style={{ marginTop: 0, color: '#f57c00' }}>Pending Issues ({pendingIssues.length})</h3>
          {loading ? (
            <p>Loading...</p>
          ) : pendingIssues.length === 0 ? (
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, textAlign: 'center', color: '#666' }}>
              No pending issues
            </div>
          ) : (
            <div className="issues-grid">
              {pendingIssues.map(issue => (
                <div 
                  key={issue.issue_id} 
                  className={`issue-card ${selectedIssue?.issue_id === issue.issue_id ? 'selected' : ''} severity-${issue.severity}`}
                >
                  <div className="issue-card-header">
                    <div className="issue-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIssues.has(issue.issue_id)}
                        onChange={() => toggleIssueSelection(issue.issue_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="issue-meta" onClick={() => setSelectedIssue(issue)}>
                      <span className={`severity-badge severity-${issue.severity}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="issue-id">#{issue.issue_id}</span>
                    </div>
                    <div className="issue-time">
                      {new Date(issue.reported_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="issue-card-body" onClick={() => setSelectedIssue(issue)}>
                    <div className="issue-collector">
                      <strong>🚛 Collector #{issue.collector_id}</strong>
                      <span className="issue-type">{formatIssueType(issue.issue_type)}</span>
                    </div>
                    
                    {issue.description && (
                      <div className="issue-description">
                        {issue.description}
                      </div>
                    )}
                    
                    <div className="issue-footer">
                      <div className="requested-action">
                        <span className="action-label">Requested:</span>
                        <span className="action-text">{formatRequestedAction(issue.requested_action)}</span>
                      </div>
                      {issue.estimated_delay_hours && (
                        <div className="estimated-delay">
                          ⏱️ {issue.estimated_delay_hours}h delay
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolvedIssues.length > 0 && (
            <>
              <h3 style={{ marginTop: 24, color: '#666' }}>Recent Resolved Issues</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {resolvedIssues.slice(0, 5).map(issue => (
                  <div key={issue.issue_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, backgroundColor: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>Issue #{issue.issue_id}</span>
                        <span style={{ marginLeft: 8 }}>Collector #{issue.collector_id}</span>
                      </div>
                      <span style={{ 
                        background: getStatusColor(issue.status), 
                        color: '#fff', 
                        padding: '2px 6px', 
                        borderRadius: 4, 
                        fontSize: 11, 
                        fontWeight: 'bold' 
                      }}>
                        {issue.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {formatIssueType(issue.issue_type)} - {new Date(issue.reported_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Issue Details & Actions */}
        {selectedIssue && (
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, height: 'fit-content' }}>
            <h3 style={{ marginTop: 0 }}>Issue Details</h3>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Issue ID</label>
                  <div>#{selectedIssue.issue_id}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Collector</label>
                  <div>#{selectedIssue.collector_id}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Issue Type</label>
                  <div>{formatIssueType(selectedIssue.issue_type)}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Severity</label>
                  <span style={{ 
                    background: getSeverityColor(selectedIssue.severity), 
                    color: '#fff', 
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontSize: 12, 
                    fontWeight: 'bold' 
                  }}>
                    {selectedIssue.severity.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedIssue.description && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Description</label>
                  <div style={{ background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {selectedIssue.description}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Requested Action</label>
                <div style={{ color: '#1976d2', fontWeight: 'bold' }}>
                  {formatRequestedAction(selectedIssue.requested_action)}
                </div>
              </div>

              {selectedIssue.affected_schedule_ids && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Affected Schedules</label>
                  <div>{JSON.parse(selectedIssue.affected_schedule_ids).join(', ')}</div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Reported At</label>
                <div>{new Date(selectedIssue.reported_at).toLocaleString()}</div>
              </div>

              {(selectedIssue.location_lat && selectedIssue.location_lng) && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>Location</label>
                  <div>{selectedIssue.location_lat}, {selectedIssue.location_lng}</div>
                </div>
              )}
            </div>

            {selectedIssue.status === 'pending' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8 }}>Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Add notes about your decision..."
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ddd', minHeight: 80 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleApprove(selectedIssue.issue_id)}
                    disabled={saving}
                    style={{ 
                      background: '#4caf50', 
                      color: '#fff', 
                      padding: '10px 16px', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    {saving ? 'Processing...' : 'Approve Request'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedIssue.issue_id)}
                    disabled={saving}
                    style={{ 
                      background: '#f44336', 
                      color: '#fff', 
                      padding: '10px 16px', 
                      border: 'none', 
                      borderRadius: 4, 
                      cursor: 'pointer',
                      flex: 1
                    }}
                  >
                    {saving ? 'Processing...' : 'Reject Request'}
                  </button>
                </div>
              </>
            )}

            {selectedIssue.status !== 'pending' && (
              <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                  Status: <span style={{ color: getStatusColor(selectedIssue.status) }}>
                    {selectedIssue.status.toUpperCase()}
                  </span>
                </div>
                {selectedIssue.resolution_notes && (
                  <div>
                    <strong>Resolution Notes:</strong> {selectedIssue.resolution_notes}
                  </div>
                )}
                {selectedIssue.resolved_at && (
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    Resolved: {new Date(selectedIssue.resolved_at).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
