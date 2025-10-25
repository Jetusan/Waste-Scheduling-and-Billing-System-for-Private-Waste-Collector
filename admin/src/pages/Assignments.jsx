import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

export default function Assignments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [collectors, setCollectors] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [form, setForm] = useState({
    collector_id: '',
    subdivision: ''
  });

  // Fixed data for San Isidro and VSM Heights Phase 1
  const fixedBarangay = { barangay_id: 6, barangay_name: 'San Isidro' };
  const subdivisions = [
    { id: 'vsm-heights-phase1', name: 'VSM Heights Phase 1' }
  ];

  const token = useMemo(() => sessionStorage.getItem('adminToken'), []);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [colRes, asgRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/collectors`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/assignments?active_only=true&type=barangay`, { headers: authHeaders }),
      ]);
      setCollectors(colRes.data || []);
      setAssignments((asgRes.data?.assignments) || asgRes.data || []);
    } catch (e) {
      console.error('Failed to load assignments data:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      // Validate
      if (!form.collector_id) {
        setError('Please select a collector.');
        return;
      }
      if (!form.subdivision) {
        setError('Please select a subdivision.');
        return;
      }

      // Create assignment for San Isidro with subdivision
      const assignmentData = {
        collector_id: parseInt(form.collector_id, 10),
        barangay_id: fixedBarangay.barangay_id,
        subdivision: form.subdivision
      };

      await axios.post(
        `${API_BASE_URL}/assignments/barangay`,
        assignmentData,
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      
      await loadAll();
      setForm({ 
        collector_id: '', 
        subdivision: ''
      });
    } catch (e) {
      console.error('Failed to save assignment:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (assignment_id) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/assignments/${assignment_id}`, { headers: authHeaders });
      await loadAll();
    } catch (e) {
      console.error('Failed to delete assignment:', e);
      setError(e?.response?.data?.message || e.message || 'Failed to delete');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, color: '#1f2937', fontSize: '28px', fontWeight: '700' }}>
          Collector Assignments
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '16px' }}>
          Assign collectors to specific barangays for waste collection coverage
        </p>
      </div>

      {error && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fca5a5', 
          color: '#dc2626', 
          padding: 16, 
          borderRadius: 8, 
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <i className="fas fa-exclamation-triangle"></i>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 32, alignItems: 'start' }}>
        {/* Assignment Form */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: 12, 
          padding: 24,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
              Create New Assignment
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              Assign a collector to cover a specific barangay
            </p>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Collector Selection */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#374151', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                <i className="fas fa-user" style={{ marginRight: 8, color: '#6b7280' }}></i>
                Select Collector
              </label>
              <select
                value={form.collector_id}
                onChange={(e) => setForm(f => ({ ...f, collector_id: e.target.value }))}
                required
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">Choose a collector...</option>
                {collectors.map(c => (
                  <option key={c.collector_id} value={c.collector_id}>
                    {c.username || `${c.first_name || ''} ${c.last_name || ''}`.trim()} (ID: {c.collector_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Barangay Display */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#374151', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: 8, color: '#6b7280' }}></i>
                Barangay
              </label>
              <div style={{ 
                width: '100%', 
                padding: '12px', 
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f9fafb',
                color: '#374151'
              }}>
                {fixedBarangay.barangay_name}
              </div>
            </div>

            {/* Subdivision Selection */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#374151', 
                fontSize: '14px', 
                fontWeight: '500' 
              }}>
                <i className="fas fa-building" style={{ marginRight: 8, color: '#6b7280' }}></i>
                Select Subdivision
              </label>
              <select
                value={form.subdivision}
                onChange={(e) => setForm(f => ({ ...f, subdivision: e.target.value }))}
                required
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff'
                }}
              >
                <option value="">Choose a subdivision...</option>
                {subdivisions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>


            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={saving} 
              style={{ 
                background: saving ? '#9ca3af' : '#2563eb',
                color: '#ffffff', 
                padding: '14px 20px', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Creating Assignment...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Create Assignment
                </>
              )}
            </button>
          </form>
        </div>

        {/* Assignments List */}
        <div style={{ 
          background: '#ffffff', 
          border: '1px solid #e5e7eb', 
          borderRadius: 12, 
          padding: 24,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
              Active Assignments
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              Current collector-barangay assignments and their coverage areas
            </p>
          </div>

          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 40,
              color: '#6b7280'
            }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
              Loading assignments...
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40,
              color: '#6b7280'
            }}>
              <i className="fas fa-clipboard-list" style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}></i>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Active Assignments</h3>
              <p style={{ margin: 0 }}>Create your first assignment using the form on the left</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {assignments.map(a => {
                // Find collector name
                const collector = collectors.find(c => c.collector_id === a.collector_id);
                const collectorName = collector ? 
                  (collector.username || `${collector.first_name || ''} ${collector.last_name || ''}`.trim()) : 
                  `Collector #${a.collector_id}`;

                return (
                  <div 
                    key={a.assignment_id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 16,
                      background: '#f9fafb',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                          background: '#2563eb',
                          color: 'white',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {collectorName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: '#1f2937', fontSize: '16px', fontWeight: '600' }}>
                            {collectorName}
                          </h4>
                          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                            Assignment #{a.assignment_id}
                          </p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="fas fa-map-marker-alt" style={{ color: '#10b981', fontSize: '14px' }}></i>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Barangay
                            </p>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                              {a.barangay_name || 'San Isidro'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="fas fa-building" style={{ color: '#f59e0b', fontSize: '14px' }}></i>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Subdivision
                            </p>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                              {a.subdivision ? subdivisions.find(s => s.id === a.subdivision)?.name || a.subdivision : 'VSM Heights Phase 1'}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="fas fa-calendar-check" style={{ color: '#8b5cf6', fontSize: '14px' }}></i>
                          <div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Status
                            </p>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                              Active
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => remove(a.assignment_id)}
                      style={{ 
                        background: '#fef2f2',
                        color: '#dc2626', 
                        border: '1px solid #fca5a5', 
                        padding: '8px 16px', 
                        borderRadius: 6, 
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#dc2626';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = '#fef2f2';
                        e.target.style.color = '#dc2626';
                      }}
                    >
                      <i className="fas fa-trash-alt"></i>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
