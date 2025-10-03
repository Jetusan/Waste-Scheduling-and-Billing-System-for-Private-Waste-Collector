// API Configuration for Admin Frontend
const API_CONFIG = {
  // Base URL for API calls
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  
  // Environment
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: '/api/auth',
    LOGIN: '/api/auth/login',
    // Admin Authentication
    ADMIN_AUTH: '/api/admin/auth',
    ADMIN_LOGIN: '/api/admin/auth/login',
    ADMIN_REGISTER: '/api/admin/auth/register',
    REGISTER: '/api/auth/register',
    
    // Dashboard
    DASHBOARD: '/api/dashboard',
    DASHBOARD_STATS: '/api/dashboard/stats',
    UPCOMING_SCHEDULES: '/api/dashboard/upcoming-schedules',
    OVERDUE_INVOICES: '/api/dashboard/overdue-invoices',
    
    // Users & Collections
    COLLECTION_SCHEDULES: '/api/collection-schedules',
    RESIDENTS: '/api/residents',
    COLLECTORS: '/api/collectors',
    TRUCKS: '/api/trucks',
    ASSIGNMENTS: '/api/assignments',
    
    // Billing
    BILLING: '/api/billing',
    BILLING_HISTORY: '/api/billing/history',
    INVOICES: '/api/billing/invoices',
    
    // Special Pickup
    SPECIAL_PICKUP: '/api/special-pickup',
    
    // Reports
    REPORTS: '/api/reports',
    
    // Notifications
    NOTIFICATIONS: '/api/notifications',
    
    // Route Issues
    ROUTE_ISSUES: '/api/collector-issues',
    
    // Barangays
    BARANGAYS: '/api/barangays',
    
    // Health Check
    HEALTH: '/health'
  }
};

// Helper function to build full URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get API base URL
export const getApiBaseUrl = () => {
  return API_CONFIG.BASE_URL;
};

// Export configuration
export default API_CONFIG;
