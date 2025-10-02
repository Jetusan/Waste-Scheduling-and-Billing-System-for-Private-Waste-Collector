const { query } = require('../config/db');
const {
  notifyCollectionCompleted,
  notifyCollectorAssigned
} = require('../services/collectionNotificationService');

// Get collector dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ success: false, error: 'Collector ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's completed pickups count
    const pickupsQuery = `
      SELECT COUNT(DISTINCT ca.user_id) as completed_pickups
      FROM collection_actions ca
      WHERE ca.collector_id = $1
        AND ca.action_type = 'collected'
        AND DATE(ca.timestamp) = $2
    `;
    const pickupsResult = await query(pickupsQuery, [collector_id, today]);
    const todayPickups = pickupsResult.rows[0]?.completed_pickups || 0;

    // Calculate hours worked today (from first to last action)
    const hoursQuery = `
      SELECT 
        EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as hours_worked
      FROM collection_actions
      WHERE collector_id = $1
        AND DATE(timestamp) = $2
    `;
    const hoursResult = await query(hoursQuery, [collector_id, today]);
    const hoursWorked = hoursResult.rows[0]?.hours_worked 
      ? parseFloat(hoursResult.rows[0].hours_worked).toFixed(1)
      : '0.0';

    // Get total waste collected today (from action details if available)
    const wasteQuery = `
      SELECT 
        COALESCE(SUM(CAST(details->>'waste_kg' AS NUMERIC)), 0) as total_waste
      FROM collection_actions
      WHERE collector_id = $1
        AND action_type = 'collected'
        AND DATE(timestamp) = $2
        AND details->>'waste_kg' IS NOT NULL
    `;
    const wasteResult = await query(wasteQuery, [collector_id, today]);
    let wasteCollected = wasteResult.rows[0]?.total_waste || 0;
    
    // If no waste data in details, estimate based on pickups (avg 15kg per pickup)
    if (wasteCollected === 0 && todayPickups > 0) {
      wasteCollected = todayPickups * 15;
    }
    wasteCollected = parseFloat(wasteCollected).toFixed(1);

    // Calculate distance covered (placeholder - would need GPS tracking)
    // Estimate: 2km per pickup on average
    const distanceCovered = (todayPickups * 2).toFixed(1);

    const stats = {
      today_pickups: todayPickups,
      hours_worked: hoursWorked,
      distance_covered: distanceCovered,
      waste_collected: wasteCollected
    };

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

// Get collector's last collection overview
const getLastCollectionOverview = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ success: false, error: 'Collector ID is required' });
    }

    // Get the most recent collection date (excluding today)
    const lastDateQuery = `
      SELECT DATE(timestamp) as collection_date
      FROM collection_actions
      WHERE collector_id = $1
        AND DATE(timestamp) < CURRENT_DATE
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const lastDateResult = await query(lastDateQuery, [collector_id]);
    
    if (lastDateResult.rows.length === 0) {
      // No previous collections found
      return res.json({ 
        success: true, 
        overview: {
          total_pickups: 0,
          missed_collections: 0,
          hours_worked: "0.0",
          distance_covered: "0.0",
          waste_collected: "0.0",
          date: null
        }
      });
    }

    const lastDate = lastDateResult.rows[0].collection_date;

    // Get total pickups for last collection date
    const pickupsQuery = `
      SELECT COUNT(DISTINCT user_id) as total_pickups
      FROM collection_actions
      WHERE collector_id = $1
        AND action_type = 'collected'
        AND DATE(timestamp) = $2
    `;
    const pickupsResult = await query(pickupsQuery, [collector_id, lastDate]);
    const totalPickups = pickupsResult.rows[0]?.total_pickups || 0;

    // Get missed collections for last date
    const missedQuery = `
      SELECT COUNT(*) as missed_count
      FROM missed_collections
      WHERE collector_id = $1
        AND DATE(reported_at) = $2
    `;
    const missedResult = await query(missedQuery, [collector_id, lastDate]);
    const missedCollections = missedResult.rows[0]?.missed_count || 0;

    // Calculate hours worked
    const hoursQuery = `
      SELECT 
        EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as hours_worked
      FROM collection_actions
      WHERE collector_id = $1
        AND DATE(timestamp) = $2
    `;
    const hoursResult = await query(hoursQuery, [collector_id, lastDate]);
    const hoursWorked = hoursResult.rows[0]?.hours_worked 
      ? parseFloat(hoursResult.rows[0].hours_worked).toFixed(1)
      : '0.0';

    // Get total waste collected
    const wasteQuery = `
      SELECT 
        COALESCE(SUM(CAST(details->>'waste_kg' AS NUMERIC)), 0) as total_waste
      FROM collection_actions
      WHERE collector_id = $1
        AND action_type = 'collected'
        AND DATE(timestamp) = $2
        AND details->>'waste_kg' IS NOT NULL
    `;
    const wasteResult = await query(wasteQuery, [collector_id, lastDate]);
    let wasteCollected = wasteResult.rows[0]?.total_waste || 0;
    
    // Estimate if no data
    if (wasteCollected === 0 && totalPickups > 0) {
      wasteCollected = totalPickups * 15;
    }
    wasteCollected = parseFloat(wasteCollected).toFixed(1);

    // Estimate distance
    const distanceCovered = (totalPickups * 2).toFixed(1);

    const overview = {
      total_pickups: totalPickups,
      missed_collections: missedCollections,
      hours_worked: hoursWorked,
      distance_covered: distanceCovered,
      waste_collected: wasteCollected,
      date: lastDate
    };

    res.json({ success: true, overview });
  } catch (error) {
    console.error('Error fetching last collection overview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch last collection overview' });
  }
};

// Get collector notifications
const getCollectorNotifications = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ success: false, error: 'Collector ID is required' });
    }

    // Get collector's user_id from collector_id
    const collectorQuery = `
      SELECT c.user_id, u.username, un.first_name, un.last_name
      FROM collectors c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN user_names un ON u.name_id = un.name_id
      WHERE c.collector_id = $1
    `;
    const collectorResult = await query(collectorQuery, [collector_id]);
    
    if (collectorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Collector not found' });
    }

    const userId = collectorResult.rows[0].user_id;

    // Fetch real notifications from database
    const notificationsQuery = `
      SELECT 
        notification_id,
        title,
        message,
        notification_type,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const notificationsResult = await query(notificationsQuery, [userId]);
    
    // Format notifications for frontend
    const formattedNotifications = notificationsResult.rows.map(notification => {
      const { icon, color } = getNotificationStyle(notification.notification_type);
      
      return {
        id: notification.notification_id,
        icon: icon,
        title: notification.title,
        message: notification.message,
        time: getTimeAgo(notification.created_at),
        color: color,
        is_read: notification.is_read,
        type: notification.notification_type
      };
    });

    res.json({ success: true, notifications: formattedNotifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Get collector schedules
const getCollectorSchedules = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ success: false, error: 'Collector ID is required' });
    }

    // Fetch real schedules from database
    const schedulesQuery = `
      SELECT 
        cs.schedule_id,
        cs.collection_id as id,
        cs.collection_date,
        cs.start_time,
        cs.end_time,
        cs.status,
        cr.route_name as location,
        st.type_name as waste_type,
        b.barangay_name,
        EXTRACT(DOW FROM cs.collection_date) as day_of_week
      FROM collection_schedules cs
      LEFT JOIN collection_routes cr ON cs.route_id = cr.route_id
      LEFT JOIN schedule_types st ON cs.schedule_type_id = st.schedule_type_id
      LEFT JOIN collection_teams ct ON cs.team_id = ct.team_id
      LEFT JOIN barangays b ON cr.barangay_id = b.barangay_id
      WHERE ct.team_id IN (
        SELECT team_id 
        FROM collection_teams 
        WHERE driver_id = $1 
           OR helper1_id = $1 
           OR helper2_id = $1
      )
      AND cs.collection_date >= CURRENT_DATE
      ORDER BY cs.collection_date ASC, cs.start_time ASC
      LIMIT 50
    `;
    
    const result = await query(schedulesQuery, [collector_id]);
    
    // Format schedules for frontend
    const formattedSchedules = result.rows.map(row => {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[row.day_of_week] || '';
      
      // Format time
      const startTime = row.start_time ? row.start_time.substring(0, 5) : '';
      const endTime = row.end_time ? row.end_time.substring(0, 5) : '';
      const timeRange = endTime ? `${startTime}-${endTime}` : startTime;
      
      // Format location
      const location = row.barangay_name 
        ? `${row.location || 'Route'}, ${row.barangay_name}`
        : (row.location || 'Route');
      
      return {
        id: row.id || `CS-${row.schedule_id}`,
        location: location,
        waste_type: row.waste_type || 'Mixed Waste',
        day: dayName,
        time: timeRange,
        schedule_id: row.schedule_id,
        date: row.collection_date,
        status: row.status
      };
    });

    res.json({ success: true, schedules: formattedSchedules });
  } catch (error) {
    console.error('Error fetching collector schedules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' });
  }
};

// Helper function to get notification style based on type
function getNotificationStyle(notificationType) {
  const styles = {
    'route_assignment': { icon: 'map-outline', color: '#4CAF50' },
    'collection_reminder': { icon: 'time-outline', color: '#2196F3' },
    'collection_completed': { icon: 'checkmark-circle-outline', color: '#4CAF50' },
    'schedule_change': { icon: 'calendar-outline', color: '#FF9800' },
    'truck_breakdown': { icon: 'warning-outline', color: '#F44336' },
    'emergency_alert': { icon: 'alert-circle-outline', color: '#F44336' },
    'backup_request': { icon: 'people-outline', color: '#FF9800' },
    'route_completed': { icon: 'checkmark-done-outline', color: '#4CAF50' },
    'maintenance_alert': { icon: 'construct-outline', color: '#FF9800' },
    'communication': { icon: 'chatbubble-outline', color: '#2196F3' },
    'default': { icon: 'notifications-outline', color: '#666' }
  };
  
  return styles[notificationType] || styles.default;
}

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

module.exports = {
  getDashboardStats,
  getLastCollectionOverview,
  getCollectorNotifications,
  getCollectorSchedules
};
