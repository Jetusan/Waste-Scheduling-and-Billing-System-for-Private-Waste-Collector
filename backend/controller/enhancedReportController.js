const { pool } = require('../config/db');
const htmlPdf = require('html-pdf-node');

/**
 * Enhanced Report Controller for WSBS Management
 * Generates user-friendly reports with proper branding and table structure
 */

class EnhancedReportController {

  // Generate Enhanced Report with simplified table structure
  static async generateEnhancedReport(req, res) {
    try {
      const { type, period, start_date, end_date, year, month, generated_by } = req.body;

      console.log('🔄 Generating enhanced report:', { type, period, start_date, end_date });

      let reportData = {};
      
      switch (type) {
        case 'financial':
          reportData = await EnhancedReportController.generateFinancialReport(start_date, end_date);
          break;
        case 'collection':
          reportData = await EnhancedReportController.generateCollectionReport(start_date, end_date);
          break;
        case 'combined':
          const financial = await EnhancedReportController.generateFinancialReport(start_date, end_date);
          const collection = await EnhancedReportController.generateCollectionReport(start_date, end_date);
          reportData = {
            ...financial,
            collection_data: collection.data,
            collection_summary: collection.summary
          };
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Store report in database
      const insertQuery = `
        INSERT INTO reports (type, period, generated_by, date, status, data, start_date, end_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const reportResult = await pool.query(insertQuery, [
        type,
        period,
        generated_by,
        new Date().toISOString().split('T')[0],
        'Completed',
        JSON.stringify(reportData),
        start_date,
        end_date
      ]);

      res.json({
        success: true,
        message: 'Enhanced report generated successfully',
        report: {
          ...reportResult.rows[0],
          data: reportData
        }
      });

    } catch (error) {
      console.error('❌ Error generating enhanced report:', error);
      res.status(500).json({
        error: 'Failed to generate enhanced report',
        details: error.message
      });
    }
  }

  // Generate Financial Report with simple table structure
  static async generateFinancialReport(startDate, endDate) {
    try {
      console.log('💰 Generating financial report...');

      // Main financial data query - simplified table format
      const financialQuery = `
        SELECT 
          p.payment_date::date as date,
          COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name,
          CASE 
            WHEN p.payment_method = 'Cash' THEN 'Cash Collection Payment'
            WHEN p.payment_method = 'GCash' THEN 'GCash Online Payment'
            WHEN p.payment_method = 'PayMongo' THEN 'PayMongo Payment'
            ELSE 'Subscription Payment'
          END as description,
          p.amount,
          p.payment_method,
          sp.plan_name,
          b.barangay_name
        FROM payments p
        JOIN invoices i ON p.invoice_id = i.invoice_id
        JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        JOIN users u ON cs.user_id = u.user_id
        LEFT JOIN user_names un ON u.name_id = un.name_id
        LEFT JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        LEFT JOIN addresses a ON u.address_id = a.address_id
        LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
        WHERE p.payment_date::date BETWEEN $1 AND $2
        ORDER BY p.payment_date DESC, u.username ASC
      `;

      const financialResult = await pool.query(financialQuery, [startDate, endDate]);

      // Calculate summary
      const totalAmount = financialResult.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
      const paymentMethodBreakdown = {};
      const planBreakdown = {};

      financialResult.rows.forEach(row => {
        // Payment method breakdown
        const method = row.payment_method || 'Unknown';
        if (!paymentMethodBreakdown[method]) {
          paymentMethodBreakdown[method] = { count: 0, amount: 0 };
        }
        paymentMethodBreakdown[method].count++;
        paymentMethodBreakdown[method].amount += parseFloat(row.amount || 0);

        // Plan breakdown
        const plan = row.plan_name || 'Unknown Plan';
        if (!planBreakdown[plan]) {
          planBreakdown[plan] = { count: 0, amount: 0 };
        }
        planBreakdown[plan].count++;
        planBreakdown[plan].amount += parseFloat(row.amount || 0);
      });

      return {
        type: 'Financial Report',
        data: financialResult.rows,
        summary: {
          total_transactions: financialResult.rows.length,
          total_amount: totalAmount,
          payment_methods: paymentMethodBreakdown,
          plans: planBreakdown,
          period: `${startDate} to ${endDate}`
        }
      };

    } catch (error) {
      console.error('❌ Error generating financial report:', error);
      throw error;
    }
  }

  // Generate Collection Report with simple table structure
  static async generateCollectionReport(startDate, endDate) {
    try {
      console.log('🚛 Generating collection report...');

      // Collection data query - simplified table format
      const collectionQuery = `
        SELECT 
          cse.created_at::date as date,
          COALESCE(un.first_name || ' ' || un.last_name, u.username) as user_name,
          CASE 
            WHEN cse.action = 'collected' THEN 'Waste Collection Completed'
            WHEN cse.action = 'missed' THEN 'Collection Missed - ' || COALESCE(cse.notes, 'No reason provided')
            ELSE 'Collection Activity - ' || cse.action
          END as description,
          CASE 
            WHEN cse.action = 'collected' AND cse.amount IS NOT NULL THEN cse.amount
            ELSE 0
          END as amount,
          cse.action as status,
          b.barangay_name,
          COALESCE(uc.username, 'Unknown Collector') as collector_name
        FROM collection_stop_events cse
        JOIN users u ON cse.user_id = u.user_id
        LEFT JOIN user_names un ON u.name_id = un.name_id
        LEFT JOIN addresses a ON u.address_id = a.address_id
        LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
        LEFT JOIN collectors c ON cse.collector_id = c.collector_id
        LEFT JOIN users uc ON c.user_id = uc.user_id
        WHERE cse.created_at::date BETWEEN $1 AND $2
        ORDER BY cse.created_at DESC, u.username ASC
      `;

      const collectionResult = await pool.query(collectionQuery, [startDate, endDate]);

      // Calculate summary
      const totalCollections = collectionResult.rows.filter(row => row.status === 'collected').length;
      const totalMissed = collectionResult.rows.filter(row => row.status === 'missed').length;
      const totalAmount = collectionResult.rows.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

      const barangayBreakdown = {};
      const collectorBreakdown = {};

      collectionResult.rows.forEach(row => {
        // Barangay breakdown
        const barangay = row.barangay_name || 'Unknown Barangay';
        if (!barangayBreakdown[barangay]) {
          barangayBreakdown[barangay] = { collected: 0, missed: 0, total: 0 };
        }
        barangayBreakdown[barangay].total++;
        if (row.status === 'collected') barangayBreakdown[barangay].collected++;
        if (row.status === 'missed') barangayBreakdown[barangay].missed++;

        // Collector breakdown
        const collector = row.collector_name;
        if (!collectorBreakdown[collector]) {
          collectorBreakdown[collector] = { collected: 0, missed: 0, total: 0 };
        }
        collectorBreakdown[collector].total++;
        if (row.status === 'collected') collectorBreakdown[collector].collected++;
        if (row.status === 'missed') collectorBreakdown[collector].missed++;
      });

      return {
        type: 'Collection Report',
        data: collectionResult.rows,
        summary: {
          total_activities: collectionResult.rows.length,
          total_collected: totalCollections,
          total_missed: totalMissed,
          collection_rate: totalCollections + totalMissed > 0 ? 
            ((totalCollections / (totalCollections + totalMissed)) * 100).toFixed(2) : 0,
          total_amount: totalAmount,
          barangays: barangayBreakdown,
          collectors: collectorBreakdown,
          period: `${startDate} to ${endDate}`
        }
      };

    } catch (error) {
      console.error('❌ Error generating collection report:', error);
      throw error;
    }
  }

  // Generate Enhanced PDF with WSBS branding using HTML-to-PDF
  static async generateEnhancedPDF(req, res) {
    try {
      const { reportData, branding } = req.body;

      console.log('📄 Generating enhanced PDF with WSBS branding...');

      // Generate HTML content for the report
      const htmlContent = EnhancedReportController.generateReportHTML(reportData, branding);

      // PDF options
      const options = {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
            Generated by WSBS Management System | Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      };

      // Generate PDF buffer
      const file = { content: htmlContent };
      const pdfBuffer = await htmlPdf.generatePdf(file, options);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="WSBS_Report.pdf"');
      
      // Send PDF buffer
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generating enhanced PDF:', error);
      res.status(500).json({
        error: 'Failed to generate PDF',
        details: error.message
      });
    }
  }

  // Generate HTML content for PDF conversion
  static generateReportHTML(reportData, branding) {
    const summaryItems = [];
    
    if (reportData.summary) {
      if (reportData.summary.total_transactions) {
        summaryItems.push(`Total Transactions: ${reportData.summary.total_transactions}`);
      }
      if (reportData.summary.total_activities) {
        summaryItems.push(`Total Activities: ${reportData.summary.total_activities}`);
      }
      if (reportData.summary.total_collected) {
        summaryItems.push(`Collections Completed: ${reportData.summary.total_collected}`);
      }
      if (reportData.summary.total_amount) {
        summaryItems.push(`Total Amount: ₱${parseFloat(reportData.summary.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      }
      if (reportData.summary.collection_rate) {
        summaryItems.push(`Collection Rate: ${reportData.summary.collection_rate}%`);
      }
    }

    // Generate table rows
    let tableRows = '';
    let totalAmount = 0;

    if (reportData.data && reportData.data.length > 0) {
      reportData.data.forEach((row, index) => {
        const date = new Date(row.date).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        
        const amount = parseFloat(row.amount || 0);
        totalAmount += amount;
        
        const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
        
        tableRows += `
          <tr class="${rowClass}">
            <td>${date}</td>
            <td>${row.user_name || 'Unknown'}</td>
            <td>${row.description || 'No description'}</td>
            <td style="text-align: right;">₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        `;
      });
    } else {
      tableRows = `
        <tr>
          <td colspan="4" style="text-align: center; color: #666; padding: 2rem;">
            No data available for the selected period.
          </td>
        </tr>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>WSBS Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #2c3e50;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border-radius: 8px;
          }
          
          .logo {
            font-size: 2rem;
            margin-bottom: 0.5rem;
          }
          
          .system-name {
            font-size: 1.8rem;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 0.25rem;
          }
          
          .system-subtitle {
            font-size: 1rem;
            color: #7f8c8d;
            margin-bottom: 0.5rem;
          }
          
          .date-info {
            font-size: 0.9rem;
            color: #95a5a6;
          }
          
          .report-title {
            font-size: 1.4rem;
            font-weight: bold;
            color: #2c3e50;
            margin: 1.5rem 0 0.5rem 0;
          }
          
          .period-info {
            font-size: 1rem;
            color: #7f8c8d;
            margin-bottom: 1.5rem;
          }
          
          .summary {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border-left: 4px solid #4CAF50;
          }
          
          .summary h3 {
            margin-top: 0;
            color: #2c3e50;
            font-size: 1.2rem;
          }
          
          .summary-item {
            margin: 0.5rem 0;
            font-size: 0.95rem;
          }
          
          .table-section h3 {
            color: #2c3e50;
            font-size: 1.2rem;
            margin-bottom: 1rem;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          
          th {
            background: #4CAF50;
            color: white;
            padding: 0.75rem;
            text-align: left;
            font-weight: bold;
            font-size: 0.9rem;
          }
          
          th:last-child {
            text-align: right;
          }
          
          td {
            padding: 0.6rem 0.75rem;
            border-bottom: 1px solid #e9ecef;
            font-size: 0.85rem;
          }
          
          .even-row {
            background: #f8f9fa;
          }
          
          .odd-row {
            background: white;
          }
          
          .total-row {
            background: #e8f5e9 !important;
            font-weight: bold;
            border-top: 2px solid #4CAF50;
          }
          
          .total-row td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }
          
          @media print {
            body { margin: 0; }
            .header { break-inside: avoid; }
            table { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🗑️</div>
          <div class="system-name">WSBS Management</div>
          <div class="system-subtitle">Waste Scheduling and Billing System</div>
          <div class="date-info">As of ${branding.generatedDate}</div>
        </div>
        
        <div class="report-title">${reportData.type || 'System Report'}</div>
        ${reportData.summary && reportData.summary.period ? 
          `<div class="period-info">Period: ${reportData.summary.period}</div>` : ''}
        
        ${summaryItems.length > 0 ? `
          <div class="summary">
            <h3>Summary</h3>
            ${summaryItems.map(item => `<div class="summary-item">• ${item}</div>`).join('')}
          </div>
        ` : ''}
        
        <div class="table-section">
          <h3>Detailed Records</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>User Name</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              ${reportData.data && reportData.data.length > 0 ? `
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL AMOUNT:</td>
                  <td style="text-align: right; font-weight: bold;">₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
  }

  // Get report suggestions based on data analysis
  static async getReportSuggestions(req, res) {
    try {
      const suggestions = [];
      
      // Analyze recent data for suggestions
      const recentPayments = await pool.query(`
        SELECT COUNT(*) as count, SUM(amount) as total
        FROM payments 
        WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const recentCollections = await pool.query(`
        SELECT COUNT(*) as count
        FROM collection_stop_events 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND action = 'collected'
      `);

      if (recentPayments.rows[0].count > 0) {
        suggestions.push({
          type: 'financial',
          title: 'Monthly Financial Report',
          description: `${recentPayments.rows[0].count} payments totaling ₱${parseFloat(recentPayments.rows[0].total || 0).toLocaleString()} in the last 30 days`,
          period: 'monthly',
          priority: 'high'
        });
      }

      if (recentCollections.rows[0].count > 0) {
        suggestions.push({
          type: 'collection',
          title: 'Collection Performance Report',
          description: `${recentCollections.rows[0].count} successful collections in the last 30 days`,
          period: 'monthly',
          priority: 'medium'
        });
      }

      suggestions.push({
        type: 'combined',
        title: 'Annual Business Overview',
        description: 'Comprehensive yearly report including financial and operational data',
        period: 'annual',
        priority: 'low'
      });

      res.json({
        success: true,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('❌ Error getting report suggestions:', error);
      res.status(500).json({
        error: 'Failed to get suggestions',
        details: error.message
      });
    }
  }
}

module.exports = EnhancedReportController;
