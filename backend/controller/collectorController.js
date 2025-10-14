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

// Get collector schedules - Use same format as resident side
const getCollectorSchedules = async (req, res) => {
  try {
    const { collector_id } = req.query;
    
    if (!collector_id) {
      return res.status(400).json({ success: false, error: 'Collector ID is required' });
    }

    // Use the same query structure as resident side (/api/collection-schedules)
    // This ensures collectors see the same schedule data as residents
    const schedulesQuery = `
      SELECT 
        cs.schedule_id,
        cs.schedule_date,
        cs.created_at,
        cs.waste_type,
        cs.time_range,
        array_agg(
          json_build_object(
            'barangay_id', b.barangay_id,
            'barangay_name', b.barangay_name
          )
        ) as barangays
      FROM collection_schedules cs
      LEFT JOIN schedule_barangays sb ON cs.schedule_id = sb.schedule_id
      LEFT JOIN barangays b ON sb.barangay_id = b.barangay_id
      GROUP BY cs.schedule_id, cs.schedule_date, cs.created_at, cs.waste_type, cs.time_range
      ORDER BY cs.schedule_date
    `;
    
    const result = await query(schedulesQuery);
    
    // Return the same format as resident side - no additional formatting needed
    // The data structure matches exactly what residents see
    res.json(result.rows);
    
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
