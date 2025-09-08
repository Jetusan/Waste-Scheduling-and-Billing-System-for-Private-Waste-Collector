// Backend Configuration File
// Change this IP address only when your local network changes
const LOCAL_IP = '172.16.151.188';
const PORT = 5000;

// NGROK URL - Update this when you restart ngrok
const NGROK_URL = process.env.NGROK_URL || 'https://e0e2c2de8d4e.ngrok-free.app';

// Base URLs for different environments
const BASE_URL = `http://${LOCAL_IP}:${PORT}`;
const LOCALHOST_URL = `http://localhost:${PORT}`;
const PUBLIC_URL = NGROK_URL; // Use ngrok for external services

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
    `http://${LOCAL_IP}:3000`, // Admin panel
    `http://localhost:3000`,   // Admin panel localhost
    `http://${LOCAL_IP}:8081`, // React Native Metro
    `http://localhost:8081`,   // React Native Metro localhost
    `http://${LOCAL_IP}:19006`, // Expo web
    `http://localhost:19006`,   // Expo web localhost
    NGROK_URL,                  // Ngrok tunnel for external access
  ],
  
  // Database configuration (if needed)
  DB_CONFIG: {
    // Add database connection settings here if needed
  }
};

module.exports = API_CONFIG;
