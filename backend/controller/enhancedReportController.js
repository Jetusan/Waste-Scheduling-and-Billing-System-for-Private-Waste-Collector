const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');

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

  // Generate Enhanced PDF with WSBS branding
  static async generateEnhancedPDF(req, res) {
    try {
      const { reportData, branding } = req.body;

      console.log('📄 Generating enhanced PDF with WSBS branding...');

      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="WSBS_Report.pdf"');

      // Pipe PDF to response
      doc.pipe(res);

      // Add WSBS Header with Logo
      doc.fontSize(24)
         .fillColor('#2c3e50')
         .text('🗑️ WSBS Management', 50, 50);

      doc.fontSize(12)
         .fillColor('#7f8c8d')
         .text('Waste Scheduling and Billing System', 50, 80);

      doc.fontSize(10)
         .fillColor('#95a5a6')
         .text(`As of ${branding.generatedDate}`, 50, 100);

      // Add report title
      doc.fontSize(18)
         .fillColor('#2c3e50')
         .text(reportData.type || 'System Report', 50, 140);

      // Add period information
      if (reportData.summary && reportData.summary.period) {
        doc.fontSize(12)
           .fillColor('#7f8c8d')
           .text(`Period: ${reportData.summary.period}`, 50, 170);
      }

      // Add summary section
      let yPosition = 210;
      
      if (reportData.summary) {
        doc.fontSize(14)
           .fillColor('#2c3e50')
           .text('Summary', 50, yPosition);
        
        yPosition += 25;

        // Summary details
        const summaryItems = [];
        
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

        summaryItems.forEach(item => {
          doc.fontSize(11)
             .fillColor('#34495e')
             .text(`• ${item}`, 70, yPosition);
          yPosition += 18;
        });

        yPosition += 20;
      }

      // Add table header
      doc.fontSize(14)
         .fillColor('#2c3e50')
         .text('Detailed Records', 50, yPosition);
      
      yPosition += 30;

      // Table headers
      const tableHeaders = ['Date', 'User Name', 'Description', 'Amount'];
      const columnWidths = [80, 120, 250, 80];
      let xPosition = 50;

      // Draw table header
      doc.fontSize(10)
         .fillColor('#ffffff');

      // Header background
      doc.rect(50, yPosition - 5, 530, 20)
         .fill('#4CAF50');

      // Header text
      tableHeaders.forEach((header, index) => {
        doc.text(header, xPosition + 5, yPosition, {
          width: columnWidths[index] - 10,
          align: 'left'
        });
        xPosition += columnWidths[index];
      });

      yPosition += 25;

      // Table data
      if (reportData.data && reportData.data.length > 0) {
        reportData.data.forEach((row, index) => {
          // Check if we need a new page
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }

          // Alternate row colors
          const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
          doc.rect(50, yPosition - 2, 530, 18)
             .fill(fillColor);

          // Row data
          xPosition = 50;
          doc.fontSize(9)
             .fillColor('#2c3e50');

          // Format date
          const date = new Date(row.date).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
          });

          const rowData = [
            date,
            row.user_name || 'Unknown',
            row.description || 'No description',
            row.amount ? `₱${parseFloat(row.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '₱0.00'
          ];

          rowData.forEach((data, colIndex) => {
            doc.text(data, xPosition + 5, yPosition, {
              width: columnWidths[colIndex] - 10,
              align: colIndex === 3 ? 'right' : 'left'
            });
            xPosition += columnWidths[colIndex];
          });

          yPosition += 18;
        });

        // Add total amount at bottom
        yPosition += 20;
        if (reportData.summary && reportData.summary.total_amount) {
          doc.rect(50, yPosition - 2, 530, 20)
             .fill('#e8f5e9');

          doc.fontSize(11)
             .fillColor('#2c3e50')
             .text('TOTAL AMOUNT:', 370, yPosition + 2, { width: 100, align: 'right' })
             .text(`₱${parseFloat(reportData.summary.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 480, yPosition + 2, { width: 80, align: 'right' });
        }
      } else {
        doc.fontSize(12)
           .fillColor('#7f8c8d')
           .text('No data available for the selected period.', 50, yPosition);
      }

      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor('#95a5a6')
           .text(`Generated by WSBS Management System | Page ${i + 1} of ${pageCount}`, 
                  50, doc.page.height - 30, { align: 'center', width: doc.page.width - 100 });
      }

      // Finalize PDF
      doc.end();

    } catch (error) {
      console.error('❌ Error generating enhanced PDF:', error);
      res.status(500).json({
        error: 'Failed to generate PDF',
        details: error.message
      });
    }
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
