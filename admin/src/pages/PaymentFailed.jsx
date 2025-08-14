import React, { useEffect } from 'react';
import './PaymentResult.css';

const PaymentFailed = () => {
  useEffect(() => {
    // Auto redirect after 8 seconds
    const timer = setTimeout(() => {
      window.location.href = '/billing';
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="payment-result-container">
      <div className="payment-result-card failed">
        <div className="icon-container">
          <i className="fas fa-times-circle failed-icon"></i>
        </div>
        <h1>Payment Failed</h1>
        <p>Your payment could not be processed at this time.</p>
        <p>Please try again or contact support if the issue persists.</p>
        <p className="redirect-text">You will be redirected to billing page in 8 seconds...</p>
        <div className="button-group">
          <button 
            className="redirect-button retry-button"
            onClick={() => window.location.href = '/billing'}
          >
            Try Again
          </button>
          <button 
            className="redirect-button contact-button"
            onClick={() => window.location.href = '/contact'}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
