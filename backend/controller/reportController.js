const { pool } = require('../config/db');

class ReportController {
  // 📊 WASTE SCHEDULING REPORTS
  static async generateScheduleReport(req, res) {
    try {
      const { startDate, endDate, barangay, wasteType, status } = req.query;
      
      let query = `
        SELECT 
          cs.schedule_date,
          cs.waste_type,
          b.barangay_name,
          COUNT(DISTINCT sb.barangay_id) as scheduled_areas,
          COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN cr.status = 'partial' THEN 1 END) as partial,
          COUNT(CASE WHEN cr.status = 'missed' THEN 1 END) as missed,
          ROUND((COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) * 100.0 / 
                 NULLIF(COUNT(sb.barangay_id), 0)), 2) as completion_rate,
          STRING_AGG(DISTINCT c.collector_id::text, ', ') as assigned_collectors,
          STRING_AGG(DISTINCT t.truck_number, ', ') as assigned_trucks
        FROM collection_schedules cs
        LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
        LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
        LEFT JOIN collection_results cr ON cs.schedule_id = cr.schedule_id
        LEFT JOIN collectors c ON cr.schedule_id = cs.schedule_id
        LEFT JOIN trucks t ON c.truck_id = t.truck_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (startDate && endDate) {
        paramCount += 2;
        query += ` AND cs.created_at BETWEEN $${paramCount-1} AND $${paramCount}`;
        params.push(startDate, endDate);
      }
      
      if (barangay) {
        paramCount++;
        query += ` AND b.barangay_id = $${paramCount}`;
        params.push(barangay);
      }
      
      if (wasteType) {
        paramCount++;
        query += ` AND cs.waste_type = $${paramCount}`;
        params.push(wasteType);
      }
      
      query += `
        GROUP BY cs.schedule_id, cs.schedule_date, cs.waste_type, b.barangay_name
        ORDER BY cs.schedule_date DESC
      `;
      
      const result = await pool.query(query, params);
      
      // Generate summary statistics
      const summary = {
        totalSchedules: result.rows.length,
        totalCompleted: result.rows.reduce((sum, row) => sum + parseInt(row.completed || 0), 0),
        totalMissed: result.rows.reduce((sum, row) => sum + parseInt(row.missed || 0), 0),
        overallCompletionRate: result.rows.length > 0 ? 
          (result.rows.reduce((sum, row) => sum + parseFloat(row.completion_rate || 0), 0) / result.rows.length).toFixed(2) : 0,
        byWasteType: {},
        byBarangay: {}
      };
      
      // Group by waste type and barangay for summary
      result.rows.forEach(row => {
        if (row.waste_type) {
          if (!summary.byWasteType[row.waste_type]) {
            summary.byWasteType[row.waste_type] = { completed: 0, missed: 0, total: 0 };
          }
          summary.byWasteType[row.waste_type].completed += parseInt(row.completed || 0);
          summary.byWasteType[row.waste_type].missed += parseInt(row.missed || 0);
          summary.byWasteType[row.waste_type].total++;
        }
        
        if (row.barangay_name) {
          if (!summary.byBarangay[row.barangay_name]) {
            summary.byBarangay[row.barangay_name] = { completed: 0, missed: 0, total: 0 };
          }
          summary.byBarangay[row.barangay_name].completed += parseInt(row.completed || 0);
          summary.byBarangay[row.barangay_name].missed += parseInt(row.missed || 0);
          summary.byBarangay[row.barangay_name].total++;
        }
      });
      
      res.json({
        type: 'scheduling-report',
        period: `${startDate || 'all'} to ${endDate || 'all'}`,
        summary,
        details: result.rows,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating schedule report:', error);
      res.status(500).json({ error: 'Failed to generate schedule report', details: error.message });
    }
  }

  // 💰 BILLING REPORTS
  static async generateBillingReport(req, res) {
    try {
      const { startDate, endDate, planType, status, barangay } = req.query;
      
      let query = `
        SELECT 
          DATE_TRUNC('month', i.generated_date) as billing_month,
          sp.plan_name,
          sp.price,
          b.barangay_name,
          COUNT(i.invoice_id) as total_invoices,
          SUM(i.amount) as total_billed,
          SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_collected,
          SUM(CASE WHEN i.status = 'unpaid' THEN i.amount ELSE 0 END) as outstanding,
          SUM(CASE WHEN i.status = 'overdue' THEN i.amount ELSE 0 END) as overdue_amount,
          ROUND((SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) * 100.0 / 
                 NULLIF(SUM(i.amount), 0)), 2) as collection_rate,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN i.status = 'unpaid' THEN 1 END) as unpaid_count,
          COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count
        FROM invoices i
        JOIN customer_subscriptions cs ON i.subscription_id = cs.subscription_id
        JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        JOIN users u ON cs.user_id = u.user_id
        LEFT JOIN addresses a ON u.address_id = a.address_id
        LEFT JOIN barangays b ON a.barangay_id = b.barangay_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramCount = 0;
      
      if (startDate && endDate) {
        paramCount += 2;
        query += ` AND i.generated_date BETWEEN $${paramCount-1} AND $${paramCount}`;
        params.push(startDate, endDate);
      }
      
      if (planType) {
        paramCount++;
        query += ` AND sp.plan_id = $${paramCount}`;
        params.push(planType);
      }
      
      if (status && status !== 'all') {
        paramCount++;
        query += ` AND i.status = $${paramCount}`;
        params.push(status);
      }
      
      if (barangay) {
        paramCount++;
        query += ` AND b.barangay_id = $${paramCount}`;
        params.push(barangay);
      }
      
      query += `
        GROUP BY DATE_TRUNC('month', i.generated_date), sp.plan_name, sp.price, b.barangay_name
        ORDER BY billing_month DESC, total_billed DESC
      `;
      
      const result = await pool.query(query, params);
      
      // Calculate financial summary
      const financialSummary = {
        totalBilled: result.rows.reduce((sum, row) => sum + parseFloat(row.total_billed || 0), 0),
        totalCollected: result.rows.reduce((sum, row) => sum + parseFloat(row.total_collected || 0), 0),
        totalOutstanding: result.rows.reduce((sum, row) => sum + parseFloat(row.outstanding || 0), 0),
        totalOverdue: result.rows.reduce((sum, row) => sum + parseFloat(row.overdue_amount || 0), 0),
        overallCollectionRate: 0,
        invoiceStats: {
          total: result.rows.reduce((sum, row) => sum + parseInt(row.total_invoices || 0), 0),
          paid: result.rows.reduce((sum, row) => sum + parseInt(row.paid_count || 0), 0),
          unpaid: result.rows.reduce((sum, row) => sum + parseInt(row.unpaid_count || 0), 0),
          overdue: result.rows.reduce((sum, row) => sum + parseInt(row.overdue_count || 0), 0)
        },
        topPerformingPlans: {},
        worstPerformingBarangays: {}
      };
      
      // Calculate overall collection rate
      if (financialSummary.totalBilled > 0) {
        financialSummary.overallCollectionRate = 
          ((financialSummary.totalCollected / financialSummary.totalBilled) * 100).toFixed(2);
      }
      
      // Group performance by plan and barangay
      result.rows.forEach(row => {
        // By plan
        if (!financialSummary.topPerformingPlans[row.plan_name]) {
          financialSummary.topPerformingPlans[row.plan_name] = {
            totalBilled: 0,
            collectionRate: 0,
            invoiceCount: 0
          };
        }
        financialSummary.topPerformingPlans[row.plan_name].totalBilled += parseFloat(row.total_billed || 0);
        financialSummary.topPerformingPlans[row.plan_name].invoiceCount += parseInt(row.total_invoices || 0);
        
        // By barangay (for worst performers - high outstanding)
        if (row.barangay_name && parseFloat(row.outstanding || 0) > 0) {
          if (!financialSummary.worstPerformingBarangays[row.barangay_name]) {
            financialSummary.worstPerformingBarangays[row.barangay_name] = 0;
          }
          financialSummary.worstPerformingBarangays[row.barangay_name] += parseFloat(row.outstanding || 0);
        }
      });
      
      res.json({
        type: 'billing-report',
        period: `${startDate || 'all'} to ${endDate || 'all'}`,
        financialSummary,
        monthlyBreakdown: result.rows,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating billing report:', error);
      res.status(500).json({ error: 'Failed to generate billing report', details: error.message });
    }
  }

  // 📋 COMBINED DASHBOARD REPORT
  static async generateDashboardReport(req, res) {
    try {
      const { period = '30' } = req.query; // Last 30 days by default
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));
      
      // Get collection performance
      const collectionQuery = `
        SELECT 
          COUNT(*) as total_schedules,
          COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN cr.status = 'missed' THEN 1 END) as missed,
          COUNT(CASE WHEN cr.status = 'partial' THEN 1 END) as partial
        FROM collection_schedules cs
        LEFT JOIN collection_results cr ON cs.schedule_id = cr.schedule_id
        WHERE cs.created_at BETWEEN $1 AND $2
      `;
      
      // Get billing performance
      const billingQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
        FROM invoices
        WHERE generated_date BETWEEN $1 AND $2
      `;
      
      // Get user activity
      const userQuery = `
        SELECT 
          r.role_name,
          COUNT(u.user_id) as user_count
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE u.created_at BETWEEN $1 AND $2 OR u.updated_at BETWEEN $1 AND $2
        GROUP BY r.role_name
      `;
      
      const [collectionResult, billingResult, userResult] = await Promise.all([
        pool.query(collectionQuery, [startDate, endDate]),
        pool.query(billingQuery, [startDate, endDate]),
        pool.query(userQuery, [startDate, endDate])
      ]);
      
      const dashboard = {
        period: `Last ${period} days`,
        collection: collectionResult.rows[0] || {},
        billing: billingResult.rows[0] || {},
        users: userResult.rows,
        generatedAt: new Date().toISOString()
      };
      
      // Calculate rates
      if (dashboard.collection.total_schedules > 0) {
        dashboard.collection.completion_rate = 
          ((dashboard.collection.completed / dashboard.collection.total_schedules) * 100).toFixed(2);
      }
      
      if (dashboard.billing.total_amount > 0) {
        dashboard.billing.collection_rate = 
          ((dashboard.billing.paid_amount / dashboard.billing.total_amount) * 100).toFixed(2);
      }
      
      res.json({
        type: 'dashboard-report',
        dashboard,
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating dashboard report:', error);
      res.status(500).json({ error: 'Failed to generate dashboard report', details: error.message });
    }
  }

  // 🎯 PERFORMANCE INSIGHTS
  static async generateInsightsReport(req, res) {
    try {
      // Get top performing barangays
      const topBarangaysQuery = `
        SELECT 
          b.barangay_name,
          COUNT(DISTINCT cs.subscription_id) as active_subscriptions,
          COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(i.invoice_id) as total_invoices,
          ROUND((COUNT(CASE WHEN i.status = 'paid' THEN 1 END) * 100.0 / 
                 NULLIF(COUNT(i.invoice_id), 0)), 2) as payment_rate
        FROM barangays b
        LEFT JOIN addresses a ON b.barangay_id = a.barangay_id
        LEFT JOIN users u ON a.address_id = u.address_id
        LEFT JOIN customer_subscriptions cs ON u.user_id = cs.user_id
        LEFT JOIN invoices i ON cs.subscription_id = i.subscription_id
        GROUP BY b.barangay_id, b.barangay_name
        HAVING COUNT(i.invoice_id) > 0
        ORDER BY payment_rate DESC, active_subscriptions DESC
        LIMIT 10
      `;
      
      // Get collection efficiency by collector
      const collectorEfficiencyQuery = `
        SELECT 
          u.username as collector_name,
          COUNT(cr.result_id) as total_assignments,
          COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_collections,
          ROUND((COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) * 100.0 / 
                 NULLIF(COUNT(cr.result_id), 0)), 2) as efficiency_rate
        FROM collectors c
        JOIN users u ON c.user_id = u.user_id
        LEFT JOIN collection_results cr ON c.collector_id = cr.collector_id
        WHERE c.status = 'active'
        GROUP BY c.collector_id, u.username
        ORDER BY efficiency_rate DESC, completed_collections DESC
      `;
      
      const [topBarangays, collectorEfficiency] = await Promise.all([
        pool.query(topBarangaysQuery),
        pool.query(collectorEfficiencyQuery)
      ]);
      
      res.json({
        type: 'insights-report',
        insights: {
          topPerformingBarangays: topBarangays.rows,
          collectorEfficiency: collectorEfficiency.rows,
          recommendations: [
            {
              category: 'Collection',
              suggestion: 'Focus on training collectors with efficiency rates below 80%',
              priority: 'High'
            },
            {
              category: 'Billing',
              suggestion: 'Implement targeted collection campaigns in underperforming barangays',
              priority: 'Medium'
            },
            {
              category: 'Operations',
              suggestion: 'Consider increasing frequency in high-performing areas',
              priority: 'Low'
            }
          ]
        },
        generatedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error generating insights report:', error);
      res.status(500).json({ error: 'Failed to generate insights report', details: error.message });
    }
  }
}

module.exports = ReportController;
