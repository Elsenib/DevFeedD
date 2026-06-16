import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from './src/context/AuthContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import * as api from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RegisterOnboardingScreen from './src/screens/RegisterOnboarding';
import TabNavigator from './src/navigation/TabNavigator';
import PostDetailScreen from './src/screens/PostDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';

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

async function persistAuth(nextToken, nextUser) {
  if (!nextToken || !nextUser) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
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
    return `${providerName} girişinə icazə verilmədi. OAuth consent screen test mərhələsindədirsə, bu email test users siyahısına əlavə olunmalıdır.`;
  }
  if (/redirect_uri_mismatch/i.test(message)) {
    return `${providerName} callback URL uyğun deyil. Provider console-da backend callback URL-i dəqiq əlavə olunmalıdır.`;
  }
  return message || `${providerName} girişi tamamlanmadı.`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.token && parsed?.user) {
            setToken(parsed.token);
            setUser(normalizeUser(parsed.user));
          }
        }
      } catch (error) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
      }
      setLoading(false);
    };
    restore();
  }, []);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  const authContext = useMemo(
    () => ({
      user,
      token,
      signIn: async ({ email, password }) => {
        const data = await api.login(email, password);
        const nextUser = normalizeUser(data.user || { email });
        setToken(data.token);
        setUser(nextUser);
        await persistAuth(data.token, nextUser);
        return data;
      },
      signOut: async () => {
        setToken(null);
        setUser(null);
        await persistAuth(null, null);
      },
      signUp: async ({ name, email, password }) => {
        const data = await api.register(name, email, password);
        if (data.verificationRequired || !data.token) {
          return data;
        }
        const nextUser = normalizeUser(data.user || { name, email });
        setToken(data.token);
        setUser(nextUser);
        await persistAuth(data.token, nextUser);
        return data;
      },
      verifyEmailRegistration: async ({ email, code }) => {
        const data = await api.verifyEmailRegistration(email, code);
        const nextUser = normalizeUser(data.user || { email });
        setToken(data.token);
        setUser(nextUser);
        await persistAuth(data.token, nextUser);
        return data;
      },
      socialSignIn: async (provider, profile) => {
        let data;

        if (profile?.providerId && profile?.email && profile?.name) {
          data = await api.socialLogin({ provider, ...profile });
        } else {
          const redirectUri = Linking.createURL('oauth', { scheme: 'devfeed' });
          const started = await api.startOAuth(provider, redirectUri);
          const result = await WebBrowser.openAuthSessionAsync(started.authUrl, redirectUri);

          if (result.type !== 'success' || !result.url) {
            throw new Error('OAuth penceresi tamamlanmadi.');
          }

          const oauthError = getOAuthParam(result.url, 'error');
          if (oauthError) {
            throw new Error(friendlyOAuthError(provider, oauthError));
          }

          const sessionId = getOAuthParam(result.url, 'sessionId');
          if (!sessionId) {
            throw new Error('OAuth sessiyasi alinmadi.');
          }

          data = await api.completeOAuth(sessionId);
        }

        const nextUser = normalizeUser(data.user || (profile ? { email: profile.email, name: profile.name } : null));
        setToken(data.token);
        setUser(nextUser);
        await persistAuth(data.token, nextUser);
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
        setUser(nextUser);
        await persistAuth(token, nextUser);
        return data;
      },
      updateCurrentUser: async (profile) => {
        const data = await api.updateProfile(profile);
        const nextUser = normalizeUser({
          ...(user || {}),
          ...(data.user || {}),
          onboardingPending: false,
        });
        setUser(nextUser);
        await persistAuth(token, nextUser);
        return data;
      },
    }),
    [token, user]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  const needsOnboarding = !!user?.onboardingPending;

  return (
    <PreferencesProvider>
      <AppAlertProvider>
        <AuthContext.Provider value={authContext}>
          <NavigationContainer>
            <StatusBar style="light" />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!user ? (
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
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
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
    backgroundColor: '#020617',
  },
});
