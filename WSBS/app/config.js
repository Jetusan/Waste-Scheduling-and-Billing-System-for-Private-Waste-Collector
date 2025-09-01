import { Platform } from 'react-native';

// Change this IP address only when your local network changes
export const LOCAL_IP = '172.16.151.188';

export const API_BASE_URL =
  Platform.OS === 'android' || Platform.OS === 'ios'
    ? `http://${LOCAL_IP}:5000`
    : 'http://localhost:5000'; 