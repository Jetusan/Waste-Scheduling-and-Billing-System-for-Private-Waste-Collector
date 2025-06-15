import React from 'react';
import '../styles/PricingRule.css';

const PricingRule = () => {
  const pricingRules = [
    { id: 'PF-001', location: 'Ayonu Ligoyo', wasteType: 'Household', weightRange: '0-20 kg', basePrice: 'P150', extraPrice: 'P10/kg', status: 'Active' },
    { id: 'PF-002', location: 'Ayonu Ligoyo', wasteType: 'Mixed/Heavy', weightRange: '0-10 kg', basePrice: 'P200', extraPrice: 'P15/kg', status: 'Active' }
  ];

  return (

        <section className="pricing-content">
          <div className="pricing-filters">
            <select>
              <option>All Locations</option>
              <option>Ayonu Ligoyo</option>
              <option>Other Location</option>
            </select>
            <select>
              <option>All Waste Types</option>
              <option>Household</option>
              <option>Mixed/Heavy</option>
            </select>
            <select>
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <button className="add-rule">+ Add New Rule</button>
          </div>
          
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Rule ID</th>
                <th>Location</th>
                <th>Waste Type</th>
                <th>Weight Range</th>
                <th>Base Price</th>
                <th>Extra Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.location}</td>
                  <td>{rule.wasteType}</td>
                  <td>{rule.weightRange}</td>
                  <td>{rule.basePrice}</td>
                  <td>{rule.extraPrice}</td>
                  <td>
                    <span className={`status-badge ${rule.status.toLowerCase()}`}>
                      {rule.status}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn edit">Edit</button>
                    <button className="action-btn toggle-status">
                      {rule.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
  );
};

export default PricingRule;