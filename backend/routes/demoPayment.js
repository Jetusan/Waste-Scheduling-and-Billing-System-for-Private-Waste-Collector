const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Demo GCash Payment Page (for defense presentation)
router.get('/demo-gcash-payment', async (req, res) => {
  const { source_id, subscription_id } = req.query;
  
  console.log('🎭 Demo GCash Payment Page accessed:', { source_id, subscription_id });
  
  // Auto-redirect to success after 3 seconds for demo
  const successUrl = `${process.env.PUBLIC_URL || 'https://waste-scheduling-and-billing-system-for.onrender.com'}/api/billing/mobile-payment-success?source_id=${source_id}&subscription_id=${subscription_id}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Demo GCash Payment - WSBS</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #007bff, #4CAF50);
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }
        .gcash-logo {
          width: 120px;
          height: 40px;
          background: #007bff;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          border-radius: 8px;
          font-weight: bold;
        }
        .amount {
          font-size: 32px;
          font-weight: bold;
          color: #333;
          margin: 20px 0;
        }
        .demo-badge {
          background: #ff9800;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          margin-bottom: 20px;
          display: inline-block;
        }
        .loading {
          margin: 20px 0;
        }
        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .countdown {
          font-size: 18px;
          color: #666;
          margin: 15px 0;
        }
        .success-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="demo-badge">🎭 DEMO MODE</div>
        <div class="gcash-logo">GCash</div>
        <h2>Payment Confirmation</h2>
        <div class="amount">₱199.00</div>
        <p><strong>Merchant:</strong> WSBS - Waste Management</p>
        <p><strong>Reference:</strong> ${source_id}</p>
        
        <div class="loading">
          <div class="spinner"></div>
          <div class="countdown" id="countdown">Redirecting in 3 seconds...</div>
        </div>
        
        <button class="success-btn" onclick="completePayment()">
          Complete Payment Now
        </button>
        
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          This is a demo payment for defense presentation.<br>
          No actual money will be charged.
        </p>
      </div>
      
      <script>
        let seconds = 3;
        const countdown = document.getElementById('countdown');
        
        const timer = setInterval(() => {
          seconds--;
          countdown.textContent = \`Redirecting in \${seconds} seconds...\`;
          
          if (seconds <= 0) {
            clearInterval(timer);
            completePayment();
          }
        }, 1000);
        
        function completePayment() {
          countdown.textContent = 'Payment completed! Redirecting...';
          window.location.href = '${successUrl}';
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = router;
