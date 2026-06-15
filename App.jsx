import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import * as api from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import RegisterOnboardingScreen from './src/screens/RegisterOnboarding';
import TabNavigator from './src/navigation/TabNavigator';
import PostDetailScreen from './src/screens/PostDetailScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();
const AUTH_STORAGE_KEY = 'devfeed.auth';

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    onboardingPending: user.onboardingPending ?? !user.role,
  };
}

function getWebStorage() {
  try {
    return globalThis?.localStorage || null;
  } catch (error) {
    return null;
  }
}

function persistAuth(nextToken, nextUser) {
  const storage = getWebStorage();
  if (!storage) return;

  if (!nextToken || !nextUser) {
    storage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const storage = getWebStorage();
      if (storage) {
        try {
          const saved = storage.getItem(AUTH_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.token && parsed?.user) {
              setToken(parsed.token);
              setUser(normalizeUser(parsed.user));
            }
          }
        } catch (error) {
          storage.removeItem(AUTH_STORAGE_KEY);
        }
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
        persistAuth(data.token, nextUser);
        return data;
      },
      signOut: () => {
        setToken(null);
        setUser(null);
        persistAuth(null, null);
      },
      signUp: async ({ name, email, password }) => {
        const data = await api.register(name, email, password);
        const nextUser = normalizeUser(data.user || { name, email });
        setToken(data.token);
        setUser(nextUser);
        persistAuth(data.token, nextUser);
        return data;
      },
      socialSignIn: async (provider, profile) => {
        if (!profile?.providerId || !profile?.email || !profile?.name) {
          throw new Error(
            `${provider} OAuth hele tamamlanmayib. Provider profile geldikde /auth/social-login endpoint-i hazirdir.`
          );
        }

        const data = await api.socialLogin({ provider, ...profile });
        const nextUser = normalizeUser(data.user || { email: profile.email, name: profile.name });
        setToken(data.token);
        setUser(nextUser);
        persistAuth(data.token, nextUser);
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
        persistAuth(token, nextUser);
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
        persistAuth(token, nextUser);
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
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
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
