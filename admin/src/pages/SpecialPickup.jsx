import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SpecialPickupChat from '../components/SpecialPickupChat';

const API_URL = 'http://localhost:5000/api/special-pickup';
const COLLECTORS_API_URL = 'http://localhost:5000/api/collectors';

const SpecialPickup = () => {
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigningCollector, setAssigningCollector] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatRequest, setChatRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
    fetchCollectors();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(API_URL);
      setRequests(data);
    } catch (err) {
      setError('Failed to fetch special pickup requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectors = async () => {
    try {
      const { data } = await axios.get(COLLECTORS_API_URL);
      setCollectors(data);
    } catch (err) {
      console.error('Failed to fetch collectors:', err);
    }
  };

  const updateRequestStatus = async (requestId, status, collectorId = null) => {
    setUpdating(true);
    try {
      const updateData = { status };
      if (collectorId) {
        updateData.collector_id = collectorId;
      }
      
      await axios.put(`${API_URL}/${requestId}`, updateData);
      await fetchRequests(); // Refresh the list
      setShowModal(false);
      setShowAssignModal(false);
      alert('Request updated successfully!');
    } catch (err) {
      alert('Failed to update request');
    } finally {
      setUpdating(false);
    }
  };

  const assignCollector = async () => {
    if (!assigningCollector || !selected) return;
    await updateRequestStatus(selected.request_id, 'assigned', assigningCollector);
  };

  const filteredRequests = statusFilter === 'all' 
    ? requests 
    : requests.filter(req => req.status === statusFilter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffe082';
      case 'assigned': return '#81c784';
      case 'in_progress': return '#64b5f6';
      case 'completed': return '#b2f2bb';
      case 'cancelled': return '#ffab91';
      default: return '#e0e0e0';
    }
  };

  return (
    <div className="special-pickup-container" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Special Pickup Requests</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>Filter by status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button 
            onClick={fetchRequests}
            style={{ padding: '5px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="special-pickup-table" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Waste Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Location</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date/Time</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.request_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>#{req.request_id}</td>
                  <td style={{ padding: '12px' }}>User {req.user_id}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      backgroundColor: '#e3f2fd', 
                      color: '#1976d2', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {req.waste_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.address}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div>{req.pickup_date}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{req.pickup_time}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      background: getStatusColor(req.status),
                      color: '#333',
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontWeight: 600,
                      fontSize: 12,
                      textTransform: 'uppercase'
                    }}>
                      {req.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => { setSelected(req); setShowModal(true); }}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#2196F3', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        View
                      </button>
                      <button 
                        onClick={() => { setChatRequest(req); setShowChatModal(true); }}
                        style={{ 
                          padding: '4px 8px', 
                          backgroundColor: '#4CAF50', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💬 Chat
                      </button>
                      {req.status === 'pending' && (
                        <button 
                          onClick={() => { setSelected(req); setShowAssignModal(true); }}
                          style={{ 
                            padding: '4px 8px', 
                            backgroundColor: '#4CAF50', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Assign
                        </button>
                      )}
                      {(req.status === 'assigned' || req.status === 'in_progress') && (
                        <button 
                          onClick={() => updateRequestStatus(req.request_id, req.status === 'assigned' ? 'in_progress' : 'completed')}
                          style={{ 
                            padding: '4px 8px', 
                            backgroundColor: req.status === 'assigned' ? '#FF9800' : '#4CAF50', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          disabled={updating}
                        >
                          {req.status === 'assigned' ? 'Start' : 'Complete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRequests.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No requests found for the selected filter.
            </div>
          )}
        </div>
      )}
      {/* View Details Modal */}
      {showModal && selected && (
        <div className="special-pickup-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div className="special-pickup-modal" style={{
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: 32,
            minWidth: 500,
            maxWidth: 600,
            width: '90%',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 28,
              color: '#888',
              cursor: 'pointer',
            }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center', fontWeight: 700, fontSize: 26 }}>Special Pickup Request #{selected.request_id}</h2>
            <div style={{ borderTop: '1px solid #eee', marginBottom: 18 }} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', rowGap: 14, columnGap: 18 }}>
              <div style={{ fontWeight: 600, color: '#555' }}>Request ID:</div>
              <div>#{selected.request_id}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>User ID:</div>
              <div>User {selected.user_id}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Waste Type:</div>
              <div><span style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>{selected.waste_type}</span></div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Description:</div>
              <div>{selected.description}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Pickup Date:</div>
              <div>{selected.pickup_date}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Pickup Time:</div>
              <div>{selected.pickup_time}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Address:</div>
              <div>{selected.address}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Status:</div>
              <div><span style={{
                background: getStatusColor(selected.status),
                color: '#333',
                borderRadius: 6,
                padding: '6px 12px',
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'uppercase'
              }}>{selected.status || 'pending'}</span></div>
              
              {selected.collector_id && (
                <>
                  <div style={{ fontWeight: 600, color: '#555' }}>Assigned Collector:</div>
                  <div>Collector #{selected.collector_id}</div>
                </>
              )}
              
              {selected.notes && (
                <>
                  <div style={{ fontWeight: 600, color: '#555' }}>Notes:</div>
                  <div>{selected.notes}</div>
                </>
              )}
              
              {selected.message && (
                <>
                  <div style={{ fontWeight: 600, color: '#555' }}>Message:</div>
                  <div>{selected.message}</div>
                </>
              )}
              
              {selected.image_url && (
                <>
                  <div style={{ fontWeight: 600, color: '#555' }}>Photo:</div>
                  <div><img src={`http://localhost:5000${selected.image_url}`} alt="pickup" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, border: '1px solid #eee', boxShadow: '0 2px 8px #eee' }} /></div>
                </>
              )}
              
              <div style={{ fontWeight: 600, color: '#555' }}>Created:</div>
              <div>{new Date(selected.created_at).toLocaleString()}</div>
              
              <div style={{ fontWeight: 600, color: '#555' }}>Last Updated:</div>
              <div>{selected.updated_at ? new Date(selected.updated_at).toLocaleString() : 'N/A'}</div>
            </div>
            
            <div style={{ borderTop: '1px solid #eee', marginTop: 24, paddingTop: 18 }}>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {selected.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => { setShowModal(false); setShowAssignModal(true); }}
                      style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Assign Collector
                    </button>
                    <button 
                      onClick={() => updateRequestStatus(selected.request_id, 'cancelled')}
                      style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      disabled={updating}
                    >
                      Cancel Request
                    </button>
                  </>
                )}
                {selected.status === 'assigned' && (
                  <button 
                    onClick={() => updateRequestStatus(selected.request_id, 'in_progress')}
                    style={{ padding: '8px 16px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    disabled={updating}
                  >
                    Mark as In Progress
                  </button>
                )}
                {selected.status === 'in_progress' && (
                  <button 
                    onClick={() => updateRequestStatus(selected.request_id, 'completed')}
                    style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    disabled={updating}
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Assign Collector Modal */}
      {showAssignModal && selected && (
        <div className="assign-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            minWidth: 400,
            maxWidth: 500,
            width: '90%',
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>Assign Collector to Request #{selected.request_id}</h3>
            
            <div style={{ marginBottom: 20 }}>
              <p><strong>Waste Type:</strong> {selected.waste_type}</p>
              <p><strong>Location:</strong> {selected.address}</p>
              <p><strong>Date/Time:</strong> {selected.pickup_date} {selected.pickup_time}</p>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Select Collector:</label>
              <select 
                value={assigningCollector || ''} 
                onChange={(e) => setAssigningCollector(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Choose a collector...</option>
                {collectors.map(collector => (
                  <option key={collector.collector_id} value={collector.collector_id}>
                    {collector.name || `Collector #${collector.collector_id}`} - {collector.contact_number || 'No contact'}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setShowAssignModal(false); setAssigningCollector(null); }}
                style={{ padding: '8px 16px', backgroundColor: '#ccc', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={assignCollector}
                disabled={!assigningCollector || updating}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: assigningCollector ? '#4CAF50' : '#ccc', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: assigningCollector ? 'pointer' : 'not-allowed' 
                }}
              >
                {updating ? 'Assigning...' : 'Assign Collector'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChatModal && chatRequest && (
        <SpecialPickupChat
          requestId={chatRequest.request_id}
          requestData={chatRequest}
          onClose={() => {
            setShowChatModal(false);
            setChatRequest(null);
          }}
        />
      )}
    </div>
  );
};

export default SpecialPickup; 