import { Platform } from 'react-native';

// Change this IP address only when your local network changes
export const LOCAL_IP = '192.168.20.36';

export const API_BASE_URL =
  Platform.OS === 'android' || Platform.OS === 'ios'
    ? `http://${LOCAL_IP}:5000`
    : 'http://localhost:5000';

// Default export to fix route warning
export default { API_BASE_URL, LOCAL_IP };