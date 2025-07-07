import React, { useState, useEffect } from 'react';
import '../styles/UsersCollectors.css';
import axios from 'axios';

const UsersCollectors = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    console.log('Tab changed to:', activeTab);
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'subscribers') {
        console.log('Fetching residents data...');
        const { data } = await axios.get('http://localhost:5000/api/residents');
        console.log('Received residents data:', data);
        const normalized = data.map(u => ({
          resident_id: u.resident_id,
          user_id: u.user_id,
          full_name: `${u.first_name || ''} ${u.middle_name ? u.middle_name + ' ' : ''}${u.last_name || ''}`.trim(),
          first_name: u.first_name || '',
          middle_name: u.middle_name || '',
          last_name: u.last_name || '',
          contact_number: u.contact_number || '',
          street: u.street || '',
          barangay: u.barangay_name || '',
          city: u.city_name || '',
          subscription_status: u.subscription_status || 'inactive',
          joined: u.created_at,
          updated: u.updated_at
        }));
        console.log('Normalized residents data:', normalized);
        setAllUsers(normalized);
      } else {
        console.log('Fetching collectors data...');
        const { data } = await axios.get('http://localhost:5000/api/collectors');
        console.log('Received collectors data:', data);
        const normalized = data.map(u => ({
          collector_id: u.collector_id,
          user_id: u.user_id,
          username: u.username || '',
          contact_number: u.contact_number || '',
          truck_number: u.truck_number || 'No truck assigned',
          license_number: u.license_number || 'Not provided',
          status: u.status || 'inactive',
          joined: u.created_at,
          updated: u.updated_at
        }));
        console.log('Normalized collectors data:', normalized);
        setAllUsers(normalized);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e) => {
    const fullName = e.target.value;
    const nameParts = fullName.split(' ').filter(part => part.trim() !== '');
    
    // Handle cases where there might be multiple spaces between names
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    setEditingUser({
      ...editingUser,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      console.log('Editing user:', editingUser);

      // Use the correct ID for the API endpoint
      const url = activeTab === 'subscribers'
        ? `http://localhost:5000/api/residents/${editingUser.resident_id}`
        : `http://localhost:5000/api/collectors/${editingUser.collector_id}`;

      let updateData;
      if (activeTab === 'subscribers') {
        updateData = {
          first_name: editingUser.first_name,
          middle_name: editingUser.middle_name,
          last_name: editingUser.last_name,
          contact_number: editingUser.contact_number,
          street: editingUser.street,
          barangay: editingUser.barangay,
          city: editingUser.city,
          subscription_status: editingUser.subscription_status
        };
      } else {
        updateData = {
          username: editingUser.username,
          contact_number: editingUser.contact_number,
          truck_number: editingUser.truck_number,
          license_number: editingUser.license_number,
          status: editingUser.status
        };
      }

      console.log('Sending update request:', { url, data: updateData });
      const response = await axios.put(url, updateData);
      console.log('Update response:', response.data);

      setIsEditModalOpen(false);
      setEditingUser(null);
      await fetchData(); // Refresh the data
    } catch (err) {
      console.error('Error updating:', err.response?.data || err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || 'Failed to update. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDelete = async (userId, recordId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        const url = activeTab === 'subscribers'
          ? `http://localhost:5000/api/residents/${recordId}`
          : `http://localhost:5000/api/collectors/${recordId}`;
        
        console.log('Deleting record:', { url, recordId });
        await axios.delete(url);
        await fetchData();
      } catch (err) {
        console.error('Error deleting:', err);
        alert('Failed to delete. Please try again.');
      }
    }
  };

  const openEditModal = (user) => {
    console.log('Opening edit modal for user:', user);
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const filteredUsers = allUsers.filter(u => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    if (activeTab === 'subscribers') {
      return (
        (u.full_name || '').toLowerCase().includes(term) ||
        (u.contact_number || '').toLowerCase().includes(term) ||
        (u.barangay || '').toLowerCase().includes(term) ||
        (u.subscription_status || '').toLowerCase().includes(term)
      );
    }
    return (
      (u.username || '').toLowerCase().includes(term) ||
      (u.contact_number || '').toLowerCase().includes(term) ||
      (u.license_number || '').toLowerCase().includes(term) ||
      (u.truck_number || '').toLowerCase().includes(term) ||
      (u.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <section className="users-collectors">
      <div className="page-header">
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${activeTab === 'subscribers' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscribers')}
          >
            Residents
          </button>
          <button
            className={`toggle-btn ${activeTab === 'collectors' ? 'active' : ''}`}
            onClick={() => setActiveTab('collectors')}
          >
            Collectors
          </button>
        </div>

        <div className="filter-bar">
          <input
            type="text"
            placeholder={activeTab === 'subscribers' 
              ? "Search by name, contact, barangay or status..."
              : "Search by username, contact, license or truck number..."}
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                {activeTab === 'subscribers' ? (
                  <>
                    <th>Name</th>
                    <th>Contact #</th>
                    <th>Street</th>
                    <th>Barangay</th>
                    <th>City</th>
                    <th>Status</th>
                  </>
                ) : (
                  <>
                    <th>Username</th>
                    <th>Contact #</th>
                    <th>Truck #</th>
                    <th>License #</th>
                    <th>Status</th>
                  </>
                )}
                <th>Date Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'subscribers' ? 8 : 7}
                    className="no-data"
                  >
                    {`No ${activeTab === 'subscribers' ? 'residents' : 'collectors'} found`}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.user_id}>
                    {activeTab === 'subscribers' ? (
                      <>
                        <td>{u.full_name}</td>
                        <td>{u.contact_number}</td>
                        <td>{u.street}</td>
                        <td>{u.barangay}</td>
                        <td>{u.city}</td>
                        <td>
                          <span className={`status ${(u.subscription_status || 'inactive').toLowerCase()}`}>
                            {u.subscription_status || 'Inactive'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.username}</td>
                        <td>{u.contact_number}</td>
                        <td>{u.truck_number}</td>
                        <td>{u.license_number}</td>
                        <td>
                          <span className={`status ${(u.status || 'inactive').toLowerCase()}`}>
                            {u.status || 'Inactive'}
                          </span>
                        </td>
                      </>
                    )}
                    <td>{new Date(u.joined).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="action-btn edit"
                          onClick={() => openEditModal(u)}
                          title="Edit"
                        >
                          <i className="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(u.user_id, activeTab === 'subscribers' ? u.resident_id : u.collector_id)}
                          title="Delete"
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit {activeTab === 'subscribers' ? 'Resident' : 'Collector'}</h3>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>
                <i className="fa fa-times" />
              </button>
            </div>
            <form onSubmit={handleEdit}>
              {activeTab === 'subscribers' ? (
                <>
                  <div className="form-group">
                    <label>First Name:</label>
                    <input
                      type="text"
                      value={editingUser.first_name}
                      onChange={e => setEditingUser({...editingUser, first_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Middle Name:</label>
                    <input
                      type="text"
                      value={editingUser.middle_name}
                      onChange={e => setEditingUser({...editingUser, middle_name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name:</label>
                    <input
                      type="text"
                      value={editingUser.last_name}
                      onChange={e => setEditingUser({...editingUser, last_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number:</label>
                    <input
                      type="text"
                      value={editingUser.contact_number}
                      onChange={e => setEditingUser({...editingUser, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Street:</label>
                    <input
                      type="text"
                      value={editingUser.street}
                      onChange={e => setEditingUser({...editingUser, street: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Barangay:</label>
                    <input
                      type="text"
                      value={editingUser.barangay}
                      onChange={e => setEditingUser({...editingUser, barangay: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>City:</label>
                    <input
                      type="text"
                      value={editingUser.city}
                      onChange={e => setEditingUser({...editingUser, city: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Subscription Status:</label>
                    <select
                      value={editingUser.subscription_status}
                      onChange={e => setEditingUser({...editingUser, subscription_status: e.target.value})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Username:</label>
                    <input
                      type="text"
                      value={editingUser.username}
                      onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Number:</label>
                    <input
                      type="text"
                      value={editingUser.contact_number}
                      onChange={e => setEditingUser({...editingUser, contact_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Truck Number:</label>
                    <input
                      type="text"
                      value={editingUser.truck_number}
                      onChange={e => setEditingUser({...editingUser, truck_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>License Number:</label>
                    <input
                      type="text"
                      value={editingUser.license_number}
                      onChange={e => setEditingUser({...editingUser, license_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status:</label>
                    <select
                      value={editingUser.status}
                      onChange={e => setEditingUser({...editingUser, status: e.target.value})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default UsersCollectors;
