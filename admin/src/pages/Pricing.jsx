import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Pricing.css';
import API_CONFIG from '../config/api';

const API_BASE_URL = `${API_CONFIG.BASE_URL}/api`;

const Pricing = () => {
  const [pricingConfig, setPricingConfig] = useState({
    subscription: {
      fullPlan: {
        price: 199.00,
        extraBagCost: 30.00,
        preTerminationFee: 200.00
      }
    },
    specialPickup: {
      pricePerBag: 25.00,
      minBags: 1,
      maxBags: 50
    },
    lateFees: {
      lateFeeAmount: 50.00,
      gracePeriodDays: 7
    },
    discounts: {
      seniorCitizenDiscount: 0.20, // 20%
      pwdDiscount: 0.20, // 20%
      bulkDiscount: {
        threshold: 10, // bags
        discountRate: 0.10 // 10%
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Load current pricing configuration
  const loadPricingConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/admin/pricing-config`);
      if (response.data) {
        setPricingConfig(response.data);
      }
    } catch (error) {
      console.error('Error loading pricing config:', error);
      // Use default values if API fails
    } finally {
      setLoading(false);
    }
  };

  // Save pricing configuration
  const savePricingConfig = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/admin/pricing-config`, pricingConfig);
      setMessage('Pricing configuration updated successfully!');
      setEditMode(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving pricing config:', error);
      setMessage('Failed to update pricing configuration.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Update pricing values
  const updatePricing = (section, field, value) => {
    setPricingConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  // Update nested pricing values
  const updateNestedPricing = (section, subsection, field, value) => {
    setPricingConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };

  useEffect(() => {
    loadPricingConfig();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <div className="header-left">
          <h2>Pricing Management</h2>
          <p className="header-subtitle">Configure subscription plans and special pickup pricing</p>
        </div>
        <div className="header-actions">
          {editMode ? (
            <>
              <button 
                onClick={() => setEditMode(false)} 
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={savePricingConfig} 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditMode(true)} 
              className="btn btn-primary"
            >
              Edit Pricing
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="pricing-content">
        {/* Subscription Pricing */}
        <div className="pricing-section">
          <div className="section-header">
            <h3>🏠 Regular Subscription Plan</h3>
            <p>Monthly subscription for regular waste collection service</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h4>Full Plan - Monthly Fee</h4>
              <div className="price-input-group">
                <span className="currency">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.subscription.fullPlan.price}
                  onChange={(e) => updateNestedPricing('subscription', 'fullPlan', 'price', e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">/month</span>
              </div>
              <p className="price-description">
                Includes 3 collections per week (Wed-Thu-Fri)<br/>
                Up to 12 bags per month
              </p>
            </div>

            <div className="pricing-card">
              <h4>Extra Bag Cost</h4>
              <div className="price-input-group">
                <span className="currency">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.subscription.fullPlan.extraBagCost}
                  onChange={(e) => updateNestedPricing('subscription', 'fullPlan', 'extraBagCost', e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">/bag</span>
              </div>
              <p className="price-description">
                Additional cost for bags exceeding monthly limit
              </p>
            </div>

            <div className="pricing-card">
              <h4>Pre-termination Fee</h4>
              <div className="price-input-group">
                <span className="currency">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.subscription.fullPlan.preTerminationFee}
                  onChange={(e) => updateNestedPricing('subscription', 'fullPlan', 'preTerminationFee', e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
              </div>
              <p className="price-description">
                Fee for early contract termination
              </p>
            </div>
          </div>
        </div>

        {/* Special Pickup Pricing */}
        <div className="pricing-section">
          <div className="section-header">
            <h3>🚛 Special Pickup Service</h3>
            <p>On-demand waste collection outside regular schedule</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h4>Price per Bag</h4>
              <div className="price-input-group">
                <span className="currency">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.specialPickup.pricePerBag}
                  onChange={(e) => updateNestedPricing('specialPickup', 'pricePerBag', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">/bag</span>
              </div>
              <p className="price-description">
                Standard rate for special pickup requests<br/>
                25kg rice sack size bags
              </p>
            </div>

            <div className="pricing-card">
              <h4>Minimum Bags</h4>
              <div className="price-input-group">
                <input
                  type="number"
                  min="1"
                  value={pricingConfig.specialPickup.minBags}
                  onChange={(e) => updateNestedPricing('specialPickup', 'minBags', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">bags</span>
              </div>
              <p className="price-description">
                Minimum number of bags per request
              </p>
            </div>

            <div className="pricing-card">
              <h4>Maximum Bags</h4>
              <div className="price-input-group">
                <input
                  type="number"
                  min="1"
                  value={pricingConfig.specialPickup.maxBags}
                  onChange={(e) => updateNestedPricing('specialPickup', 'maxBags', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">bags</span>
              </div>
              <p className="price-description">
                Maximum number of bags per request
              </p>
            </div>
          </div>
        </div>

        {/* Late Fees & Penalties */}
        <div className="pricing-section">
          <div className="section-header">
            <h3>⏰ Late Fees & Penalties</h3>
            <p>Additional charges for overdue payments</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h4>Late Fee Amount</h4>
              <div className="price-input-group">
                <span className="currency">₱</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricingConfig.lateFees.lateFeeAmount}
                  onChange={(e) => updateNestedPricing('lateFees', 'lateFeeAmount', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
              </div>
              <p className="price-description">
                Fixed fee for late payments
              </p>
            </div>

            <div className="pricing-card">
              <h4>Grace Period</h4>
              <div className="price-input-group">
                <input
                  type="number"
                  min="0"
                  value={pricingConfig.lateFees.gracePeriodDays}
                  onChange={(e) => updateNestedPricing('lateFees', 'gracePeriodDays', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">days</span>
              </div>
              <p className="price-description">
                Days after due date before late fee applies
              </p>
            </div>
          </div>
        </div>

        {/* Discounts */}
        <div className="pricing-section">
          <div className="section-header">
            <h3>💰 Discounts & Promotions</h3>
            <p>Special pricing for eligible customers</p>
          </div>
          
          <div className="pricing-grid">
            <div className="pricing-card">
              <h4>Senior Citizen Discount</h4>
              <div className="price-input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={pricingConfig.discounts.seniorCitizenDiscount}
                  onChange={(e) => updateNestedPricing('discounts', 'seniorCitizenDiscount', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">%</span>
              </div>
              <p className="price-description">
                Discount rate for senior citizens (0.20 = 20%)
              </p>
            </div>

            <div className="pricing-card">
              <h4>PWD Discount</h4>
              <div className="price-input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={pricingConfig.discounts.pwdDiscount}
                  onChange={(e) => updateNestedPricing('discounts', 'pwdDiscount', null, e.target.value)}
                  disabled={!editMode}
                  className="price-input"
                />
                <span className="period">%</span>
              </div>
              <p className="price-description">
                Discount rate for PWD (0.20 = 20%)
              </p>
            </div>

            <div className="pricing-card">
              <h4>Bulk Discount</h4>
              <div className="bulk-discount-inputs">
                <div className="price-input-group">
                  <label>Threshold:</label>
                  <input
                    type="number"
                    min="1"
                    value={pricingConfig.discounts.bulkDiscount.threshold}
                    onChange={(e) => updateNestedPricing('discounts', 'bulkDiscount', 'threshold', e.target.value)}
                    disabled={!editMode}
                    className="price-input small"
                  />
                  <span className="period">bags</span>
                </div>
                <div className="price-input-group">
                  <label>Discount:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={pricingConfig.discounts.bulkDiscount.discountRate}
                    onChange={(e) => updateNestedPricing('discounts', 'bulkDiscount', 'discountRate', e.target.value)}
                    disabled={!editMode}
                    className="price-input small"
                  />
                  <span className="period">%</span>
                </div>
              </div>
              <p className="price-description">
                Discount for special pickup orders above threshold
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="pricing-section">
          <div className="section-header">
            <h3>📋 Current Pricing Summary</h3>
            <p>Overview of all current rates</p>
          </div>
          
          <div className="pricing-summary">
            <div className="summary-row">
              <span className="summary-label">Monthly Subscription:</span>
              <span className="summary-value">{formatCurrency(pricingConfig.subscription.fullPlan.price)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Special Pickup (per bag):</span>
              <span className="summary-value">{formatCurrency(pricingConfig.specialPickup.pricePerBag)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Extra Bags (subscription):</span>
              <span className="summary-value">{formatCurrency(pricingConfig.subscription.fullPlan.extraBagCost)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Late Fee:</span>
              <span className="summary-value">{formatCurrency(pricingConfig.lateFees.lateFeeAmount)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Senior/PWD Discount:</span>
              <span className="summary-value">{(pricingConfig.discounts.seniorCitizenDiscount * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
