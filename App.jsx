import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from './src/context/AuthContext';
import * as api from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TabNavigator from './src/navigation/TabNavigator';
import PostDetailScreen from './src/screens/PostDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
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
        setToken(data.token);
        setUser(data.user || { email });
        return data;
      },
      signOut: () => {
        setToken(null);
        setUser(null);
      },
      signUp: async ({ name, email, password }) => {
        const data = await api.register(name, email, password);
        setToken(data.token);
        setUser(data.user || { name, email });
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

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
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
