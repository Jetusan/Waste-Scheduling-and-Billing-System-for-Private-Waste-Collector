import { Platform } from 'react-native';

// Change this IP address only when your local network changes (or set EXPO_PUBLIC_LOCAL_IP)
export const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.100.36';

// Prefer EXPO_PUBLIC_API_BASE if provided (Render backend URL), else fall back to local dev
const expoPublicApi = process.env.EXPO_PUBLIC_API_BASE;

export const API_BASE_URL = expoPublicApi
  ? expoPublicApi
  : (Platform.OS === 'android' || Platform.OS === 'ios')
    ? `http://${LOCAL_IP}:5000`
    : 'http://localhost:5000';

// Default export to fix route warning
export default { API_BASE_URL, LOCAL_IP };