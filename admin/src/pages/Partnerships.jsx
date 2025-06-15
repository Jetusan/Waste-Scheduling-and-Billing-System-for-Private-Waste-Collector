import React from 'react';
import '../styles/Partnerships.css';

const Partnerships = () => {
  const partnerships = [
    { name: 'ACAN, LACAO', membership: 'All-in – Weekly garbage pickup', expiration: '02/05/2023 | 03:30 PM' },
    { name: 'VSM, LACAO', membership: 'Basic – 2x-a-month garbage pickup', expiration: '01/06/2023 | 09:00 AM' },
    { name: 'ACAN, LACAO', membership: 'Regular – 2x-a-month garbage pickup', expiration: '01/06/2024 | 12:15 PM' },
    { name: 'VSM, LACAO', membership: 'All-in – Weekly garbage pickup', expiration: '02/06/2024 | 11:46 AM' },
    { name: 'VSM, MABUHAY', membership: 'Basic – 2x-a-month garbage pickup', expiration: '02/06/2024 | 04:00 PM' },
    { name: 'ACAN, LACAO', membership: 'Regular – 2x-a-month garbage pickup', expiration: '02/06/2024 | 10:30 AM' },
    { name: 'CAMELLA', membership: 'All-in – Weekly garbage pickup', expiration: '01/06/2024 | 10:45 PM' }
  ];

  return (
        <section className="partnerships-content">
          <div className="partnerships-header">
            <input type="text" placeholder="Search partners..." />
            <button className="add-partner">+ Add New Partner</button>
          </div>
          
          <table className="partnerships-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type of Membership</th>
                <th>Date of Expiration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {partnerships.map((partner, index) => (
                <tr key={index}>
                  <td>{partner.name}</td>
                  <td>{partner.membership}</td>
                  <td>{partner.expiration}</td>
                  <td>
                    <button className="action-btn edit">Edit</button>
                    <button className="action-btn renew">Renew</button>
                    <button className="action-btn delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <span>Show</span>
            <select>
              <option>10</option>
              <option>25</option>
              <option>50</option>
            </select>
            <div className="pagination-controls">
              <button>Previous</button>
              <button>Next</button>
            </div>
          </div>
        </section>
  );
};

export default Partnerships;