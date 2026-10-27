import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Accounts signed in on this device. Names and avatars live in AsyncStorage;
// each account's token lives in the OS keystore (SecureStore) on native.
const LIST_KEY = 'devfeed.accounts';
export const MAX_ACCOUNTS = 5;

const tokenKey = (id) => `devfeed.token.${id}`;
const useSecureStore = Platform.OS !== 'web';

export async function tokenFor(id) {
  return useSecureStore ? SecureStore.getItemAsync(tokenKey(id)) : AsyncStorage.getItem(tokenKey(id));
}

async function writeToken(id, token) {
  if (useSecureStore) await SecureStore.setItemAsync(tokenKey(id), token);
  else await AsyncStorage.setItem(tokenKey(id), token);
}

async function deleteToken(id) {
  if (useSecureStore) await SecureStore.deleteItemAsync(tokenKey(id));
  else await AsyncStorage.removeItem(tokenKey(id));
}

export async function loadAccounts() {
  try {
    const saved = JSON.parse(await AsyncStorage.getItem(LIST_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

async function saveAccounts(accounts) {
  await AsyncStorage.setItem(LIST_KEY, JSON.stringify(accounts));
  return accounts;
}

// Adds or refreshes an account; returns the new list.
export async function rememberAccount(user, token) {
  if (!user?.id || !token) return loadAccounts();
  await writeToken(user.id, token);
  const accounts = await loadAccounts();
  const entry = { id: user.id, user };
  const index = accounts.findIndex((item) => String(item.id) === String(user.id));
  if (index >= 0) accounts[index] = entry;
  else accounts.push(entry);
  return saveAccounts(accounts);
}

export async function forgetAccount(id) {
  await deleteToken(id).catch(() => {});
  const accounts = await loadAccounts();
  return saveAccounts(accounts.filter((item) => String(item.id) !== String(id)));
}
