import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';
const COLLECTOR_ID_KEY = 'collectorId';

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
}
