import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from './src/theme/fonts';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from './src/context/AuthContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { PreferencesContext, PreferencesProvider } from './src/context/PreferencesContext';
import * as api from './src/api';
import { MAX_ACCOUNTS, forgetAccount, loadAccounts, rememberAccount, tokenFor } from './src/utils/accounts';
import AccountSwitcher from './src/components/AccountSwitcher';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RegisterOnboardingScreen from './src/screens/RegisterOnboarding';
import TabNavigator from './src/navigation/TabNavigator';
import PostDetailScreen from './src/screens/PostDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VideoPlayerScreen from './src/screens/VideoPlayerScreen';
import FollowListScreen from './src/screens/FollowListScreen';
import AssistantScreen from './src/screens/AssistantScreen';

WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();
const AUTH_STORAGE_KEY = 'devfeed.auth';

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    onboardingPending: user.onboardingPending ?? !user.role,
  };
}

// Reads the user id from the JWT payload. Used when a stored user object is
// missing its id, which would otherwise make every message look like someone else's.
function idFromToken(token) {
  try {
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bits = '';
    for (const ch of part.replace(/=+$/, '')) bits += chars.indexOf(ch).toString(2).padStart(6, '0');
    let json = '';
    for (let i = 0; i + 8 <= bits.length; i += 8) json += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
    return JSON.parse(json).id ?? null;
  } catch (error) {
    return null;
  }
}

function withId(user, token) {
  return user && user.id == null && token ? { ...user, id: idFromToken(token) } : user;
}

function getOAuthParam(url, key) {
  const parsed = Linking.parse(url);
  const value = parsed.queryParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function friendlyOAuthError(provider, value) {
  const message = decodeURIComponent(String(value || ''));
  const providerName = provider === 'github' ? 'GitHub' : 'Google';
  if (message === 'access_denied') {
    return `${providerName} ilə girişə icazə verilmədi.`;
  }
  if (/redirect_uri_mismatch/i.test(message)) {
    return `${providerName} ilə giriş hazırda işləmir. Bir az sonra yenidən cəhd edin.`;
  }
  return message || `${providerName} girişi tamamlanmadı.`;
}

function ThemedStatusBar() {
  const { themeMode } = useContext(PreferencesContext);
  return <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [addingAccount, setAddingAccount] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // AUTH_STORAGE_KEY names the active account; tokens are in the device keystore.
  // Builds before 1.0.7 kept the token here, so move it on first launch.
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = JSON.parse(await AsyncStorage.getItem(AUTH_STORAGE_KEY));
        if (saved?.user) {
          const savedUser = withId(normalizeUser(saved.user), saved.token);
          if (saved.token) {
            await rememberAccount(savedUser, saved.token);
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: savedUser }));
          }
          const savedToken = await tokenFor(savedUser.id);
          if (savedToken) {
            setToken(savedToken);
            setUser(savedUser);
          }
        }
      } catch (error) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
      }
      setAccounts(await loadAccounts());
      setLoading(false);
    };
    restore();
  }, []);

  // Makes an account the active one and keeps it in the device's account list.
  const activate = useCallback(async (nextToken, nextUser) => {
    const active = withId(nextUser, nextToken);
    setToken(nextToken);
    setUser(active);
    setAddingAccount(false);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: active }));
    setAccounts(await rememberAccount(active, nextToken));
  }, []);

  const switchAccount = useCallback(async (accountId) => {
    setSwitcherOpen(false);
    const entry = accounts.find((item) => String(item.id) === String(accountId));
    const savedToken = entry && (await tokenFor(entry.id));
    if (!savedToken) {
      setAccounts(await forgetAccount(accountId));
      Alert.alert('Yenidən daxil ol', 'Bu hesabın sessiyası bitib. Hesabı yenidən əlavə et.');
      return;
    }
    await activate(savedToken, entry.user);
  }, [accounts, activate]);

  // Signing out removes the active account from this device and falls back to
  // another saved account, if there is one.
  const signOutActive = useCallback(async () => {
    const remaining = user?.id != null ? await forgetAccount(user.id) : await loadAccounts();
    setAccounts(remaining);
    const next = remaining[0];
    const nextToken = next && (await tokenFor(next.id));
    if (nextToken) {
      await activate(nextToken, next.user);
      return;
    }
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, [activate, user?.id]);

  const removeAccount = useCallback(async (accountId) => {
    if (String(accountId) === String(user?.id)) {
      await signOutActive();
      return;
    }
    setAccounts(await forgetAccount(accountId));
  }, [signOutActive, user?.id]);

  const startAddAccount = useCallback(() => {
    setSwitcherOpen(false);
    if (accounts.length >= MAX_ACCOUNTS) {
      Alert.alert('Limit', `Bu cihazda ən çox ${MAX_ACCOUNTS} hesab saxlamaq olar. Əvvəlcə birini sil.`);
      return;
    }
    setAddingAccount(true);
  }, [accounts.length]);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  const currentUser = useMemo(
    () => (user && user.id == null && token ? { ...user, id: idFromToken(token) } : user),
    [user, token]
  );

  const authContext = useMemo(
    () => ({
      user: currentUser,
      token,
      signIn: async ({ email, password }) => {
        const data = await api.login(email, password);
        const nextUser = normalizeUser(data.user || { email });
        await activate(data.token, nextUser);
        return data;
      },
      signOut: signOutActive,
      accounts,
      addingAccount,
      switchAccount,
      removeAccount,
      startAddAccount,
      cancelAddAccount: () => setAddingAccount(false),
      openAccountSwitcher: () => setSwitcherOpen(true),
      signUp: async ({ name, email, password }) => {
        const data = await api.register(name, email, password);
        if (data.verificationRequired || !data.token) {
          return data;
        }
        const nextUser = normalizeUser(data.user || { name, email });
        await activate(data.token, nextUser);
        return data;
      },
      verifyEmailRegistration: async ({ email, code }) => {
        const data = await api.verifyEmailRegistration(email, code);
        const nextUser = normalizeUser(data.user || { email });
        await activate(data.token, nextUser);
        return data;
      },
      socialSignIn: async (provider) => {
        const redirectUri = Linking.createURL('oauth', { scheme: 'devfeed' });
        const started = await api.startOAuth(provider, redirectUri);
        const result = await WebBrowser.openAuthSessionAsync(started.authUrl, redirectUri);

        if (result.type !== 'success' || !result.url) {
          throw new Error('Giriş pəncərəsi bağlandı.');
        }

        const oauthError = getOAuthParam(result.url, 'error');
        if (oauthError) {
          throw new Error(friendlyOAuthError(provider, oauthError));
        }

        const sessionId = getOAuthParam(result.url, 'sessionId');
        if (!sessionId) {
          throw new Error('Giriş tamamlanmadı. Yenidən cəhd edin.');
        }

        const data = await api.completeOAuth(sessionId);

        const nextUser = normalizeUser(data.user);
        await activate(data.token, nextUser);
        return data;
      },
      completeOnboarding: async (profile) => {
        const payload = {
          name: profile.name,
          bio: profile.bio,
          website: profile.website,
          role: profile.role,
          roleSub: profile.subRole,
          skills: profile.skills,
          languages: profile.languages,
        };
        const data = await api.updateProfile(payload);
        const nextUser = normalizeUser({
          ...(user || {}),
          ...(data.user || {}),
          role: data.user?.role || profile.role,
          role_sub: data.user?.role_sub || profile.subRole,
          onboardingPending: false,
        });
        await activate(token, nextUser);
        return data;
      },
      updateCurrentUser: async (profile) => {
        const data = await api.updateProfile(profile);
        const nextUser = normalizeUser({
          ...(user || {}),
          ...(data.user || {}),
          onboardingPending: false,
        });
        await activate(token, nextUser);
        return data;
      },
    }),
    [token, user, currentUser, accounts, addingAccount, activate, signOutActive, switchAccount, removeAccount, startAddAccount]
  );

  if (loading || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7A2F" />
      </SafeAreaView>
    );
  }

  const needsOnboarding = !!user?.onboardingPending;

  return (
    <PreferencesProvider>
      <AppAlertProvider>
        <AuthContext.Provider value={authContext}>
          {/* React Navigation 7 stopped navigate() from reaching screens inside a
              nested navigator by default; the screens here still rely on it. */}
          <NavigationContainer navigationInChildEnabled key={addingAccount ? 'adding' : String(currentUser?.id ?? 'guest')}>
            <ThemedStatusBar />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!user || addingAccount ? (
                <>
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Register" component={RegisterScreen} />
                </>
              ) : needsOnboarding ? (
                <Stack.Screen name="RegisterOnboarding" component={RegisterOnboardingScreen} />
              ) : (
                <>
                  <Stack.Screen name="Main" component={TabNavigator} />
                  <Stack.Screen name="PostDetail" component={PostDetailScreen} />
                  <Stack.Screen name="Chat" component={ChatScreen} />
                  <Stack.Screen name="UserProfile" component={ProfileScreen} />
                  <Stack.Screen name="Settings" component={SettingsScreen} />
                  <Stack.Screen name="FollowList" component={FollowListScreen} />
                  <Stack.Screen name="Assistant" component={AssistantScreen} />
                  <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
          <AccountSwitcher visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
        </AuthContext.Provider>
      </AppAlertProvider>
    </PreferencesProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#06080F',
  },
});
