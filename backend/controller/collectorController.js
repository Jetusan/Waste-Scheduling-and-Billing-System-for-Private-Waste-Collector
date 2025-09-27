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

    // Return mock data for now since database schema is complex
    const stats = {
      today_pickups: 12,
      hours_worked: "6.5",
      distance_covered: "25.5",
      waste_collected: "450.0"
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

    // Return mock data for now
    const overview = {
      total_pickups: 15,
      missed_collections: 2,
      hours_worked: "3.8",
      distance_covered: "37.5",
      waste_collected: "225.0",
      date: new Date().toISOString()
    };

    res.json({ success: true, overview });
    
    // Send collection completion notifications for completed pickups
    try {
      // This would be called when actual collection data is processed
      // For now, it's a placeholder showing where notifications should be triggered
      console.log('📋 Collection completion notifications would be sent here');
    } catch (notifError) {
      console.error('⚠️ Failed to send collection notifications:', notifError);
    }
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

    // Return mock schedules for now
    const formattedSchedules = [
      {
        id: 'CS-001',
        location: 'Lagao, Buayan',
        waste_type: 'Mixed Waste',
        day: 'Monday',
        time: '08:00-12:00',
        schedule_id: 1
      },
      {
        id: 'CS-002',
        location: 'Dadiangas East',
        waste_type: 'Organic Waste',
        day: 'Wednesday',
        time: '07:00-11:00',
        schedule_id: 2
      },
      {
        id: 'CS-003',
        location: 'City Heights',
        waste_type: 'Recyclable',
        day: 'Friday',
        time: '09:00-13:00',
        schedule_id: 3
      },
      {
        id: 'CS-004',
        location: 'Fatima, San Jose',
        waste_type: 'Mixed Waste',
        day: 'Saturday',
        time: '06:00-10:00',
        schedule_id: 4
      }
    ];

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
