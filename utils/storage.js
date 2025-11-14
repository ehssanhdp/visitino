import * as SecureStore from "expo-secure-store";

// Save a value
export async function saveToken(key, value) {
  await SecureStore.setItemAsync(key, value);
}

// Get a value
export async function getToken(key) {
  return await SecureStore.getItemAsync(key);
}

// Delete a value
export async function deleteToken(key) {
  await SecureStore.deleteItemAsync(key);
}
