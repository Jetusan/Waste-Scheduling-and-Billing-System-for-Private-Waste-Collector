import React from 'react';
import '../styles/CollectionSchedule.css';

const CollectionSchedule = () => {
  return (
        <section className="collection-schedule">
          <div className="schedule-header">
            <h3>Collection Schedule</h3>
            <input type="text" placeholder="Search..." />
          </div>
          
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Collection ID</th>
                <th>Location</th>
                <th>Team Assigned</th>
                <th>Collection Day</th>
                <th>Start Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CL-002</td>
                <td>Agent Logue</td>
                <td>TB-001</td>
                <td>August 1, 2024</td>
                <td>BGO AM</td>
                <td></td>
              </tr>
              <tr>
                <td>CL-001</td>
                <td>Agent Logue</td>
                <td>TB-002</td>
                <td>August 1, 2024</td>
                <td>BGO AM</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </section>
  );
};

export default CollectionSchedule;