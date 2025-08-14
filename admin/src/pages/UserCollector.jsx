import React, { useState, useEffect } from 'react';
import '../styles/UsersCollectors.css';
import axios from 'axios';

const UsersCollectors = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [allUsers, setAllUsers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [newCollector, setNewCollector] = useState({ 
    firstName: '',
    middleName: '',
    lastName: '',
    username: '', 
    contact_number: '', 
    email: '',
    street: '',
    houseNumber: '',
    purok: '',
    barangay: '',
    city: 'General Santos City',
    landmark: '',
    license_number: '', 
    license_expiry_date: '',
    truck_id: '', 
    status: 'active', 
    password: '' 
  });
  const [showAddTruckModal, setShowAddTruckModal] = useState(false);
  const [newTruck, setNewTruck] = useState({ truck_number: '', plate_number: '', status: 'active' });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEditTruckModalOpen, setIsEditTruckModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  
  // Barangay state for collector registration
  const [barangays, setBarangays] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(false);
  
  // Submission loading state to prevent double submissions
  const [isSubmittingCollector, setIsSubmittingCollector] = useState(false);

  useEffect(() => {
    console.log('Tab changed to:', activeTab);
    if (activeTab === 'trucks') {
      fetchTrucks();
    } else {
      fetchData();
    }
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
          ...u, // keep all fields from backend
          truck_number: u.truck_number || 'No truck assigned',
          license_number: u.license_number || 'Not provided',
          status: u.status || 'inactive',
          joined: u.created_at,
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

  const fetchTrucks = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get('http://localhost:5000/api/trucks');
      setTrucks(data);
    } catch (err) {
      setError('Failed to load trucks. Please try again.');
      setTrucks([]);
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
          license_expiry_date: editingUser.license_expiry_date,
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

  const handleAddCollector = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingCollector) {
      console.log('⚠️ Submission already in progress, ignoring duplicate request');
      return;
    }
    
    setIsSubmittingCollector(true);
    setError(''); // Clear any previous errors
    
    try {
      console.log('🚀 Starting collector registration...');
      
      // Prepare the registration data to match the mobile app format
      const registrationData = {
        firstName: newCollector.firstName.trim(),
        middleName: newCollector.middleName.trim() || null,
        lastName: newCollector.lastName.trim(),
        username: newCollector.username.trim(),
        contactNumber: newCollector.contact_number.trim(),
        password: newCollector.password,
        confirmPassword: newCollector.password,
        city: newCollector.city,
        barangay: newCollector.barangay.trim(),
        street: newCollector.street.trim(),
        houseNumber: newCollector.houseNumber.trim() || null,
        purok: newCollector.purok.trim() || null,
        landmark: newCollector.landmark.trim() || null,
        email: newCollector.email.trim() || null,
        // Collector-specific fields
        license_number: newCollector.license_number.trim(),
        license_expiry_date: newCollector.license_expiry_date || null,
        truck_id: Number(newCollector.truck_id),
        status: newCollector.status,
        role: 'collector' // Specify role as collector
      };

      console.log('📝 Registration data prepared:', { username: registrationData.username });

      // Use the same registration endpoint as mobile app but for collectors
      const response = await axios.post('http://localhost:5000/api/collectors/register-optimized', registrationData);
      
      console.log('✅ Collector registered successfully:', response.data);
      
      setShowAddCollectorModal(false);
      setNewCollector({ 
        firstName: '',
        middleName: '',
        lastName: '',
        username: '', 
        contact_number: '', 
        email: '',
        street: '',
        houseNumber: '',
        purok: '',
        barangay: '',
        city: 'General Santos City',
        landmark: '',
        license_number: '', 
        license_expiry_date: '',
        truck_id: '', 
        status: 'active', 
        password: '' 
      });
      await fetchData();
    } catch (err) {
      console.error('❌ Error adding collector:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to add collector.');
    } finally {
      setIsSubmittingCollector(false);
    }
  };

  const handleAddTruck = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/trucks', newTruck);
      setShowAddTruckModal(false);
      setNewTruck({ truck_number: '', plate_number: '', status: 'active' });
      fetchTrucks();
    } catch (err) {
      setError('Failed to add truck.');
    }
  };

  const openEditModal = (user) => {
    console.log('Opening edit modal for user:', user);
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const openAddCollectorModal = async () => {
    await fetchTrucks();
    // Fetch barangays for the collector registration form
    setBarangayLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/barangays');
      setBarangays(response.data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
      setError('Failed to load barangays. Please try again.');
    } finally {
      setBarangayLoading(false);
    }
    setShowAddCollectorModal(true);
  };

  const openEditTruckModal = (truck) => {
    console.log('Opening edit modal for truck:', truck);
    setEditingTruck(truck);
    setIsEditTruckModalOpen(true);
  };

  const handleEditTruck = async (e) => {
    e.preventDefault();
    try {
      console.log('Editing truck:', editingTruck);

      const updateData = {
        truck_number: editingTruck.truck_number,
        plate_number: editingTruck.plate_number,
        status: editingTruck.status
      };

      console.log('Sending truck update request:', updateData);
      const response = await axios.put(`http://localhost:5000/api/trucks/${editingTruck.truck_id}`, updateData);
      console.log('Truck update response:', response.data);

      setIsEditTruckModalOpen(false);
      setEditingTruck(null);
      await fetchTrucks(); // Refresh the data
    } catch (err) {
      console.error('Error updating truck:', err.response?.data || err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || 'Failed to update truck. Please try again.';
      alert(errorMessage);
    }
  };

  const handleDeleteTruck = async (truckId) => {
    if (window.confirm('Are you sure you want to delete this truck? This action cannot be undone.')) {
      try {
        console.log('Deleting truck:', truckId);
        await axios.delete(`http://localhost:5000/api/trucks/${truckId}`);
        await fetchTrucks(); // Refresh the data
      } catch (err) {
        console.error('Error deleting truck:', err);
        const errorMessage = err.response?.data?.error || 'Failed to delete truck. Please try again.';
        alert(errorMessage);
      }
    }
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
          <button
            className={`toggle-btn ${activeTab === 'trucks' ? 'active' : ''}`}
            onClick={() => setActiveTab('trucks')}
          >
            Trucks
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
        <>
          {activeTab === 'subscribers' && (
            <div className="table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact #</th>
                    <th>Street</th>
                    <th>Barangay</th>
                    <th>City</th>
                    <th>Status</th>
                  </tr>
                </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-data">
                          No residents found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.user_id}>
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
                        </tr>
                      ))
                    )}
                  </tbody>
              </table>
            </div>
          )}
          {activeTab === 'collectors' && (
            <>
              <button className="simple-add-btn" onClick={openAddCollectorModal}>
                + Add Collector
              </button>
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Contact #</th>
                      <th>Truck #</th>
                      <th>License #</th>
                      <th>Status</th>
                      <th>Date Joined</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="no-data">
                          No collectors found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.collector_id || u.user_id}>
                          <td>{u.username}</td>
                          <td>{u.contact_number}</td>
                          <td>{u.truck_number || 'No truck assigned'}</td>
                          <td>{u.license_number || 'Not provided'}</td>
                          <td>
                            <span className={`status ${(u.status || 'inactive').toLowerCase()}`}>
                              {u.status || 'Inactive'}
                            </span>
                          </td>
                          <td>{u.joined ? new Date(u.joined).toLocaleDateString() : new Date(u.created_at).toLocaleDateString()}</td>
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
                                onClick={() => handleDelete(u.user_id, u.collector_id)}
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
              {showAddCollectorModal && error && (
                <div className="error-message" style={{ color: 'red', marginBottom: 10 }}>{error}</div>
              )}
              {showAddCollectorModal && (
                <div className="modal-overlay">
                  <div className="modal simple-modal" style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}>
                    <h3>Add Collector</h3>
                    <form onSubmit={handleAddCollector}>
                      {/* Personal Information */}
                      <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#666' }}>Personal Information</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <label>First Name *</label>
                            <input type="text" value={newCollector.firstName} onChange={e => setNewCollector({ ...newCollector, firstName: e.target.value })} required />
                          </div>
                          <div>
                            <label>Last Name *</label>
                            <input type="text" value={newCollector.lastName} onChange={e => setNewCollector({ ...newCollector, lastName: e.target.value })} required />
                          </div>
                        </div>
                        <label>Middle Name</label>
                        <input type="text" value={newCollector.middleName} onChange={e => setNewCollector({ ...newCollector, middleName: e.target.value })} />
                      </div>

                      {/* Account Information */}
                      <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#666' }}>Account Information</h4>
                        <label>Username *</label>
                        <input type="text" value={newCollector.username} onChange={e => setNewCollector({ ...newCollector, username: e.target.value })} required />
                        <label>Password *</label>
                        <input type="password" value={newCollector.password} onChange={e => setNewCollector({ ...newCollector, password: e.target.value })} required />
                        <label>Contact Number *</label>
                        <input type="text" value={newCollector.contact_number} onChange={e => setNewCollector({ ...newCollector, contact_number: e.target.value })} required placeholder="e.g., 09123456789" />
                        <label>Email</label>
                        <input type="email" value={newCollector.email} onChange={e => setNewCollector({ ...newCollector, email: e.target.value })} placeholder="optional" />
                      </div>

                      {/* Address Information */}
                      <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#666' }}>Address Information</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <label>House Number</label>
                            <input type="text" value={newCollector.houseNumber} onChange={e => setNewCollector({ ...newCollector, houseNumber: e.target.value })} placeholder="e.g., 123, Block 5" />
                          </div>
                          <div>
                            <label>Purok/Subdivision</label>
                            <input type="text" value={newCollector.purok} onChange={e => setNewCollector({ ...newCollector, purok: e.target.value })} placeholder="e.g., Purok 1" />
                          </div>
                        </div>
                        <label>Street Address *</label>
                        <input type="text" value={newCollector.street} onChange={e => setNewCollector({ ...newCollector, street: e.target.value })} required placeholder="e.g., Maharlika Street" />
                        <label>Barangay *</label>
                        {barangayLoading ? (
                          <input type="text" value="Loading barangays..." disabled />
                        ) : (
                          <select value={newCollector.barangay} onChange={e => setNewCollector({ ...newCollector, barangay: e.target.value })} required>
                            <option value="">Select Barangay</option>
                            {barangays.map(barangay => (
                              <option key={barangay.barangay_id} value={barangay.barangay_name}>{barangay.barangay_name}</option>
                            ))}
                          </select>
                        )}
                        <label>City</label>
                        <input type="text" value={newCollector.city} onChange={e => setNewCollector({ ...newCollector, city: e.target.value })} disabled style={{ backgroundColor: '#f5f5f5' }} />
                        <label>Landmark</label>
                        <input type="text" value={newCollector.landmark} onChange={e => setNewCollector({ ...newCollector, landmark: e.target.value })} placeholder="e.g., Near SM Mall" />
                      </div>

                      {/* Work Information */}
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#666' }}>Work Information</h4>
                        <label>License Number *</label>
                        <input type="text" value={newCollector.license_number} onChange={e => setNewCollector({ ...newCollector, license_number: e.target.value })} required />
                        <label>License Expiry Date</label>
                        <input type="date" value={newCollector.license_expiry_date} onChange={e => setNewCollector({ ...newCollector, license_expiry_date: e.target.value })} />
                        <label>Assigned Truck *</label>
                        <select value={newCollector.truck_id} onChange={e => setNewCollector({ ...newCollector, truck_id: e.target.value })} required>
                          <option value="">Select Truck</option>
                          {trucks.map(truck => (
                            <option key={truck.truck_id} value={truck.truck_id}>{truck.truck_number}</option>
                          ))}
                        </select>
                        <label>Status *</label>
                        <select value={newCollector.status} onChange={e => setNewCollector({ ...newCollector, status: e.target.value })} required>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="on_leave">On Leave</option>
                          <option value="suspended">Suspended</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="simple-cancel-btn" onClick={() => setShowAddCollectorModal(false)}>Cancel</button>
                        <button 
                          type="submit" 
                          className="simple-submit-btn" 
                          disabled={isSubmittingCollector}
                        >
                          {isSubmittingCollector ? 'Adding Collector...' : 'Add Collector'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
          {activeTab === 'trucks' && (
            <>
              <button className="simple-add-btn" onClick={() => setShowAddTruckModal(true)}>
                + Add Truck
              </button>
              <div className="table-container">
                <table className="users-table simple-table">
                  <thead>
                    <tr>
                      <th>Truck Number</th>
                      <th>Plate Number</th>
                      <th>Status</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trucks.length === 0 ? (
                      <tr><td colSpan={5} className="no-data">No trucks found</td></tr>
                    ) : (
                      trucks.map(truck => (
                        <tr key={truck.truck_id}>
                          <td>{truck.truck_number}</td>
                          <td>{truck.plate_number}</td>
                          <td>
                            <span className={`status ${(truck.status || 'active').toLowerCase()}`}>
                              {truck.status || 'Active'}
                            </span>
                          </td>
                          <td>{new Date(truck.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className="action-btn edit"
                                onClick={() => openEditTruckModal(truck)}
                                title="Edit"
                              >
                                <i className="fa-regular fa-pen-to-square"></i>
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDeleteTruck(truck.truck_id)}
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
              {showAddTruckModal && (
                <div className="modal-overlay">
                  <div className="modal simple-modal">
                    <h3>Add Truck</h3>
                    <form onSubmit={handleAddTruck}>
                      <label>Truck Number</label>
                      <input type="text" value={newTruck.truck_number} onChange={e => setNewTruck({ ...newTruck, truck_number: e.target.value })} required />
                      <label>Plate Number</label>
                      <input type="text" value={newTruck.plate_number} onChange={e => setNewTruck({ ...newTruck, plate_number: e.target.value })} required />
                      <label>Status</label>
                      <select value={newTruck.status} onChange={e => setNewTruck({ ...newTruck, status: e.target.value })} required>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="simple-cancel-btn" onClick={() => setShowAddTruckModal(false)}>Cancel</button>
                        <button type="submit" className="simple-submit-btn">Add</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </>
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
                    <label>License Expiry Date:</label>
                    <input
                      type="date"
                      value={editingUser.license_expiry_date}
                      onChange={e => setEditingUser({...editingUser, license_expiry_date: e.target.value})}
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
                      <option value="on_leave">On Leave</option>
                      <option value="suspended">Suspended</option>
                      <option value="terminated">Terminated</option>
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

      {/* Edit Truck Modal */}
      {isEditTruckModalOpen && editingTruck && (
        <div className="modal-overlay">
          <div className="modal simple-modal">
            <h3>Edit Truck</h3>
            <form onSubmit={handleEditTruck}>
              <label>Truck Number</label>
              <input 
                type="text" 
                value={editingTruck.truck_number} 
                onChange={e => setEditingTruck({ ...editingTruck, truck_number: e.target.value })} 
                required 
              />
              <label>Plate Number</label>
              <input 
                type="text" 
                value={editingTruck.plate_number} 
                onChange={e => setEditingTruck({ ...editingTruck, plate_number: e.target.value })} 
                required 
              />
              <label>Status</label>
              <select 
                value={editingTruck.status} 
                onChange={e => setEditingTruck({ ...editingTruck, status: e.target.value })} 
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="simple-cancel-btn" onClick={() => setIsEditTruckModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="simple-submit-btn">
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
