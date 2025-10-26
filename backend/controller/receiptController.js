const pool = require('../config/dbAdmin');

// Generate receipt for completed payment
const generateReceipt = async (req, res) => {
  try {
    const { source_id, subscription_id } = req.query;
    
    if (!source_id && !subscription_id) {
      return res.status(400).json({ error: 'Missing source_id or subscription_id' });
    }

    // Check if receipt already exists
    let existingReceipt;
    if (source_id) {
      const receiptCheck = await pool.query('SELECT * FROM receipts WHERE payment_source_id = $1', [source_id]);
      if (receiptCheck.rows.length > 0) {
        existingReceipt = receiptCheck.rows[0];
      }
    }

    if (existingReceipt) {
      // Return existing receipt
      console.log('✅ Returning existing receipt:', existingReceipt.receipt_number);
      return res.send(existingReceipt.receipt_html);
    }

    // Get payment and subscription details with proper user data
    let receiptData;
    let userId = null;
    let invoiceId = null;
    
    if (source_id) {
      // GCash payment receipt - get data from payment_sources and related tables
      const query = `
        SELECT 
          ps.source_id,
          ps.amount,
          ps.payment_method,
          ps.created_at as payment_date,
          ps.invoice_id,
          i.invoice_number,
          i.due_date,
          i.user_id,
          cs.subscription_id,
          sp.plan_name,
          sp.price,
          u.username,
          u.contact_number,
          u.email,
          COALESCE(un.first_name || ' ' || un.last_name, u.username) as full_name,
          a.street as address
        FROM payment_sources ps
        LEFT JOIN invoices i ON ps.invoice_id = i.invoice_id
        LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        LEFT JOIN users u ON i.user_id = u.user_id
        LEFT JOIN user_names un ON u.name_id = un.name_id
        LEFT JOIN addresses a ON u.address_id = a.address_id
        WHERE ps.source_id = $1
      `;
      
      const result = await pool.query(query, [source_id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment record not found' });
      }
      
      receiptData = result.rows[0];
      receiptData.payment_type = 'GCash';
      receiptData.reference_number = source_id;
      userId = receiptData.user_id;
      invoiceId = receiptData.invoice_id;
      
      // If no customer data found, get basic info from payment_sources
      if (!receiptData.full_name || receiptData.full_name === 'null null') {
        receiptData.full_name = 'GCash Customer';
        receiptData.username = 'customer';
        receiptData.email = 'customer@gcash.com';
      }
    } else {
      // Payment receipt by subscription_id - check both payments and payment_sources
      let query = `
        SELECT 
          ps.source_id,
          ps.amount,
          ps.payment_method,
          ps.created_at as payment_date,
          ps.invoice_id,
          i.invoice_number,
          i.due_date,
          i.user_id,
          cs.subscription_id,
          sp.plan_name,
          sp.price,
          u.username,
          u.contact_number,
          u.email,
          COALESCE(un.first_name || ' ' || un.last_name, u.username) as full_name,
          a.street as address
        FROM payment_sources ps
        LEFT JOIN invoices i ON ps.invoice_id = i.invoice_id
        LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        LEFT JOIN users u ON i.user_id = u.user_id
        LEFT JOIN user_names un ON u.name_id = un.name_id
        LEFT JOIN addresses a ON u.address_id = a.address_id
        WHERE cs.subscription_id = $1
        ORDER BY ps.created_at DESC
        LIMIT 1
      `;
      
      let result = await pool.query(query, [subscription_id]);
      
      // If no payment_sources found, try payments table
      if (result.rows.length === 0) {
        query = `
          SELECT 
            p.payment_id,
            p.amount,
            p.payment_method,
            p.payment_date,
            p.reference_number,
            p.invoice_id,
            i.invoice_number,
            i.due_date,
            i.user_id,
            cs.subscription_id,
            sp.plan_name,
            sp.price,
            u.username,
            u.contact_number,
            u.email,
            COALESCE(un.first_name || ' ' || un.last_name, u.username) as full_name,
            a.street as address
          FROM payments p
          LEFT JOIN invoices i ON p.invoice_id = i.invoice_id
          LEFT JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
          LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
          LEFT JOIN users u ON i.user_id = u.user_id
          LEFT JOIN user_names un ON u.name_id = un.name_id
          LEFT JOIN addresses a ON u.address_id = a.address_id
          WHERE cs.subscription_id = $1
          ORDER BY p.payment_date DESC
          LIMIT 1
        `;
        result = await pool.query(query, [subscription_id]);
      }
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment record not found' });
      }
      
      receiptData = result.rows[0];
      receiptData.payment_type = receiptData.payment_method === 'gcash' ? 'GCash' : 'Cash';
      receiptData.reference_number = receiptData.reference_number || receiptData.source_id || receiptData.payment_id;
      userId = receiptData.user_id;
      invoiceId = receiptData.invoice_id;
      
      // If no customer data found, create fallback data
      if (!receiptData.full_name || receiptData.full_name === 'null null') {
        receiptData.full_name = 'Valued Customer';
        receiptData.username = 'customer';
        receiptData.email = 'customer@example.com';
      }
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber();
    
    // Generate receipt HTML
    const receiptHtml = generateReceiptHtml(receiptData, receiptNumber);
    
    // Save receipt to database
    const insertQuery = `
      INSERT INTO receipts (
        receipt_number, payment_source_id, payment_id, invoice_id, user_id, 
        subscription_id, amount, payment_method, payment_date, 
        receipt_data, receipt_html, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING receipt_id
    `;
    
    const receiptValues = [
      receiptNumber,
      source_id || null,
      receiptData.payment_id || null,
      invoiceId,
      userId,
      receiptData.subscription_id || subscription_id,
      receiptData.amount,
      receiptData.payment_method,
      receiptData.payment_date,
      JSON.stringify(receiptData),
      receiptHtml,
      'generated'
    ];
    
    const insertResult = await pool.query(insertQuery, receiptValues);
    console.log('✅ Receipt saved to database with ID:', insertResult.rows[0].receipt_id);
    
    res.send(receiptHtml);
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
};

// Generate unique receipt number
const generateReceiptNumber = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${date}-${random}`;
};

const generateReceiptHtml = (receiptData, receiptNumber) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt - ${receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
          color: #333;
        }
        
        .receipt-container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .receipt-header {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .success-icon {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
        
        .receipt-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 10px;
        }
        
        .receipt-number {
          font-size: 16px;
          opacity: 0.9;
        }
        
        .receipt-body {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e9ecef;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        
        .info-item {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        
        .info-label {
          font-size: 12px;
          color: #6c757d;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .amount-highlight {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          margin: 25px 0;
        }
        
        .amount-label {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 8px;
        }
        
        .amount-value {
          font-size: 32px;
          font-weight: 700;
        }
        
        .actions {
          padding: 25px;
          background: #f8f9fa;
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .btn {
          padding: 14px 28px;
          border: none;
          border-radius: 25px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 150px;
          justify-content: center;
          text-decoration: none;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #007bff, #0056b3);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,123,255,0.3);
        }
        
        .btn-success {
          background: linear-gradient(135deg, #28a745, #1e7e34);
          color: white;
        }
        
        .btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(40,167,69,0.3);
        }
        
        .btn-secondary {
          background: linear-gradient(135deg, #6c757d, #545b62);
          color: white;
        }
        
        .btn-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(108,117,125,0.3);
        }
        
        .footer {
          text-align: center;
          padding: 20px;
          color: #6c757d;
          font-size: 14px;
          background: #f8f9fa;
        }
        
        @media (max-width: 768px) {
          body { padding: 10px; }
          .receipt-container { border-radius: 10px; }
          .receipt-header { padding: 20px; }
          .receipt-title { font-size: 24px; }
          .receipt-body { padding: 20px; }
          .info-grid { grid-template-columns: 1fr; }
          .actions { flex-direction: column; padding: 20px; }
          .btn { width: 100%; margin-bottom: 10px; }
        }
        
        @media print {
          body { background: white; padding: 0; }
          .receipt-container { box-shadow: none; border-radius: 0; }
          .actions { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <span class="success-icon">✅</span>
          <h1 class="receipt-title">Payment Successful</h1>
          <p class="receipt-number">Receipt #${receiptNumber}</p>
        </div>
        
        <div class="receipt-body">
          <div class="section">
            <h2 class="section-title">Customer Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${receiptData.full_name || 'Valued Customer'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Username</div>
                <div class="info-value">${receiptData.username || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contact</div>
                <div class="info-value">${receiptData.contact_number || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Address</div>
                <div class="info-value">${receiptData.address || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2 class="section-title">Payment Details</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Payment Method</div>
                <div class="info-value">${receiptData.payment_type || receiptData.payment_method}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Reference Number</div>
                <div class="info-value">${receiptData.reference_number || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Payment Date</div>
                <div class="info-value">${formatDate(receiptData.payment_date)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Invoice Number</div>
                <div class="info-value">${receiptData.invoice_number || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          ${receiptData.plan_name ? `
          <div class="section">
            <h2 class="section-title">Subscription Details</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Plan Name</div>
                <div class="info-value">${receiptData.plan_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Plan Price</div>
                <div class="info-value">${formatCurrency(receiptData.price || receiptData.amount)}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="amount-highlight">
            <div class="amount-label">Total Amount Paid</div>
            <div class="amount-value">${formatCurrency(receiptData.amount)}</div>
          </div>
        </div>
        
        <div class="actions">
          <button class="btn btn-primary" onclick="downloadPDF()">📄 Download PDF</button>
          <button class="btn btn-success" onclick="printReceipt()">🖨️ Print Receipt</button>
          <button class="btn btn-secondary" onclick="closeWindow()">✖️ Close</button>
        </div>
        
        <div class="footer">
          <p>Thank you for your payment! This receipt serves as proof of your transaction.</p>
          <p>Generated on ${formatDate(new Date())}</p>
        </div>
      </div>
      
      <script>
        function downloadPDF() {
          const actions = document.querySelector('.actions');
          actions.style.display = 'none';
          window.print();
          setTimeout(() => { actions.style.display = 'flex'; }, 1000);
        }

        // Auto-close after 30 seconds if opened in popup
        if (window.opener) {
          setTimeout(() => {
            if (confirm('Close receipt window?')) {
              window.close();
            }
          }, 30000);
        }
      </script>
    </body>
    </html>
  `;
};

// Get receipts for a user (for transaction history)
const getUserReceipts = async (req, res) => {
  try {
    const userId = req.user?.userId || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const query = `
      SELECT 
        r.receipt_id,
        r.receipt_number,
        r.amount,
        r.payment_method,
        r.payment_date,
        r.status,
        r.created_at,
        i.invoice_number,
        sp.plan_name
      FROM receipts r
      LEFT JOIN invoices i ON r.invoice_id = i.invoice_id
      LEFT JOIN customer_subscriptions cs ON r.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      receipts: result.rows
    });

  } catch (error) {
    console.error('Error fetching user receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
};

// Get specific receipt by ID
const getReceiptById = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user?.userId;

    const query = `
      SELECT receipt_html, receipt_number, user_id
      FROM receipts 
      WHERE receipt_id = $1
    `;

    const result = await pool.query(query, [receiptId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = result.rows[0];
    
    // Check if user owns this receipt (optional security check)
    if (userId && receipt.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.send(receipt.receipt_html);

  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
};

// Download receipt as formatted text
const downloadReceipt = async (req, res) => {
  try {
    const { receiptId } = req.params;
    const userId = req.user?.userId;

    const receiptQuery = `
      SELECT 
        r.receipt_id,
        r.receipt_number,
        r.amount,
        r.payment_method,
        r.payment_date,
        r.status,
        r.receipt_data,
        r.user_id,
        cs.plan_id,
        sp.plan_name
      FROM receipts r
      LEFT JOIN customer_subscriptions cs ON r.subscription_id = cs.subscription_id
      LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
      WHERE r.receipt_id = $1
    `;

    const result = await pool.query(receiptQuery, [receiptId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const receipt = result.rows[0];

    // Check if user owns this receipt
    if (userId && receipt.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Format receipt as downloadable text
    const receiptText = `
WSBS - Waste Management Service
Official Payment Receipt
================================

Receipt #: ${receipt.receipt_number}
Date: ${new Date(receipt.payment_date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long', 
  day: 'numeric'
})} at ${new Date(receipt.payment_date).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit'
})}
Amount: ₱${parseFloat(receipt.amount).toFixed(2)}
Payment Method: ${receipt.payment_method}
Plan: ${receipt.plan_name || 'Standard Plan'}
Status: ${receipt.status.toUpperCase()}

================================
Thank you for your payment!
Your subscription is now active and 
waste collection services will continue 
as scheduled.

Generated on: ${new Date().toLocaleDateString()}
    `.trim();

    // Set headers for download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="WSBS_Receipt_${receipt.receipt_number}.txt"`);
    
    res.send(receiptText);

  } catch (error) {
    console.error('Error downloading receipt:', error);
    res.status(500).json({ error: 'Failed to download receipt' });
  }
};

module.exports = {
  generateReceipt,
  getUserReceipts,
  getReceiptById,
  downloadReceipt
};
