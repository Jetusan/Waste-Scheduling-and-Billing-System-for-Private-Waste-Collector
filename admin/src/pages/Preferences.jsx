import React, { useState } from 'react';
import '../styles/Preferences.css';

const Preferences = () => {
  const [preferences, setPreferences] = useState({
    appearance: {
      theme: 'light',
      sidebarCollapsed: false,
      fontSize: 'medium',
      compactView: false
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      notifyOn: {
        newSubscriber: true,
        paymentReceived: true,
        scheduleChanges: true,
        systemUpdates: true
      },
      digestFrequency: 'daily'
    },
    dashboard: {
      defaultView: 'overview',
      showStats: true,
      showCharts: true,
      showRecentActivity: true
    },
    reporting: {
      defaultDateRange: '7days',
      autoExport: false,
      exportFormat: 'pdf',
      includeCharts: true
    },
    system: {
      language: 'en',
      timezone: 'UTC+8',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h'
    }
  });

  const handleChange = (section, setting, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [setting]: value
      }
    }));
  };

  const handleNotificationToggle = (event) => {
    const { name, checked } = event.target;
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        notifyOn: {
          ...prev.notifications.notifyOn,
          [name]: checked
        }
      }
    }));
  };

  const savePreferences = () => {
    // Here you would typically save to backend
    console.log('Saving preferences:', preferences);
    // Show success message
    alert('Preferences saved successfully!');
  };

  return (
    <div className="preferences-container">
      {/* Appearance Section */}
      <section className="preferences-section">
        <div className="section-header">
          <i className="fas fa-palette"></i>
          <h2>Appearance</h2>
        </div>
        <div className="section-content">
          <div className="preference-group">
            <label>Theme</label>
            <select 
              value={preferences.appearance.theme}
              onChange={(e) => handleChange('appearance', 'theme', e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="preference-group">
            <label>Font Size</label>
            <select
              value={preferences.appearance.fontSize}
              onChange={(e) => handleChange('appearance', 'fontSize', e.target.value)}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="preference-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.appearance.compactView}
                onChange={(e) => handleChange('appearance', 'compactView', e.target.checked)}
              />
              Compact View
            </label>
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="preferences-section">
        <div className="section-header">
          <i className="fas fa-bell"></i>
          <h2>Notifications</h2>
        </div>
        <div className="section-content">
          <div className="preference-group">
            <h3>Notification Channels</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.notifications.emailNotifications}
                onChange={(e) => handleChange('notifications', 'emailNotifications', e.target.checked)}
              />
              Email Notifications
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.notifications.pushNotifications}
                onChange={(e) => handleChange('notifications', 'pushNotifications', e.target.checked)}
              />
              Push Notifications
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.notifications.smsNotifications}
                onChange={(e) => handleChange('notifications', 'smsNotifications', e.target.checked)}
              />
              SMS Notifications
            </label>
          </div>

          <div className="preference-group">
            <h3>Notify Me On</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="newSubscriber"
                checked={preferences.notifications.notifyOn.newSubscriber}
                onChange={handleNotificationToggle}
              />
              New Subscriber Registration
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="paymentReceived"
                checked={preferences.notifications.notifyOn.paymentReceived}
                onChange={handleNotificationToggle}
              />
              Payment Received
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="scheduleChanges"
                checked={preferences.notifications.notifyOn.scheduleChanges}
                onChange={handleNotificationToggle}
              />
              Schedule Changes
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="systemUpdates"
                checked={preferences.notifications.notifyOn.systemUpdates}
                onChange={handleNotificationToggle}
              />
              System Updates
            </label>
          </div>

          <div className="preference-group">
            <label>Digest Frequency</label>
            <select
              value={preferences.notifications.digestFrequency}
              onChange={(e) => handleChange('notifications', 'digestFrequency', e.target.value)}
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="preferences-section">
        <div className="section-header">
          <i className="fas fa-chart-line"></i>
          <h2>Dashboard</h2>
        </div>
        <div className="section-content">
          <div className="preference-group">
            <label>Default View</label>
            <select
              value={preferences.dashboard.defaultView}
              onChange={(e) => handleChange('dashboard', 'defaultView', e.target.value)}
            >
              <option value="overview">Overview</option>
              <option value="analytics">Analytics</option>
              <option value="activity">Activity</option>
            </select>
          </div>

          <div className="preference-group">
            <h3>Display Elements</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.dashboard.showStats}
                onChange={(e) => handleChange('dashboard', 'showStats', e.target.checked)}
              />
              Show Statistics Cards
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.dashboard.showCharts}
                onChange={(e) => handleChange('dashboard', 'showCharts', e.target.checked)}
              />
              Show Charts
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.dashboard.showRecentActivity}
                onChange={(e) => handleChange('dashboard', 'showRecentActivity', e.target.checked)}
              />
              Show Recent Activity
            </label>
          </div>
        </div>
      </section>

      {/* Reporting Section */}
      <section className="preferences-section">
        <div className="section-header">
          <i className="fas fa-file-alt"></i>
          <h2>Reporting</h2>
        </div>
        <div className="section-content">
          <div className="preference-group">
            <label>Default Date Range</label>
            <select
              value={preferences.reporting.defaultDateRange}
              onChange={(e) => handleChange('reporting', 'defaultDateRange', e.target.value)}
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="preference-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.reporting.autoExport}
                onChange={(e) => handleChange('reporting', 'autoExport', e.target.checked)}
              />
              Enable Automatic Export
            </label>
          </div>

          <div className="preference-group">
            <label>Export Format</label>
            <select
              value={preferences.reporting.exportFormat}
              onChange={(e) => handleChange('reporting', 'exportFormat', e.target.value)}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </section>

      {/* System Section */}
      <section className="preferences-section">
        <div className="section-header">
          <i className="fas fa-cog"></i>
          <h2>System</h2>
        </div>
        <div className="section-content">
          <div className="preference-group">
            <label>Language</label>
            <select
              value={preferences.system.language}
              onChange={(e) => handleChange('system', 'language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>

          <div className="preference-group">
            <label>Time Zone</label>
            <select
              value={preferences.system.timezone}
              onChange={(e) => handleChange('system', 'timezone', e.target.value)}
            >
              <option value="UTC+8">UTC+8 (Philippine Time)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="UTC-5">UTC-5 (Eastern Time)</option>
            </select>
          </div>

          <div className="preference-group">
            <label>Date Format</label>
            <select
              value={preferences.system.dateFormat}
              onChange={(e) => handleChange('system', 'dateFormat', e.target.value)}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div className="preference-group">
            <label>Time Format</label>
            <select
              value={preferences.system.timeFormat}
              onChange={(e) => handleChange('system', 'timeFormat', e.target.value)}
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
      </section>

      <div className="preferences-actions">
        <button className="save-button" onClick={savePreferences}>
          <i className="fas fa-save"></i> Save Preferences
        </button>
      </div>
    </div>
  );
};

export default Preferences; 