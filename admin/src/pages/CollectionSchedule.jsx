import React, { useState, useEffect } from 'react';
import '../styles/CollectionSchedule.css';
import axios from 'axios';
import SpecialPickup from './SpecialPickup'; // Add this import at the top
import { buildApiUrl } from '../config/api';

const CollectionSchedule = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barangays, setBarangays] = useState([]);
  const [editSchedule, setEditSchedule] = useState({
    schedule_id: '',
    barangay_ids: [],
    schedule_date: '',
    created_at: '',
    waste_type: 'Non-bio', // Add default waste type
    subdivision: '', // Add subdivision field
  });
  const [newSchedule, setNewSchedule] = useState({
    barangay_ids: [],
    schedule_date: '',
    created_at: '',
    waste_type: 'Non-bio', // Add default waste type
    subdivision: '', // Add subdivision field
  });
  const wasteTypes = [
    'Non-bio',
    'Bio',
    'Recyclable',
  ];
  const [barangayToAdd, setBarangayToAdd] = useState('');
  const [editBarangayToAdd, setEditBarangayToAdd] = useState('');
  const SUBDIVISIONS = ['VSM heights Phase 1'];
  const [viewType, setViewType] = useState('regular'); // Add this state after other useState hooks

  // Helper function to format time to 12-hour format
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours] = time24.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  // Helper function to build time range string
  const buildTimeRange = (startTime, endTime) => {
    if (!startTime && !endTime) return '';
    if (!startTime) return '';
    
    const formattedStart = formatTime(startTime);
    const formattedEnd = endTime ? formatTime(endTime) : '';
    
    if (formattedStart && formattedEnd) {
      return `${formattedStart} to ${formattedEnd}`;
    } else {
      return formattedStart;
    }
  };
 

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      const { data } = await axios.get(buildApiUrl('/api/collection-schedules'));
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  // Fetch barangays
  const fetchBarangays = async () => {
    try {
      const { data } = await axios.get(buildApiUrl('/api/barangays'));
      setBarangays(data);
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };


  useEffect(() => {
    console.log('Component mounted, fetching data...');
    fetchSchedules();
    fetchBarangays();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (!newSchedule.barangay_ids.length || !newSchedule.schedule_date) {
        alert('Please select at least one barangay and fill in the day.');
        return;
      }
      const response = await axios.post(buildApiUrl('/api/collection-schedules'), {
        barangay_ids: newSchedule.barangay_ids.map(id => parseInt(id, 10)),
        schedule_date: newSchedule.schedule_date,
        waste_type: newSchedule.waste_type,
        subdivision: newSchedule.subdivision,
        time_range: '', // Empty time range as requested
      });
      if (response.data) {
        fetchSchedules();
        setIsModalOpen(false);
        setNewSchedule({
          barangay_ids: [],
          schedule_date: '',
          created_at: '',
          waste_type: 'Non-bio', // Reset to default
          subdivision: '', // Reset subdivision
        });
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to create schedule. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDelete = async id => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await axios.delete(buildApiUrl(`/api/collection-schedules/${id}`));
        fetchSchedules();
      } catch (err) {
        console.error('Error deleting schedule:', err);
        alert('Failed to delete schedule. Please try again.');
      }
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        buildApiUrl(`/api/collection-schedules/${editSchedule.schedule_id}`),
        {
          barangay_ids: editSchedule.barangay_ids.map(id => parseInt(id, 10)),
          schedule_date: editSchedule.schedule_date,
          waste_type: editSchedule.waste_type,
          subdivision: editSchedule.subdivision,
          time_range: '', // Empty time range as requested
        }
      );
      if (response.data) {
        await fetchSchedules();
        setIsEditModalOpen(false);
        setEditSchedule({
          schedule_id: '',
          barangay_ids: [],
          schedule_date: '',
          created_at: '',
          waste_type: 'Non-bio',
          subdivision: '', // Reset subdivision
        });
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to update schedule. Please try again.';
      alert(errorMessage);
    }
  };

  const openEditModal = (schedule) => {
    setEditSchedule({
      schedule_id: schedule.schedule_id,
      barangay_ids: schedule.barangays ? schedule.barangays.map(b => String(b.barangay_id)) : [],
      schedule_date: schedule.schedule_date,
      created_at: schedule.created_at,
      waste_type: schedule.waste_type || 'Non-bio', // Prefill waste type
      subdivision: schedule.subdivision || '', // Prefill subdivision
    });
    setIsEditModalOpen(true);
  };

  // Helper function to convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12) => {
    if (!time12) return '';
    
    const timeStr = time12.toLowerCase().replace(/\s/g, '');
    const isPM = timeStr.includes('pm');
    const isAM = timeStr.includes('am');
    
    if (!isPM && !isAM) return '';
    
    let hour = parseInt(timeStr.replace(/[ap]m/, ''));
    
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (isAM && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const filteredSchedules = searchTerm
    ? schedules.filter(s =>
        s.barangays && s.barangays.some(b =>
          b.barangay_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : schedules;

  const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  return (
    <section className="collection-schedule">
      {/* Tab Switcher */}
      <div className="schedule-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: '20px', marginBottom: '10px', gap: '10px' }}>
        <button onClick={() => setViewType('regular')} className={viewType === 'regular' ? 'active' : ''}>Regular</button>
        <button onClick={() => setViewType('special')} className={viewType === 'special' ? 'active' : ''}>Special Pickup</button>
      </div>
      {viewType === 'regular' ? (
        <>
          {/* Header */}
          <div className="schedule-header" style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            padding: '20px',
            marginBottom: '10px'
          }}>
            <button 
              className="add-schedule-btn" 
              onClick={() => setIsModalOpen(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
              }}
            >
              <i className="fa fa-plus" style={{ fontSize: '18px' }} /> Add Schedule
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '20px',
            marginBottom: '20px'
          }}>
            <input
              type="text"
              placeholder="Search by barangay..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '600px',
                padding: '10px 15px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Barangay</th>
                  <th>Subdivision</th>
                  <th>Collection Day</th>
                  <th>Type of Waste</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(s => (
                  <tr key={s.schedule_id}>
                    <td>{s.barangays && s.barangays.length > 0 ? s.barangays.map(b => b.barangay_name).join(', ') : ''}</td>
                    <td>{s.subdivision || ''}</td>
                    <td>{s.schedule_date}</td>
                    <td>{s.waste_type || ''}</td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => openEditModal(s)}
                      >
                        <i className="fa fa-edit" />
                      </button>
                      <button
                        className="action-btn"
                        onClick={() => handleDelete(s.schedule_id)}
                      >
                        <i className="fa fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Add New Schedule</h3>
                  <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Barangay(s):</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={barangayToAdd}
                        onChange={e => setBarangayToAdd(e.target.value)}
                      >
                        <option value="">Select Barangay</option>
                        {barangays.filter(b => b.barangay_name === 'San Isidro' && !newSchedule.barangay_ids.includes(String(b.barangay_id))).map(b => (
                          <option key={b.barangay_id} value={b.barangay_id}>{b.barangay_name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        if (barangayToAdd && !newSchedule.barangay_ids.includes(barangayToAdd)) {
                          setNewSchedule({
                            ...newSchedule,
                            barangay_ids: [...newSchedule.barangay_ids, barangayToAdd]
                          });
                          setBarangayToAdd('');
                        }
                      }} disabled={!barangayToAdd}>Add</button>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {newSchedule.barangay_ids.map(id => {
                        const barangay = barangays.find(b => String(b.barangay_id) === String(id));
                        return (
                          <span key={id} style={{ background: '#e0e7ff', padding: '4px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center' }}>
                            {barangay ? barangay.barangay_name : id}
                            <button type="button" style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setNewSchedule({ ...newSchedule, barangay_ids: newSchedule.barangay_ids.filter(bid => bid !== id) })}>&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Subdivision:</label>
                    <select
                      value={newSchedule.subdivision}
                      onChange={e => setNewSchedule({ ...newSchedule, subdivision: e.target.value })}
                      required
                    >
                      <option value="">Select Subdivision</option>
                      {SUBDIVISIONS.map(subdivision => (
                        <option key={subdivision} value={subdivision}>{subdivision}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Day:</label>
                    <select
                      value={newSchedule.schedule_date}
                      onChange={e => setNewSchedule({ ...newSchedule, schedule_date: e.target.value })}
                      required
                    >
                      <option value="">Select Day</option>
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type of Waste:</label>
                    <select
                      value={newSchedule.waste_type}
                      onChange={e => setNewSchedule({ ...newSchedule, waste_type: e.target.value })}
                      required
                    >
                      {wasteTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Add Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {isEditModalOpen && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header">
                  <h3>Edit Schedule</h3>
                  <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                    <i className="fa fa-times" />
                  </button>
                </div>
                <form onSubmit={handleEdit}>
                  <div className="form-group">
                    <label>Barangay(s):</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        value={editBarangayToAdd}
                        onChange={e => setEditBarangayToAdd(e.target.value)}
                      >
                        <option value="">Select Barangay</option>
                        {barangays.filter(b => b.barangay_name === 'San Isidro' && !editSchedule.barangay_ids.includes(String(b.barangay_id))).map(b => (
                          <option key={b.barangay_id} value={b.barangay_id}>{b.barangay_name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        if (editBarangayToAdd && !editSchedule.barangay_ids.includes(editBarangayToAdd)) {
                          setEditSchedule({
                            ...editSchedule,
                            barangay_ids: [...editSchedule.barangay_ids, editBarangayToAdd]
                          });
                          setEditBarangayToAdd('');
                        }
                      }} disabled={!editBarangayToAdd}>Add</button>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {editSchedule.barangay_ids.map(id => {
                        const barangay = barangays.find(b => String(b.barangay_id) === String(id));
                        return (
                          <span key={id} style={{ background: '#e0e7ff', padding: '4px 10px', borderRadius: 12, display: 'inline-flex', alignItems: 'center' }}>
                            {barangay ? barangay.barangay_name : id}
                            <button type="button" style={{ marginLeft: 4, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditSchedule({ ...editSchedule, barangay_ids: editSchedule.barangay_ids.filter(bid => bid !== id) })}>&times;</button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Day:</label>
                    <select
                      value={editSchedule.schedule_date}
                      onChange={e => setEditSchedule({ ...editSchedule, schedule_date: e.target.value })}
                      required
                    >
                      <option value="">Select Day</option>
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Subdivision:</label>
                    <select
                      value={editSchedule.subdivision || ''}
                      onChange={e => setEditSchedule({ ...editSchedule, subdivision: e.target.value })}
                      required
                    >
                      <option value="">Select Subdivision</option>
                      {SUBDIVISIONS.map(subdivision => (
                        <option key={subdivision} value={subdivision}>{subdivision}</option>
                      ))}
                      {editSchedule.subdivision && !SUBDIVISIONS.includes(editSchedule.subdivision) && (
                        <option value={editSchedule.subdivision}>{editSchedule.subdivision}</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Type of Waste:</label>
                    <select
                      value={editSchedule.waste_type || 'Non-bio'}
                      onChange={e => setEditSchedule({ ...editSchedule, waste_type: e.target.value })}
                      required
                    >
                      {wasteTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="submit-btn">
                      Update Schedule
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <SpecialPickup />
      )}
    </section>
  );
};

export default CollectionSchedule;
