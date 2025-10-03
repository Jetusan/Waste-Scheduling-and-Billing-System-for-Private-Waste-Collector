import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

export default function RouteIssues() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const token = useMemo(() => sessionStorage.getItem('adminToken'), []);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadIssues = async () => {
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
  };

  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    } catch (e) {
      console.error('Failed to reject issue:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to reject');
    } finally {
      setSaving(false);
    }
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

  const pendingIssues = issues.filter(issue => issue.status === 'pending');
  const resolvedIssues = issues.filter(issue => issue.status !== 'pending');

  return (
    <div style={{ padding: 16 }}>
      <h2>Route Issues Management</h2>
      {error && (
        <div style={{ background: '#ffebee', border: '1px solid #c62828', color: '#c62828', padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingIssues.map(issue => (
                <div 
                  key={issue.issue_id} 
                  style={{ 
                    border: selectedIssue?.issue_id === issue.issue_id ? '2px solid #1976d2' : '1px solid #ddd', 
                    borderRadius: 8, 
                    padding: 16,
                    cursor: 'pointer',
                    backgroundColor: selectedIssue?.issue_id === issue.issue_id ? '#f3f9ff' : '#fff'
                  }}
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ 
                        background: getSeverityColor(issue.severity), 
                        color: '#fff', 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 12, 
                        fontWeight: 'bold' 
                      }}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <span style={{ marginLeft: 8, fontWeight: 'bold' }}>
                        Issue #{issue.issue_id}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {new Date(issue.reported_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: 8 }}>
                    <strong>Collector #{issue.collector_id}</strong> - {formatIssueType(issue.issue_type)}
                  </div>
                  
                  {issue.description && (
                    <div style={{ marginBottom: 8, color: '#555' }}>
                      {issue.description}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#1976d2', fontWeight: 'bold' }}>
                      Requested: {formatRequestedAction(issue.requested_action)}
                    </div>
                    {issue.estimated_delay_hours && (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Est. delay: {issue.estimated_delay_hours}h
                      </div>
                    )}
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
