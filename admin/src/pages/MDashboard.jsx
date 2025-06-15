import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/MDashboard.css';

const data = [
  { name: 'TW-001', Weekly: 23000, Monthly: 20000, Yearly: 18000 },
  { name: 'TW-002', Weekly: 21500, Monthly: 19500, Yearly: 17500 },
  { name: 'TW-003', Weekly: 20000, Monthly: 18000, Yearly: 16500 },
  { name: 'TW-004', Weekly: 19000, Monthly: 17000, Yearly: 16000 },
  { name: 'TW-005', Weekly: 18500, Monthly: 16500, Yearly: 15000 },
  { name: 'TW-006', Weekly: 17000, Monthly: 15000, Yearly: 14000 },
  { name: 'TW-007', Weekly: 16000, Monthly: 14500, Yearly: 13500 },
  { name: 'TW-008', Weekly: 16500, Monthly: 15000, Yearly: 14000 },
];

const Dashboard = () => {
  return (
      <div>
        <section className="stats">
          <div className="stat-card">
            <h3>100 Users</h3>
            <p>Total Users</p>
          </div>
          <div className="stat-card">
            <h3>20 Partnership</h3>
            <p>Total Partnership</p>
          </div>
        </section>

        <section className="content-area">
          <div className="alerts">
            <h3>Alerts & Notifications</h3>
            <div className="filter-bar">
              <input type="text" placeholder="Search..." />
              <select><option>Date</option></select>
              <select><option>Time</option></select>
            </div>
            <table className="alerts-table">
              <thead>
                <tr><th>Type</th><th>Description</th><th>Timestamp</th></tr>
              </thead>
              <tbody>
                <tr><td>Overdue Subscription</td><td>John Dela Cruz scanned 5 GDTs in Pasig City.</td><td>01/12/2025 | 10:43 AM</td></tr>
                <tr><td>Miss Collection</td><td>Team 004 reassigned to override pin location 5 in Pasig City.</td><td>01/12/2025 | 10:42 AM</td></tr>
                <tr><td>Overdue Collection</td><td>John Dela Cruz scanned 5 GDTs in Pasig City.</td><td>01/12/2025 | 10:42 AM</td></tr>
                <tr><td>Route Adjustment</td><td>Team 004 reassigned to override pin location 5 in Pasig City.</td><td>01/12/2025 | 10:42 AM</td></tr>
              </tbody>
            </table>
            <div className="pagination">Show | ◀️ 1 2 3 ▶️</div>
          </div>

          <div className="chart">
            <h3>Total Waste Collected</h3>
            <p>Total Waste collected is Waste Collected by the collectors for weekly, monthly and yearly.</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Weekly" fill="#6EE7B7" />
                <Bar dataKey="Monthly" fill="#34D399" />
                <Bar dataKey="Yearly" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        </div>
  );
};

export default Dashboard;
