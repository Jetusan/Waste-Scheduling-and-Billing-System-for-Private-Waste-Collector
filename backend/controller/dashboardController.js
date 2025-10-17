const { pool } = require('../config/db');

const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard statistics...');
    // Get current date for filtering
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Revenue Statistics (detect available timestamp columns)
    const invCols = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices'
    `);
    const invColSet = new Set(invCols.rows.map(r => r.column_name));
    const hasCreated = invColSet.has('created_at');
    // Build revenue query parts based on available columns
    const monthlyFilter = hasCreated ? `AND i.created_at >= $1` : ``;
    const todayFilter = hasCreated ? `AND i.created_at::date = CURRENT_DATE` : ``;
    const yearlyFilter = hasCreated ? `AND date_part('year', i.created_at) = date_part('year', CURRENT_DATE)` : ``;
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN i.status ILIKE 'paid' THEN i.amount ELSE 0 END), 0)::numeric as total_revenue,
        ${hasCreated ? `COALESCE(SUM(CASE WHEN i.status ILIKE 'paid' ${monthlyFilter} THEN i.amount ELSE 0 END), 0)::numeric` : `0::numeric`} as monthly_revenue,
        ${hasCreated ? `COALESCE(SUM(CASE WHEN i.status ILIKE 'paid' ${todayFilter} THEN i.amount ELSE 0 END), 0)::numeric` : `0::numeric`} as today_revenue,
        ${hasCreated ? `COALESCE(SUM(CASE WHEN i.status ILIKE 'paid' ${yearlyFilter} THEN i.amount ELSE 0 END), 0)::numeric` : `0::numeric`} as yearly_revenue
      FROM invoices i
    `;
    const revenueResult = await pool.query(revenueQuery, hasCreated ? [startOfMonth] : []);

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
    const subscribersResult = await pool.query(subscribersQuery);

    // 3. Collection Statistics - Use real collection_stop_events data
    const collectionQuery = `
      WITH
      real_collections AS (
        SELECT 
          COUNT(*) as total_collections,
          COUNT(CASE WHEN action = 'collected' THEN 1 END) as completed_collections,
          COUNT(CASE WHEN action = 'missed' THEN 1 END) as missed_collections,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today_total,
          COUNT(CASE WHEN action = 'collected' AND DATE(created_at) = CURRENT_DATE THEN 1 END) as today_completed
        FROM collection_stop_events
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        total_collections as total_schedules,
        completed_collections as completed_schedules,
        today_total as today_schedules,
        today_completed,
        missed_collections as missed_pickups
      FROM real_collections
    `;
    const collectionResult = await pool.query(collectionQuery);

    // 4. Payment Statistics (robust casing and timestamps)
    const paymentQuery = `
      WITH inv AS (
        SELECT 
          i.amount,
          i.status,
          ${hasCreated ? 'i.created_at' : 'NULL::timestamp as created_at'},
          CASE 
            WHEN i.due_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN to_date(i.due_date::text, 'YYYY-MM-DD')
            ELSE i.due_date::date
          END AS due_dt
        FROM invoices i
      )
      SELECT 
        COUNT(CASE WHEN (due_dt < CURRENT_DATE AND status NOT ILIKE 'paid') OR status ILIKE 'overdue' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN (due_dt < CURRENT_DATE AND status NOT ILIKE 'paid') OR status ILIKE 'overdue' THEN amount ELSE 0 END), 0) as overdue_amount,
        ${hasCreated ? `COUNT(CASE WHEN status ILIKE 'failed' AND created_at >= $1 THEN 1 END)` : `0`} as failed_payments_7d
      FROM inv
    `;
    const paymentResult = await pool.query(paymentQuery, hasCreated ? [startOfWeek] : []);

    // 5. Fleet Statistics (robust if trucks.status doesn't exist)
    let fleetResult;
    try {
      const fleetQuery = `
        SELECT 
          COUNT(*) as total_trucks,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trucks
        FROM trucks
      `;
      fleetResult = await pool.query(fleetQuery);
    } catch (e) {
      const fleetFallbackQuery = `
        SELECT COUNT(*) as total_trucks, 0::int as active_trucks
        FROM trucks
      `;
      fleetResult = await pool.query(fleetFallbackQuery);
    }

    // 6. Resident Count (role_id = 3 means resident)
    const residentsQuery = `
      SELECT COUNT(*) as total_residents
      FROM users
      WHERE role_id = 3
    `;
    const residentsResult = await pool.query(residentsQuery);

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
      const complaintsResult = await pool.query(complaintsQuery, [startOfMonth]);
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
        monthly: parseFloat(revenue.monthly_revenue),
        today: parseFloat(revenue.today_revenue || 0),
        yearly: parseFloat(revenue.yearly_revenue || 0),
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
    
    // Calculate next occurrence dates for each day or parse specific dates
    const getNextOccurrence = (scheduleDate) => {
      // Check if it's a day name (Monday, Tuesday, etc.)
      const targetDayIndex = daysOfWeek.indexOf(scheduleDate);
      if (targetDayIndex !== -1) {
        let daysUntilTarget = targetDayIndex - currentDayIndex;
        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7; // Next week
        }
        
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilTarget);
        return nextDate;
      }
      
      // Check if it's a specific date (YYYY-MM-DD format or timestamp)
      try {
        const parsedDate = new Date(scheduleDate);
        if (!isNaN(parsedDate.getTime())) {
          // Only return future dates
          if (parsedDate >= today) {
            return parsedDate;
          }
          // If it's a past specific date, calculate next occurrence based on day of week
          const dayName = daysOfWeek[parsedDate.getDay()];
          return getNextOccurrence(dayName);
        }
      } catch (e) {
        console.log('Could not parse date:', scheduleDate);
      }
      
      return null;
    };
    
    const query = `
      SELECT 
        cs.*,
        COALESCE(
          json_agg(
            CASE WHEN b.barangay_id IS NOT NULL THEN
              json_build_object(
                'barangay_id', b.barangay_id,
                'barangay_name', b.barangay_name
              )
            END
          ) FILTER (WHERE b.barangay_id IS NOT NULL),
          '[]'::json
        ) as barangays
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
      GROUP BY cs.schedule_id, cs.schedule_date, cs.created_at, cs.waste_type, cs.time_range
      ORDER BY cs.created_at DESC
    `;

    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} collection schedules in database`);
    
    // Transform the data to include actual next occurrence dates
    const transformedSchedules = result.rows.map(schedule => {
      const nextDate = getNextOccurrence(schedule.schedule_date);
      const scheduleData = {
        ...schedule,
        next_occurrence: nextDate ? nextDate.toISOString().split('T')[0] : null,
        actual_schedule_date: nextDate,
        day_of_week: schedule.schedule_date,
        status: 'Scheduled' // Default status for upcoming schedules
      };
      
      console.log(`Schedule ${schedule.schedule_id}: ${schedule.schedule_date} -> ${scheduleData.next_occurrence}`);
      return scheduleData;
    }).filter(schedule => schedule.next_occurrence) // Only include valid dates
      .sort((a, b) => new Date(a.next_occurrence) - new Date(b.next_occurrence)) // Sort by next occurrence
      .slice(0, limit); // Apply limit after filtering and sorting

    console.log(`Returning ${transformedSchedules.length} upcoming schedules`);
    res.json(transformedSchedules);

  } catch (error) {
    console.error('Error fetching upcoming schedules:', error);
    res.status(500).json({ 
      error: 'Failed to fetch upcoming schedules', 
      details: error.message 
    });
  }
};

// Get overdue invoices for dashboard (true overdue: due_date < today and not paid)
const getOverdueInvoices = async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    
    const query = `
      WITH parsed AS (
        SELECT 
          i.*,
          u.username,
          CONCAT(un.first_name, ' ', un.last_name) as customer_name,
          CASE 
            WHEN i.due_date::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN to_date(i.due_date::text, 'YYYY-MM-DD')
            ELSE i.due_date::date
          END AS due_dt
        FROM invoices i
        LEFT JOIN users u ON i.user_id = u.user_id
        LEFT JOIN user_names un ON u.name_id = un.name_id
      )
      SELECT *
      FROM parsed
      WHERE due_dt < CURRENT_DATE
        AND (status IS NULL OR status NOT ILIKE 'paid')
      ORDER BY due_dt ASC
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
