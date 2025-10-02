// Backend Configuration File
// Local IP for LAN development (override via env to avoid manual edits)
const LOCAL_IP = process.env.LOCAL_IP || '192.168.100.36';
const PORT = 5000;

// NGROK URL - legacy; prefer PUBLIC_URL in production
const NGROK_URL = process.env.NGROK_URL || 'https://b8c956cc76e6.ngrok-free.app';

// Public URL for this backend (Render or other). Example: https://wsbs-backend.onrender.com
const PUBLIC_URL = process.env.PUBLIC_URL || NGROK_URL;

// Base URLs for different environments
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;
const LOCALHOST_URL = `http://localhost:${PORT}`;
// Expose computed PUBLIC_URL
// In production on Render, set PUBLIC_URL in the service env vars

// API Configuration
const API_CONFIG = {
  LOCAL_IP,
  PORT,
  BASE_URL,
  LOCALHOST_URL,
  PUBLIC_URL,
  NGROK_URL,
  
  // PayMongo redirect URLs (must use public URL for external access)
  PAYMENT_REDIRECT: {
    SUCCESS: `${PUBLIC_URL}/api/billing/payment-redirect/success`,
    FAILED: `${PUBLIC_URL}/api/billing/payment-redirect/failed`
  },
  
  // Admin redirect URLs (if different from regular users)
  ADMIN_PAYMENT_REDIRECT: {
    SUCCESS: `${PUBLIC_URL}/api/billing/payment-redirect/success`,
    FAILED: `${PUBLIC_URL}/api/billing/payment-redirect/failed`
  },
  
  // CORS origins
  CORS_ORIGINS: [
    `http://${LOCAL_IP}:3000`, // Admin panel (LAN)
    `http://localhost:3000`,   // Admin panel localhost
    `http://${LOCAL_IP}:8081`, // React Native Metro
    `http://localhost:8081`,   // React Native Metro localhost
    `http://${LOCAL_IP}:19006`, // Expo web
    `http://localhost:19006`,   // Expo web localhost
    NGROK_URL,                  // Ngrok tunnel for external access
    process.env.ADMIN_SITE_URL || '', // Render static site domain for admin
    process.env.BACKEND_URL || '',    // Backend service public URL (optional)
    PUBLIC_URL,                        // Preferred public URL
  ].filter(Boolean),
  
  // Database configuration (if needed)
  DB_CONFIG: {
    // Add database connection settings here if needed
  }
};

module.exports = API_CONFIG;
