import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/UsersCollectors.css';
import axios from 'axios';
import API_CONFIG, { buildApiUrl } from '../config/api';

const UsersCollectors = () => {
  const [activeTab, setActiveTab] = useState('subscribers');
  const [allUsers, setAllUsers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [pendingError, setPendingError] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [actingOnId, setActingOnId] = useState(null);
  const [residentView, setResidentView] = useState('list'); // 'list' | 'pending'
  const [showAddCollectorModal, setShowAddCollectorModal] = useState(false);
  const [newCollector, setNewCollector] = useState({ 
    firstName: '',
    middleName: '',
    lastName: '',
    username: '', 
    contact_number: '', 
    street: '',
    houseNumber: '',
    purok: '',
    barangay: '',
    city: 'General Santos City',
    license_number: '', 
    license_expiry_date: '',
    truck_id: '', 
    status: 'active', 
    password: '',
    confirmPassword: ''
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Helper to normalize proof image URL coming from backend
  const getProofUrl = (url) => {
    try {
      if (!url) return null;
      // Normalize any Windows backslashes to forward slashes
      const cleaned = String(url).replace(/\\\\/g, '/').replace(/\\/g, '/');
      // If already absolute, return as-is
      if (/^https?:\/\//i.test(cleaned)) return cleaned;
      // Ensure leading slash then prefix backend origin
      const withSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
      return `${API_CONFIG.BASE_URL}${withSlash}`;
    } catch (_) {
      return null;
    }
  };

  // Barangay state for collector registration
  const [barangays, setBarangays] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(false);
  
  // Submission loading state to prevent double submissions
  const [isSubmittingCollector, setIsSubmittingCollector] = useState(false);
  // Wizard step and password strength (collector modal)
  const [currentCollectorStep, setCurrentCollectorStep] = useState(1); // 1..3
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-5

  // Password strength helper
  const calculatePasswordStrength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };

  // Step validators
  const validateCollectorStep1 = () => {
    if (!newCollector.firstName || newCollector.firstName.trim().length < 2) return 'First name is required (min 2 chars)';
    if (!newCollector.lastName || newCollector.lastName.trim().length < 2) return 'Last name is required (min 2 chars)';
    if (!newCollector.username || newCollector.username.trim().length < 4) return 'Username must be at least 4 characters';
    if (!newCollector.contact_number || !/^((09|\+639)\d{9})$/.test(newCollector.contact_number.trim())) return 'Please enter a valid Philippine contact number';
    return null;
  };

  const validateCollectorStep2 = () => {
    if (!newCollector.barangay) return 'Please select a barangay';
    if (!newCollector.street || newCollector.street.trim().length < 2) return 'Street is required';
    return null;
  };

  const validateCollectorStep3 = () => {
    if (!newCollector.password || newCollector.password.length < 8) return 'Password must be at least 8 characters';
    if (passwordStrength < 2) return 'Password is too weak';
    if (newCollector.password !== newCollector.confirmPassword) return 'Passwords do not match';
    if (!newCollector.license_number || newCollector.license_number.trim().length < 3) return 'License number is required';
    if (!newCollector.truck_id) return 'Please select a truck';
    if (!newCollector.status) return 'Please select status';
    return null;
  };

  const handleNextCollectorStep = () => {
    const validators = [validateCollectorStep1, validateCollectorStep2, validateCollectorStep3];
    const idx = currentCollectorStep - 1;
    const err = validators[idx]();
    if (err) {
      alert(err);
      return;
    }
    setCurrentCollectorStep(Math.min(3, currentCollectorStep + 1));
  };

  const handlePrevCollectorStep = () => {
    setCurrentCollectorStep(Math.max(1, currentCollectorStep - 1));
  };

  // Router
  const navigate = useNavigate();

  // Helper to produce detailed error messages for Axios
  const formatAxiosError = (err, context = 'Request failed') => {
    try {
      const status = err?.response?.status;
      const statusText = err?.response?.statusText;
      const data = err?.response?.data;
      const method = err?.config?.method?.toUpperCase();
      const url = err?.config?.url;
      const body = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : undefined;
      const lines = [];
      lines.push(`${context}`);
      if (method || url) lines.push(`Endpoint: ${method || 'GET'} ${url || ''}`.trim());
      if (status) lines.push(`Status: ${status}${statusText ? ' ' + statusText : ''}`);
      if (body) lines.push(`Response: ${body}`);
      if (!status && err?.message) lines.push(`Message: ${err.message}`);
      return lines.join('\n');
    } catch (_) {
      return context;
    }
  };

  

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'subscribers') {
        console.log('Fetching residents data...');
        const endpoint = buildApiUrl('/api/residents');
        const { data } = await axios.get(endpoint);
        console.log('Received residents data:', data);
        const normalized = data
          .filter(u => u.approval_status !== 'pending') // Filter out pending residents
          .map(u => ({
            resident_id: u.resident_id || u.user_id,
            user_id: u.user_id,
            full_name: `${u.first_name || ''} ${u.middle_name ? u.middle_name + ' ' : ''}${u.last_name || ''}`.trim(),
            first_name: u.first_name || '',
            middle_name: u.middle_name || '',
            last_name: u.last_name || '',
            username: u.username || '',
            email: u.email || '',
            contact_number: u.contact_number || '',
            street: u.street || '',
            barangay: u.barangay_name || u.barangay || '',
            city: u.city_name || u.city || 'General Santos City',
            subscription_status: u.subscription_status || 'inactive',
            approval_status: u.approval_status || 'approved', // Default to approved if not set
            joined: u.created_at,
            updated: u.updated_at
          }));
        console.log('Normalized residents data:', normalized);
        setAllUsers(normalized);
      } else {
        console.log('Fetching collectors data...');
        const endpoint = buildApiUrl('/api/collectors');
        const { data } = await axios.get(endpoint);
        console.log('Received collectors data:', data);
        const normalized = data.map(u => ({
          ...u, // keep all fields from backend
          truck_number: u.truck_number || 'No truck assigned',
          license_number: u.license_number || 'Not provided',
          truck_display: u.truck_number ? `${u.truck_number}${u.plate_number ? ` (${u.plate_number})` : ''}` : 'No truck assigned',
          status: u.employment_status || u.status || 'inactive', // Fix: backend returns employment_status
          joined: u.created_at,
        }));
        console.log('Normalized collectors data:', normalized);
        setAllUsers(normalized);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(formatAxiosError(err, 'Failed to load data.'));
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const fetchTrucks = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(buildApiUrl('/api/trucks'));
      setTrucks(data);
    } catch (err) {
      setError('Failed to load trucks. Please try again.');
      setTrucks([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending residents (admin-only endpoint, include token if present)
  const fetchPendingResidents = useCallback(async () => {
    setPendingLoading(true);
    setPendingError('');
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      if (!token) {
        setPendingError('Admin login required. Redirecting to login...');
        setPendingResidents([]);
        const redirect = '/admin/operations/subscribers?view=pending';
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = buildApiUrl('/api/residents/pending');
      const { data } = await axios.get(endpoint, { headers });
      if (data && data.success) {
        setPendingResidents(data.users || []);
      } else {
        setPendingResidents([]);
        setPendingError(data?.message || 'Failed to load pending residents.');
      }
    } catch (err) {
      console.error('Error fetching pending residents:', err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Clear any bad token and prompt login
        localStorage.removeItem('adminToken');
        setPendingError('Session expired or unauthorized. Redirecting to login...');
        const redirect = '/admin/operations/subscribers?view=pending';
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      } else {
        setPendingError(formatAxiosError(err, 'Failed to load pending residents.'));
      }
      setPendingResidents([]);
    } finally {
      setPendingLoading(false);
    }
  }, [navigate]);

  // Place effect after callbacks are defined
  useEffect(() => {
    console.log('Tab changed to:', activeTab);
    if (activeTab === 'trucks') {
      fetchTrucks();
    } else if (activeTab === 'subscribers') {
      if (residentView === 'pending') {
        fetchPendingResidents();
      } else {
        fetchData();
      }
    } else {
      fetchData();
    }
  }, [activeTab, residentView, fetchData, fetchPendingResidents]);

  const approveResident = async (userId) => {
    if (!userId) return;
    try {
      setActingOnId(userId);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = buildApiUrl(`/api/residents/${userId}/approve`);
      const { data } = await axios.post(endpoint, { accept: true }, { headers });
      if (!data?.success) {
        alert(`Approve failed\n${data?.message || ''}`.trim());
      }
      await fetchPendingResidents();
    } catch (err) {
      console.error('Approve error:', err);
      alert(formatAxiosError(err, 'Failed to approve resident.'));
    } finally {
      setActingOnId(null);
    }
  };

  const rejectResident = async (userId) => {
    if (!userId) return;
    const reason = window.prompt('Enter rejection reason (optional):') || '';
    try {
      setActingOnId(userId);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = buildApiUrl(`/api/residents/${userId}/approve`);
      const { data } = await axios.post(endpoint, { accept: false, reason }, { headers });
      if (!data?.success) {
        alert(`Reject failed\n${data?.message || ''}`.trim());
      }
      await fetchPendingResidents();
    } catch (err) {
      console.error('Reject error:', err);
      alert(formatAxiosError(err, 'Failed to reject resident.'));
    } finally {
      setActingOnId(null);
    }
  };

  

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      console.log('Editing user:', editingUser);

      // Use the correct ID for the API endpoint
      const url = activeTab === 'subscribers'
        ? buildApiUrl(`/api/residents/${editingUser.resident_id}`)
        : buildApiUrl(`/api/collectors/${editingUser.collector_id}`);

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
          ? buildApiUrl(`/api/residents/${recordId}`)
          : buildApiUrl(`/api/collectors/${recordId}`);
        
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

    // Run all validators before submit
    const validators = [validateCollectorStep1, validateCollectorStep2, validateCollectorStep3];
    for (let i = 0; i < validators.length; i++) {
      const err = validators[i]();
      if (err) {
        alert(err);
        setCurrentCollectorStep(i + 1);
        return;
      }
    }

    if (isSubmittingCollector) return;
    setIsSubmittingCollector(true);
    setError('');

    try {
      console.log('🚀 Starting collector registration...');

      const registrationData = {
        firstName: newCollector.firstName.trim(),
        middleName: newCollector.middleName.trim() || null,
        lastName: newCollector.lastName.trim(),
        username: newCollector.username.trim(),
        contactNumber: newCollector.contact_number.trim(),
        password: newCollector.password,
        city: newCollector.city,
        barangay: newCollector.barangay.trim(),
        street: newCollector.street.trim(),
        houseNumber: newCollector.houseNumber.trim() || null,
        purok: newCollector.purok.trim() || null,
        
        license_number: newCollector.license_number.trim(),
        license_expiry_date: newCollector.license_expiry_date || null,
        truck_id: newCollector.truck_id ? Number(newCollector.truck_id) : null,
        status: newCollector.status,
        role: 'collector'
      };

      console.log('📝 Registration data prepared:', { username: registrationData.username });
      const resp = await axios.post(buildApiUrl('/api/collectors/register-optimized'), registrationData);
      console.log('✅ Collector added:', resp.data);

      // Reset
      setShowAddCollectorModal(false);
      setNewCollector({ 
        firstName: '',
        middleName: '',
        lastName: '',
        username: '', 
        contact_number: '', 
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
        password: '',
        confirmPassword: ''
      });
      setCurrentCollectorStep(1);
      await fetchData();
    } catch (err) {
      console.error('Error adding collector:', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to add collector.';
      setError(msg);
      alert(msg);
    } finally {
      setIsSubmittingCollector(false);
    }
  };

  const handleAddTruck = async (e) => {
    e.preventDefault();
    try {
      await axios.post(buildApiUrl('/api/trucks'), newTruck);
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
      const response = await axios.get(buildApiUrl('/api/barangays'));
      setBarangays(response.data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
      setError('Failed to load barangays. Please try again.');
    } finally {
      setBarangayLoading(false);
    }
    setCurrentCollectorStep(1);
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
      const response = await axios.put(buildApiUrl(`/api/trucks/${editingTruck.truck_id}`), updateData);
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
        await axios.delete(buildApiUrl(`/api/trucks/${truckId}`));
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
            <>
              <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
                <button
                  className={`toggle-btn ${residentView === 'list' ? 'active' : ''}`}
                  onClick={() => setResidentView('list')}
                >
                  List of Residents
                </button>
                <button
                  className={`toggle-btn ${residentView === 'pending' ? 'active' : ''}`}
                  onClick={() => setResidentView('pending')}
                >
                  Pending
                </button>
              </div>
              {residentView === 'list' ? (
                <div className="table-container">
                  {loading ? (
                    <div className="loading">Loading...</div>
                  ) : (
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
                            <td colSpan={6} className="no-data">No residents found</td>
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
                  )}
                </div>
              ) : (
                <div className="table-container">
                  {pendingError && <div className="error-message">{pendingError}</div>}
                  {pendingLoading ? (
                    <div className="loading">Loading pending residents...</div>
                  ) : (
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Proof</th>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Contact</th>
                          <th>Address</th>
                          <th>Joined</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingResidents.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="no-data">No pending residents</td>
                          </tr>
                        ) : (
                          pendingResidents.map(u => (
                            <tr key={u.user_id}>
                              <td>
                                {u.validation_image_url ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <img
                                      src={getProofUrl(u.validation_image_url)}
                                      alt="proof"
                                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid #ddd' }}
                                      onClick={() => { setPreviewUrl(getProofUrl(u.validation_image_url)); setIsPreviewOpen(true); }}
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    <button
                                      type="button"
                                      className="action-btn edit"
                                      onClick={() => { setPreviewUrl(getProofUrl(u.validation_image_url)); setIsPreviewOpen(true); }}
                                      title="View proof"
                                    >
                                      View
                                    </button>
                                  </div>
                                ) : (
                                  <span>N/A</span>
                                )}
                              </td>
                              <td>{[u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ')}</td>
                              <td>{u.username}</td>
                              <td>{u.contact_number || '—'}</td>
                              <td>{u.full_address || [u.block, u.lot, u.subdivision, u.street, u.city_municipality].filter(Boolean).join(', ')}</td>
                              <td>{u.created_at ? new Date(u.created_at).toLocaleString() : ''}</td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    className="action-btn edit"
                                    onClick={() => approveResident(u.user_id)}
                                    disabled={actingOnId === u.user_id}
                                    title="Approve"
                                  >
                                    {actingOnId === u.user_id ? 'Approving...' : 'Approve'}
                                  </button>
                                  <button
                                    className="action-btn delete"
                                    onClick={() => rejectResident(u.user_id)}
                                    disabled={actingOnId === u.user_id}
                                    title="Reject"
                                  >
                                    {actingOnId === u.user_id ? 'Rejecting...' : 'Reject'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
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
                          <td>{u.truck_display || u.truck_number || 'No truck assigned'}</td>
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
                  <div className="modal simple-modal" style={{ maxWidth: '640px', maxHeight: '85vh', overflow: 'auto' }}>
                    <h3 style={{ marginBottom: 8 }}>Add Collector</h3>
                    {/* Stepper */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {[1,2,3].map(s => (
                        <div key={s} style={{ flex: 1, height: 6, borderRadius: 4, background: s <= currentCollectorStep ? '#2c7be5' : '#e5e7eb' }} />
                      ))}
                    </div>
                    <form onSubmit={handleAddCollector}>
                      {currentCollectorStep === 1 && (
                        <div style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>Personal & Account</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                              <label>First Name *</label>
                              <input type="text" value={newCollector.firstName} onChange={e => setNewCollector({ ...newCollector, firstName: e.target.value })} />
                            </div>
                            <div>
                              <label>Last Name *</label>
                              <input type="text" value={newCollector.lastName} onChange={e => setNewCollector({ ...newCollector, lastName: e.target.value })} />
                            </div>
                          </div>
                          <label>Middle Name</label>
                          <input type="text" value={newCollector.middleName} onChange={e => setNewCollector({ ...newCollector, middleName: e.target.value })} />

                          <label>Username *</label>
                          <input type="text" value={newCollector.username} onChange={e => setNewCollector({ ...newCollector, username: e.target.value })} />

                          <label>Contact Number *</label>
                          <input type="text" value={newCollector.contact_number} onChange={e => setNewCollector({ ...newCollector, contact_number: e.target.value })} placeholder="e.g., 09123456789" />
                        </div>
                      )}

                      {currentCollectorStep === 2 && (
                        <div style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>Address</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                          <input type="text" value={newCollector.street} onChange={e => setNewCollector({ ...newCollector, street: e.target.value })} placeholder="e.g., Maharlika Street" />
                          <label>Barangay *</label>
                          {barangayLoading ? (
                            <input type="text" value="Loading barangays..." disabled />
                          ) : (
                            <select value={newCollector.barangay} onChange={e => setNewCollector({ ...newCollector, barangay: e.target.value })}>
                              <option value="">Select Barangay</option>
                              {barangays.map(barangay => (
                                <option key={barangay.barangay_id} value={barangay.barangay_name}>{barangay.barangay_name}</option>
                              ))}
                            </select>
                          )}
                          <label>City</label>
                          <input type="text" value={newCollector.city} onChange={e => setNewCollector({ ...newCollector, city: e.target.value })} disabled style={{ backgroundColor: '#f5f5f5' }} />
                        </div>
                      )}

                      {currentCollectorStep === 3 && (
                        <div style={{ marginBottom: 12 }}>
                          <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>Security & Work</h4>
                          <label>Password *</label>
                          <input type="password" value={newCollector.password} onChange={e => { const v = e.target.value; setNewCollector({ ...newCollector, password: v }); setPasswordStrength(calculatePasswordStrength(v)); }} />
                          <div style={{ height: 6, borderRadius: 4, background: '#e5e7eb', margin: '6px 0 10px 0' }}>
                            <div style={{ height: '100%', width: `${(passwordStrength/5)*100}%`, background: passwordStrength >= 3 ? '#16a34a' : '#f59e0b', borderRadius: 4 }} />
                          </div>
                          <label>Confirm Password *</label>
                          <input type="password" value={newCollector.confirmPassword} onChange={e => setNewCollector({ ...newCollector, confirmPassword: e.target.value })} />

                          <label>License Number *</label>
                          <input type="text" value={newCollector.license_number} onChange={e => setNewCollector({ ...newCollector, license_number: e.target.value })} />
                          <label>License Expiry Date</label>
                          <input type="date" value={newCollector.license_expiry_date} onChange={e => setNewCollector({ ...newCollector, license_expiry_date: e.target.value })} />
                          <label>Assigned Truck *</label>
                          <select value={newCollector.truck_id} onChange={e => setNewCollector({ ...newCollector, truck_id: e.target.value })}>
                            <option value="">Select Truck</option>
                            {trucks.map(truck => (
                              <option key={truck.truck_id} value={truck.truck_id}>{truck.truck_number}</option>
                            ))}
                          </select>
                          <label>Status *</label>
                          <select value={newCollector.status} onChange={e => setNewCollector({ ...newCollector, status: e.target.value })}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="on_leave">On Leave</option>
                            <option value="suspended">Suspended</option>
                            <option value="terminated">Terminated</option>
                          </select>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16 }}>
                        <button type="button" className="simple-cancel-btn" onClick={() => setShowAddCollectorModal(false)}>Cancel</button>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {currentCollectorStep > 1 && (
                            <button type="button" className="simple-cancel-btn" onClick={handlePrevCollectorStep}>Back</button>
                          )}
                          {currentCollectorStep < 3 ? (
                            <button type="button" className="simple-submit-btn" onClick={handleNextCollectorStep}>Next</button>
                          ) : (
                            <button type="submit" className="simple-submit-btn" disabled={isSubmittingCollector}>
                              {isSubmittingCollector ? 'Adding...' : 'Add Collector'}
                            </button>
                          )}
                        </div>
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
          {isPreviewOpen && (
            <div className="modal-overlay" onClick={() => { setIsPreviewOpen(false); setPreviewUrl(null); }}>
              <div
                className="modal simple-modal"
                style={{ maxWidth: '90vw', maxHeight: '90vh', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>Proof Image</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {previewUrl && (
                      <a href={previewUrl} target="_blank" rel="noreferrer" className="simple-submit-btn">Open in new tab</a>
                    )}
                    <button className="simple-cancel-btn" onClick={() => { setIsPreviewOpen(false); setPreviewUrl(null); }}>Close</button>
                  </div>
                </div>
                {previewUrl ? (
                  <img src={previewUrl} alt="Proof large preview" style={{ maxWidth: '88vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }} />
                ) : (
                  <div>No image to preview</div>
                )}
              </div>
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
        </>
      )}
    </section>
  );
};

export default UsersCollectors;
