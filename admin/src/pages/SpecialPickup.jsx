import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/special-pickup';

const SpecialPickup = () => {
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
    fetchRequests();
  }, []);

  return (
    <div className="special-pickup-container">
      <h2>Special Pickup Requests</h2>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <table className="special-pickup-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>User ID</th>
              <th>Location</th>
              <th>Date/Time</th>
              <th>Type</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.request_id}>
                <td>{req.request_id}</td>
                <td>{req.user_id}</td>
                <td>{req.address}</td>
                <td>{req.pickup_date} {req.pickup_time}</td>
                <td>{req.waste_type}</td>
                <td>{req.status}</td>
                <td><button onClick={() => { setSelected(req); setShowModal(true); }}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showModal && selected && (
        <div className="special-pickup-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
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
            minWidth: 380,
            maxWidth: 480,
            width: '90%',
            position: 'relative',
            animation: 'fadeIn 0.2s',
          }}>
            <button className="close-btn" onClick={() => setShowModal(false)} style={{
              position: 'absolute',
              top: 18,
              right: 18,
              background: 'none',
              border: 'none',
              fontSize: 28,
              color: '#888',
              cursor: 'pointer',
            }}>&times;</button>
            <h2 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center', fontWeight: 700, fontSize: 26, letterSpacing: 0.5 }}>Special Pickup Details</h2>
            <div style={{ borderTop: '1px solid #eee', marginBottom: 18 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', rowGap: 14, columnGap: 18 }}>
              <div style={{ fontWeight: 600, color: '#555' }}>Request ID:</div>
              <div>{selected.request_id}</div>
              <div style={{ fontWeight: 600, color: '#555' }}>User ID:</div>
              <div>{selected.user_id}</div>
              <div style={{ fontWeight: 600, color: '#555' }}>Location:</div>
              <div>{selected.address}</div>
              <div style={{ fontWeight: 600, color: '#555' }}>Date/Time:</div>
              <div>{selected.pickup_date} {selected.pickup_time}</div>
              <div style={{ fontWeight: 600, color: '#555' }}>Type:</div>
              <div>{selected.waste_type}</div>
              <div style={{ fontWeight: 600, color: '#555' }}>Status:</div>
              <div><span style={{
                background: selected.status === 'pending' ? '#ffe082' : selected.status === 'completed' ? '#b2f2bb' : '#e0e0e0',
                color: '#333',
                borderRadius: 6,
                padding: '2px 10px',
                fontWeight: 600,
                fontSize: 14,
              }}>{selected.status}</span></div>
              {selected.description && <><div style={{ fontWeight: 600, color: '#555' }}>Description:</div><div>{selected.description}</div></>}
              {selected.notes && <><div style={{ fontWeight: 600, color: '#555' }}>Notes:</div><div>{selected.notes}</div></>}
              {selected.message && <><div style={{ fontWeight: 600, color: '#555' }}>Message:</div><div>{selected.message}</div></>}
              {selected.image_url && <>
                <div style={{ fontWeight: 600, color: '#555' }}>Photo:</div>
                <div><img src={selected.image_url} alt="pickup" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 10, border: '1px solid #eee', boxShadow: '0 2px 8px #eee' }} /></div>
              </>}
            </div>
            <div style={{ borderTop: '1px solid #eee', marginTop: 24, marginBottom: 0 }} />
            <div style={{ textAlign: 'center', marginTop: 18, color: '#888', fontSize: 13 }}>
              Last updated: {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialPickup; 