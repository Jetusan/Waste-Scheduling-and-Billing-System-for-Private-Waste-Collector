import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export default function Assignments() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [collectors, setCollectors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [form, setForm] = useState({
    collector_id: '',
    schedule_ids: [],
    schedule_id: '',
    effective_start_date: '',
    effective_end_date: '',
    shift_label: ''
  });

  const token = useMemo(() => sessionStorage.getItem('adminToken'), []);
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [colRes, schRes, asgRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/collectors`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/collection-schedules`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/assignments?active_only=true`, { headers: authHeaders }),
      ]);
      setCollectors(colRes.data || []);
      setSchedules((schRes.data?.schedules) || schRes.data || []);
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
      if (!form.schedule_ids || form.schedule_ids.length === 0) {
        setError('Please select at least one schedule.');
        return;
      }

      // Create one assignment per selected schedule
      const base = {
        collector_id: parseInt(form.collector_id, 10),
        effective_start_date: form.effective_start_date || undefined,
        effective_end_date: form.effective_end_date || undefined,
        shift_label: form.shift_label || undefined,
      };

      await Promise.all(
        form.schedule_ids.map(id =>
          axios.post(
            `${API_BASE_URL}/assignments`,
            { ...base, schedule_id: parseInt(id, 10) },
            { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
          )
        )
      );
      await loadAll();
      setForm({ collector_id: '', schedule_ids: [], schedule_id: '', effective_start_date: '', effective_end_date: '', shift_label: '' });
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
    <div style={{ padding: 16 }}>
      <h2>Collector Assignments</h2>
      {error && (
        <div style={{ background: '#ffebee', border: '1px solid #c62828', color: '#c62828', padding: 10, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <form onSubmit={submit} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>New Assignment</h3>
          <label style={{ display: 'block', marginBottom: 8 }}>Collector</label>
          <select
            value={form.collector_id}
            onChange={(e) => setForm(f => ({ ...f, collector_id: e.target.value }))}
            required
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          >
            <option value="">Select collector...</option>
            {collectors.map(c => (
              <option key={c.collector_id} value={c.collector_id}>
                {(c.username || `${c.first_name || ''} ${c.last_name || ''}`.trim())} (Collector ID: {c.collector_id})
              </option>
            ))}
          </select>

          <label style={{ display: 'block', marginBottom: 8 }}>Schedule</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <select
              value={form.schedule_id}
              onChange={(e) => setForm(f => ({ ...f, schedule_id: e.target.value }))}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="">Select schedule...</option>
              {schedules.map(s => (
                <option key={s.schedule_id} value={s.schedule_id}>
                  {`${s.schedule_date} — ${s.waste_type || ''} ${s.time_range ? `(${s.time_range})` : ''}`.trim()}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                if (!form.schedule_id) return;
                setForm(f => {
                  const id = String(f.schedule_id);
                  if (f.schedule_ids.includes(id)) return f; // avoid duplicates
                  return { ...f, schedule_ids: [...f.schedule_ids, id], schedule_id: '' };
                });
              }}
              style={{ padding: '8px 12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
          {form.schedule_ids.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {form.schedule_ids.map(id => {
                const s = schedules.find(x => String(x.schedule_id) === String(id));
                const label = s ? `${s.schedule_date} — ${s.waste_type || ''} ${s.time_range ? `(${s.time_range})` : ''}`.trim() : `Schedule #${id}`;
                return (
                  <div key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef5ff', color: '#0d47a1', border: '1px solid #90caf9', borderRadius: 16, padding: '6px 10px' }}>
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, schedule_ids: f.schedule_ids.filter(x => String(x) !== String(id)) }))}
                      title="Remove"
                      style={{ background: 'transparent', color: '#0d47a1', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>Start Date (optional)</label>
              <input type="date" value={form.effective_start_date} onChange={(e) => setForm(f => ({ ...f, effective_start_date: e.target.value }))} style={{ width: '100%', padding: 8 }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8 }}>End Date (optional)</label>
              <input type="date" value={form.effective_end_date} onChange={(e) => setForm(f => ({ ...f, effective_end_date: e.target.value }))} style={{ width: '100%', padding: 8 }} />
            </div>
          </div>

          <label style={{ display: 'block', margin: '12px 0 8px' }}>Shift Label (optional)</label>
          <input type="text" placeholder="AM/PM or custom" value={form.shift_label} onChange={(e) => setForm(f => ({ ...f, shift_label: e.target.value }))} style={{ width: '100%', padding: 8, marginBottom: 12 }} />

          <button type="submit" disabled={saving} style={{ background: '#1976d2', color: '#fff', padding: '10px 14px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {saving ? 'Assigning...' : 'Assign to Selected Schedules'}
          </button>
        </form>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Today Coverage</h3>
          <p style={{ color: '#666' }}>Shows active assignments only. Remove assignments to unassign a collector.</p>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Assignment ID</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Collector</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Schedule</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Window</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Shift</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 12, color: '#777' }}>No active assignments.</td>
                  </tr>
                ) : (
                  assignments.map(a => (
                    <tr key={a.assignment_id}>
                      <td style={{ padding: 8 }}>{a.assignment_id}</td>
                      <td style={{ padding: 8 }}>#{a.collector_id}</td>
                      <td style={{ padding: 8 }}>{`${a.schedule_date} — ${a.waste_type || ''} ${a.time_range ? `(${a.time_range})` : ''}`.trim()}</td>
                      <td style={{ padding: 8 }}>{`${a.effective_start_date || '—'} → ${a.effective_end_date || '—'}`}</td>
                      <td style={{ padding: 8 }}>{a.shift_label || '—'}</td>
                      <td style={{ padding: 8 }}>
                        <button onClick={() => remove(a.assignment_id)} style={{ background: '#fff', color: '#c62828', border: '1px solid #c62828', padding: '6px 10px', borderRadius: 4, cursor: 'pointer' }}>Remove</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
