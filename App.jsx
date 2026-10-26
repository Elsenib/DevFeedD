import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { FONT_ASSETS, applyGlobalFont } from './src/theme/fonts';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from './src/context/AuthContext';
import { AppAlertProvider } from './src/context/AppAlertContext';
import { PreferencesContext, PreferencesProvider } from './src/context/PreferencesContext';
import * as api from './src/api';
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
    return `${providerName} ilə girişə icazə verilmədi.`;
  }
  if (/redirect_uri_mismatch/i.test(message)) {
    return `${providerName} ilə giriş hazırda işləmir. Bir az sonra yenidən cəhd edin.`;
  }
  return message || `${providerName} girişi tamamlanmadı.`;
}

applyGlobalFont();

function ThemedStatusBar() {
  const { themeMode } = useContext(PreferencesContext);
  return <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
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
    [token, user, currentUser]
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
          <NavigationContainer>
            <ThemedStatusBar />
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
                  <Stack.Screen name="FollowList" component={FollowListScreen} />
                  <Stack.Screen name="Assistant" component={AssistantScreen} />
                  <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} options={{ animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
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
    backgroundColor: '#06080F',
  },
});
