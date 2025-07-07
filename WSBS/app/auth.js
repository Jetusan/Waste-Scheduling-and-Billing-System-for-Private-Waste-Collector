import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'userRole';

export async function saveAuth(token, role) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(ROLE_KEY, role);
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
