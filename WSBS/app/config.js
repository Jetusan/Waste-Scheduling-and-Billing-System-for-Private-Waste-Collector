import { Platform } from 'react-native';

// Change this IP address only when your local network changes (or set EXPO_PUBLIC_LOCAL_IP)
export const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.100.36';

// Production backend URL (Render deployment)
const PRODUCTION_API = 'https://waste-scheduling-and-billing-system-for.onrender.com';

// For APK builds, always use production API
// For development, use local if explicitly set
const expoPublicApi = process.env.EXPO_PUBLIC_API_BASE;

// PRODUCTION CONFIGURATION: Use production backend on Render
// This connects to your deployed backend
export const API_BASE_URL = expoPublicApi
  ? expoPublicApi
  : PRODUCTION_API;  // Use production backend

// Default export to fix route warning
export default { API_BASE_URL, LOCAL_IP };