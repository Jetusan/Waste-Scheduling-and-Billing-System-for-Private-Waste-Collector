import React, { useEffect } from 'react';
import './PaymentResult.css';

const PaymentSuccess = () => {
  useEffect(() => {
    // Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      window.location.href = '/billing';
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-result-container">
      <div className="payment-result-card success">
        <div className="icon-container">
          <i className="fas fa-check-circle success-icon"></i>
        </div>
        <h1>Payment Successful!</h1>
        <p>Your payment has been processed successfully.</p>
        <p className="redirect-text">You will be redirected to billing page in 5 seconds...</p>
        <button 
          className="redirect-button success-button"
          onClick={() => window.location.href = '/billing'}
        >
          Go to Billing
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
