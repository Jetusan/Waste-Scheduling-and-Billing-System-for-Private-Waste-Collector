import React from 'react';
import '../styles/UsersCollectors.css';

const UsersCollectors = () => {
  return (
        <section className="users-collectors">
          <div className="filter-bar">
            <select className="status-filter">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input type="text" placeholder="Search..." className="search-input" />
          </div>
          
          <table className="users-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>User Name</th>
                <th>First & Last name</th>
                <th>Email</th>
                <th>Password</th>
                <th>Phone number</th>
                <th>Location</th>
                <th>Date Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="status-badge all-in">ALL-IN</span></td>
                <td>John Dee</td>
                <td>John Dee Dale Pena</td>
                <td>johndee123@gmail.com</td>
                <td>johndee</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
              <tr>
                <td><span className="status-badge all-in">ALL-IN</span></td>
                <td>Jane Smith</td>
                <td>Jane Smith Dale Pena</td>
                <td>janesmith@gmail.com</td>
                <td>janell32</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
              <tr>
                <td><span className="status-badge basic">BASIC</span></td>
                <td>David White</td>
                <td>David White Dale Pena</td>
                <td>davidwhite@gmail.com</td>
                <td>dlwidler423</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
              <tr>
                <td><span className="status-badge regular">REGULAR</span></td>
                <td>Dwayne Brown</td>
                <td>Dwayne Brown Dale Pena</td>
                <td>dwayne08@gmail.com</td>
                <td>brownl33</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
              <tr>
                <td><span className="status-badge due">DUE</span></td>
                <td>Christ Pol</td>
                <td>Christ Pol Dale Pena</td>
                <td>polChrist@gmail.com</td>
                <td>polChrist</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
              <tr>
                <td><span className="status-badge due">DUE</span></td>
                <td>Carl Sue</td>
                <td>Carl Sue Dale Pena</td>
                <td>C5ue@gmail.com</td>
                <td>scieff623</td>
                <td>09353232322</td>
                <td>Bharagay Lagna, Agan Lagna</td>
                <td>26/09/24 - 10:46 AM</td>
                <td>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
  );
};

export default UsersCollectors;