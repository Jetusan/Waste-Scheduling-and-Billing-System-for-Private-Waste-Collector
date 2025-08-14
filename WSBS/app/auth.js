import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'userRole';

export async function saveAuth(token, role) {
  console.log('Saving auth - token:', token ? 'present' : 'missing', 'role:', role);
  
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
  
  // Only save role if it's defined, otherwise save empty string
  const roleToSave = role ? String(role) : '';
  await SecureStore.setItemAsync(ROLE_KEY, roleToSave);
}

export async function getToken() {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRole() {
  return await SecureStore.getItemAsync(ROLE_KEY);
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
}
