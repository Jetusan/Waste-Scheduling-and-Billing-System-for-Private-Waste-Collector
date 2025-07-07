import React, { useState, useEffect } from 'react';
import '../styles/CollectionSchedule.css';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const API_URL = 'http://localhost:5000/api';

const CollectionSchedule = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barangays, setBarangays] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editSchedule, setEditSchedule] = useState({
    schedule_id: '',
    barangay_id: '',
    truck_id: '',
    schedule_date: '',
    schedule_time: '',
    created_at: ''
  });
  const [newSchedule, setNewSchedule] = useState({
    barangay_id: '',
    truck_id: '',
    schedule_date: '',
    schedule_time: '',
    created_at: ''
  });
  const [missedPickups, setMissedPickups] = useState([]);

  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/collection-schedules`);
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  // Fetch barangays
  const fetchBarangays = async () => {
    console.log('Fetching barangays...');
    try {
      const { data } = await axios.get(`${API_URL}/barangays`);
      console.log('Barangays data received:', data);
      setBarangays(data);
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  // Fetch trucks
  const fetchTrucks = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/trucks`);
      setTrucks(data);
    } catch (err) {
      console.error('Error fetching trucks:', err);
    }
  };

  // Fetch missed pickups
  const fetchMissedPickups = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/collection-schedules/missed`);
      setMissedPickups(data);
    } catch (err) {
      console.error('Error fetching missed pickups:', err);
    }
  };

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    fetchSchedules();
    fetchBarangays();
    fetchTrucks();
    fetchMissedPickups();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      // Validate form data
      if (!newSchedule.barangay_id || !newSchedule.truck_id || !newSchedule.schedule_date || !newSchedule.schedule_time) {
        alert('Please fill in all required fields');
        return;
      }

      const response = await axios.post(`${API_URL}/collection-schedules`, newSchedule);
      if (response.data) {
        fetchSchedules();
        setIsModalOpen(false);
        setNewSchedule({
          barangay_id: '',
          truck_id: '',
          schedule_date: '',
          schedule_time: '',
          created_at: ''
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
        await axios.delete(`${API_URL}/collection-schedules/${id}`);
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
      console.log('Sending update request with data:', editSchedule);
      
      const response = await axios.put(
        `${API_URL}/collection-schedules/${editSchedule.schedule_id}`,
        {
          barangay_id: editSchedule.barangay_id,
          truck_id: editSchedule.truck_id,
          schedule_date: editSchedule.schedule_date,
          schedule_time: editSchedule.schedule_time
        }
      );

      console.log('Update response:', response.data);
      
      if (response.data) {
        await fetchSchedules(); // Refresh the schedules list
        setIsEditModalOpen(false);
        setEditSchedule({
          schedule_id: '',
          barangay_id: '',
          truck_id: '',
          schedule_date: '',
          schedule_time: '',
          created_at: ''
        });
      }
    } catch (err) {
      console.error('Error updating schedule:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Failed to update schedule. Please try again.';
      alert(errorMessage);
    }
  };

  const openEditModal = (schedule) => {
    // Format the date to YYYY-MM-DD for the input
    const formattedDate = new Date(schedule.schedule_date).toISOString().split('T')[0];
    setEditSchedule({
      schedule_id: schedule.schedule_id,
      barangay_id: schedule.barangay_id,
      truck_id: schedule.truck_id,
      schedule_date: formattedDate,
      schedule_time: schedule.schedule_time,
      created_at: schedule.created_at
    });
    setIsEditModalOpen(true);
  };

  const filteredSchedules = schedules.filter(s =>
    s.barangay_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper: get schedules for selected date
  const schedulesForSelectedDate = schedules.filter(s => {
    const schedDate = new Date(s.schedule_date);
    return schedDate.toDateString() === selectedDate.toDateString();
  });

  // Helper: highlight days with schedules
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      return schedules.some(s => 
        new Date(s.schedule_date).toDateString() === date.toDateString()
      ) ? 'has-schedule' : null;
    }
  };

  return (
    <section className="collection-schedule">
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
            ':hover': {
              backgroundColor: '#45a049',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }
          }}
        >
          <i className="fa fa-plus" style={{ fontSize: '18px' }} /> Add Schedule
        </button>
      </div>

      {/* Calendar View */}
      <div className="calendar-view">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileClassName={tileClassName}
          className="react-calendar"
        />
        <style>{`
          .calendar-view {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 20px;
          }
          .react-calendar {
            width: 100%;
            max-width: 600px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .react-calendar__tile.has-schedule {
            background: #4ade80;
            color: white;
            border-radius: 8px;
          }
          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
            background-color: #e6e6e6;
            border-radius: 8px;
          }
          .react-calendar__tile--active {
            background: #006edc !important;
            border-radius: 8px;
          }
          .add-schedule-btn:hover {
            background-color: #45a049 !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        `}</style>

        <div className="schedule-list">
          <h4>Schedules for {selectedDate.toLocaleDateString()}:</h4>
          {schedulesForSelectedDate.length === 0 ? (
            <p style={{ color: '#888' }}>No schedules for this day.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {schedulesForSelectedDate.map(s => (
                <li 
                  key={s.schedule_id}
                  style={{
                    background: '#f3f4f6',
                    marginBottom: '8px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span><b>{s.barangay_name}</b> ({s.truck_number})</span>
                  <span>{s.schedule_time}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
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
              <th>Truck Number</th>
              <th>Driver</th>
              <th>Collection Date</th>
              <th>Start Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedules.map(s => (
              <tr key={s.schedule_id}>
                <td>{s.barangay_name}</td>
                <td>{s.truck_number}</td>
                <td>{s.driver_name}</td>
                <td>{new Date(s.schedule_date).toLocaleDateString()}</td>
                <td>{s.schedule_time}</td>
                <td>
                  <button
                    className="action-btn edit"
                    onClick={() => openEditModal(s)}
                  >
                    <i className="fa fa-edit" />
                  </button>
                  <button
                    className="action-btn delete"
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

      {/* Missed/Rescheduled Pickups Section */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '1200px',
        margin: '40px auto'
      }}>
        <h3 style={{ 
          marginBottom: '20px',
          color: '#333',
          borderBottom: '2px solid #f0f0f0',
          paddingBottom: '10px'
        }}>Missed or Rescheduled Pickups</h3>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Barangay</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Reason</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>New Schedule</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Collector</th>
            </tr>
          </thead>
          <tbody>
            {/* Static data for demonstration */}
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>2024-03-15</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Barangay 1</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ 
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  Missed
                </span>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Truck breakdown</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>2024-03-16</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>John Doe</td>
            </tr>
            <tr>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>2024-03-14</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Barangay 2</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ 
                  backgroundColor: '#dbeafe',
                  color: '#2563eb',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  Rescheduled
                </span>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Heavy traffic</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>2024-03-15</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Jane Smith</td>
            </tr>
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
                <label>Barangay:</label>
                <select
                  value={newSchedule.barangay_id}
                  onChange={e => {
                    console.log('Selected barangay:', e.target.value);
                    setNewSchedule({ ...newSchedule, barangay_id: e.target.value });
                  }}
                  required
                >
                  <option value="">Select Barangay</option>
                  {barangays.map(b => {
                    console.log('Rendering barangay option:', b);
                    return (
                      <option key={b.barangay_id} value={b.barangay_id}>
                        {b.barangay_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={newSchedule.schedule_date}
                  onChange={e => setNewSchedule({ ...newSchedule, schedule_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time:</label>
                <input
                  type="time"
                  value={newSchedule.schedule_time}
                  onChange={e => setNewSchedule({ ...newSchedule, schedule_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Truck/Collector:</label>
                <select
                  value={newSchedule.truck_id}
                  onChange={e => setNewSchedule({ ...newSchedule, truck_id: e.target.value })}
                  required
                >
                  <option value="">Select Truck</option>
                  {trucks.map(truck => (
                    <option key={truck.truck_id} value={truck.truck_id}>
                      {truck.truck_number} - {truck.driver_name}
                    </option>
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
                <label>Barangay:</label>
                <select
                  value={editSchedule.barangay_id}
                  onChange={e => setEditSchedule({ ...editSchedule, barangay_id: e.target.value })}
                  required
                >
                  <option value="">Select Barangay</option>
                  {barangays.map(b => (
                    <option key={b.barangay_id} value={b.barangay_id}>
                      {b.barangay_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={editSchedule.schedule_date}
                  onChange={e => setEditSchedule({ ...editSchedule, schedule_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time:</label>
                <input
                  type="time"
                  value={editSchedule.schedule_time}
                  onChange={e => setEditSchedule({ ...editSchedule, schedule_time: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Truck/Collector:</label>
                <select
                  value={editSchedule.truck_id}
                  onChange={e => setEditSchedule({ ...editSchedule, truck_id: e.target.value })}
                  required
                >
                  <option value="">Select Truck</option>
                  {trucks.map(truck => (
                    <option key={truck.truck_id} value={truck.truck_id}>
                      {truck.truck_number} - {truck.driver_name}
                    </option>
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
    </section>
  );
};

export default CollectionSchedule;
