import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';
const COLLECTOR_ID_KEY = 'collectorId';
const FIRST_TIME_KEY = 'isFirstTime';

export async function saveAuth(token, role, userId, collectorId) {
  console.log('Saving auth - token:', token ? 'present' : 'missing', 'role:', role);
  
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
  
  // Only save role if it's defined, otherwise save empty string
  const roleToSave = role ? String(role) : '';
  await SecureStore.setItemAsync(ROLE_KEY, roleToSave);

  // Save userId if provided
  if (userId !== undefined && userId !== null) {
    await SecureStore.setItemAsync(USER_ID_KEY, String(userId));
  }

  // Save collectorId if provided
  if (collectorId !== undefined && collectorId !== null) {
    await SecureStore.setItemAsync(COLLECTOR_ID_KEY, String(collectorId));
  }
}

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRole() {
  return await SecureStore.getItemAsync(ROLE_KEY);
}

export async function getUserId() {
  const id = await SecureStore.getItemAsync(USER_ID_KEY);
  return id ? Number(id) : null;
}

export async function getCollectorId() {
  const id = await SecureStore.getItemAsync(COLLECTOR_ID_KEY);
  return id ? Number(id) : null;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
  await SecureStore.deleteItemAsync(COLLECTOR_ID_KEY);
  // Don't delete FIRST_TIME_KEY on logout - user has already seen welcome
}

export async function isFirstTime() {
  const firstTime = await SecureStore.getItemAsync(FIRST_TIME_KEY);
  return firstTime !== 'false'; // Returns true if null/undefined or not 'false'
}

export async function setNotFirstTime() {
  await SecureStore.setItemAsync(FIRST_TIME_KEY, 'false');
}

export async function isAuthenticated() {
  const token = await getToken();
  const role = await getRole();
  return !!(token && role);
}

// Default export to fix route warning
export default {
  saveAuth,
  getToken,
  getRole,
  getUserId,
  getCollectorId,
  logout,
  isFirstTime,
  setNotFirstTime,
  isAuthenticated
};
