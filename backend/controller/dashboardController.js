const pool = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics...');
    const client = await pool.connect();
    
    try {
      // Get current date for filtering
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. Revenue Statistics
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN i.status = 'Paid' AND i.updated_at >= $1 THEN i.amount ELSE 0 END), 0) as monthly_revenue
        FROM invoices i
      `;
      const revenueResult = await client.query(revenueQuery, [startOfMonth]);

      // 2. Active Subscribers by Plan
      const subscribersQuery = `
        SELECT 
          sp.plan_name,
          COUNT(cs.subscription_id) as count
        FROM customer_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.plan_id
        WHERE cs.status = 'active'
        GROUP BY sp.plan_name
      `;
      const subscribersResult = await client.query(subscribersQuery);

      // 3. Collection Statistics
      const collectionQuery = `
        SELECT 
          COUNT(*) as total_schedules,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_schedules,
          COUNT(CASE WHEN schedule_date::date = CURRENT_DATE THEN 1 END) as today_schedules,
          COUNT(CASE WHEN schedule_date::date = CURRENT_DATE AND status = 'Completed' THEN 1 END) as today_completed,
          COUNT(CASE WHEN schedule_date < CURRENT_DATE AND status != 'Completed' THEN 1 END) as missed_pickups
        FROM collection_schedules
        WHERE schedule_date >= CURRENT_DATE - INTERVAL '30 days'
      `;
      const collectionResult = await client.query(collectionQuery);

      // 4. Payment Statistics
      const paymentQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'Overdue' OR (due_date < CURRENT_DATE AND status = 'Unpaid') THEN 1 END) as overdue_count,
          COALESCE(SUM(CASE WHEN status = 'Overdue' OR (due_date < CURRENT_DATE AND status = 'Unpaid') THEN amount ELSE 0 END), 0) as overdue_amount,
          COUNT(CASE WHEN status = 'Failed' AND created_at >= $1 THEN 1 END) as failed_payments_7d
        FROM invoices
      `;
      const paymentResult = await client.query(paymentQuery, [startOfWeek]);

      // 5. Fleet Statistics
      const fleetQuery = `
        SELECT 
          COUNT(*) as total_trucks,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trucks
        FROM trucks
      `;
      const fleetResult = await client.query(fleetQuery);

      // 6. Resident Count
      const residentsQuery = `
        SELECT COUNT(*) as total_residents
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'resident'
      `;
      const residentsResult = await client.query(residentsQuery);

      // 7. Recent Complaints (if complaints table exists)
      let complaintsStats = { total: 0, pending: 0 };
      try {
        const complaintsQuery = `
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
          FROM complaints
          WHERE created_at >= $1
        `;
        const complaintsResult = await client.query(complaintsQuery, [startOfMonth]);
        complaintsStats = complaintsResult.rows[0];
      } catch (e) {
        // Complaints table might not exist
      }

      // Format response data
      const revenue = revenueResult.rows[0];
      const collection = collectionResult.rows[0];
      const payment = paymentResult.rows[0];
      const fleet = fleetResult.rows[0];
      const residents = residentsResult.rows[0];

      // Process subscribers data
      const subscribersData = { Basic: 0, Regular: 0, AllIn: 0, total: 0 };
      subscribersResult.rows.forEach(row => {
        const planName = row.plan_name;
        subscribersData[planName] = parseInt(row.count);
        subscribersData.total += parseInt(row.count);
      });

      // Calculate collection efficiency
      const totalSchedules = parseInt(collection.total_schedules);
      const completedSchedules = parseInt(collection.completed_schedules);
      const collectionEfficiency = totalSchedules > 0 ? 
        Math.round((completedSchedules / totalSchedules) * 100) : 0;

      const stats = {
        revenue: {
          total: parseFloat(revenue.total_revenue),
          monthly: parseFloat(revenue.monthly_revenue)
        },
        subscribers: subscribersData,
        collections: {
          efficiency: collectionEfficiency,
          today: {
            total: parseInt(collection.today_schedules),
            completed: parseInt(collection.today_completed)
          },
          missed: parseInt(collection.missed_pickups)
        },
        payments: {
          overdue: {
            count: parseInt(payment.overdue_count),
            amount: parseFloat(payment.overdue_amount)
          },
          failed_7d: parseInt(payment.failed_payments_7d)
        },
        fleet: {
          total: parseInt(fleet.total_trucks),
          active: parseInt(fleet.active_trucks)
        },
        residents: {
          total: parseInt(residents.total_residents)
        },
        complaints: complaintsStats,
        last_updated: new Date().toISOString()
      };

      res.json(stats);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      details: error.message 
    });
  }
};

// Get upcoming schedules for dashboard
const getUpcomingSchedules = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    
    // Get current day of week and upcoming days
    const today = new Date();
    const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Calculate next occurrence dates for each day
    const getNextOccurrence = (dayName) => {
      const targetDayIndex = daysOfWeek.indexOf(dayName);
      if (targetDayIndex === -1) return null;
      
      let daysUntilTarget = targetDayIndex - currentDayIndex;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }
      
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + daysUntilTarget);
      return nextDate;
    };
    
    const query = `
      SELECT 
        cs.*,
        json_agg(
          json_build_object(
            'barangay_id', b.barangay_id,
            'barangay_name', b.barangay_name
          )
        ) as barangays
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
      GROUP BY cs.schedule_id, cs.schedule_date, cs.created_at, cs.waste_type, cs.time_range
      ORDER BY cs.schedule_date, cs.time_range
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    
    // Transform the data to include actual next occurrence dates
    const transformedSchedules = result.rows.map(schedule => {
      const nextDate = getNextOccurrence(schedule.schedule_date);
      return {
        ...schedule,
        next_occurrence: nextDate ? nextDate.toISOString().split('T')[0] : null,
        actual_schedule_date: nextDate,
        day_of_week: schedule.schedule_date,
        status: 'Scheduled' // Default status for upcoming schedules
      };
    }).filter(schedule => schedule.next_occurrence) // Only include valid dates
      .sort((a, b) => new Date(a.next_occurrence) - new Date(b.next_occurrence)); // Sort by next occurrence

    res.json(transformedSchedules);

  } catch (error) {
    console.error('Error fetching upcoming schedules:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upcoming schedules', 
      details: error.message 
    });
  }
};

// Get overdue invoices for dashboard
const getOverdueInvoices = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    
    const query = `
      SELECT 
        i.*,
        u.username,
        CONCAT(un.first_name, ' ', un.last_name) as customer_name
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE i.due_date >= CURRENT_DATE AND i.status != 'Paid'
      ORDER BY i.due_date ASC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch overdue invoices', 
      details: error.message 
    });
  }
};

module.exports = {
  getDashboardStats,
  getUpcomingSchedules,
  getOverdueInvoices
};
