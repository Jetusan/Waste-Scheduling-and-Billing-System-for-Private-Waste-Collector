import React, { useState } from 'react';
import '../styles/Profile.css';

const Profile = () => {
  const [profileData, setProfileData] = useState({
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Administrator'
  });

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    // TODO: Implement profile update logic
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <i className="fas fa-user" />
          </div>
          <h2>Profile Settings</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <input
              type="text"
              value={profileData.role}
              disabled
            />
          </div>

          <div className="form-group">
            <label>Change Password</label>
            <input
              type="password"
              placeholder="New Password"
            />
          </div>

          <button type="submit" className="update-btn">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile; 