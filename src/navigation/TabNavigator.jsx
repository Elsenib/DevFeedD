import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useState } from 'react';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';
import FeedScreen from '../screens/FeedScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PublicChatScreen from '../screens/PublicChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { theme, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadNotifications = useCallback(async () => {
    try {
      const data = await api.fetchNotifications();
      const unread = Array.isArray(data) ? data.filter((item) => !item.read_at).length : 0;
      setUnreadNotifications(unread);
    } catch (error) {
      setUnreadNotifications(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadNotifications();
    const interval = setInterval(refreshUnreadNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshUnreadNotifications]);

  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenListeners={{ state: refreshUnreadNotifications }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarBadgeStyle: { backgroundColor: colors.danger, color: '#ffffff', fontWeight: '900' },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Feed') iconName = 'dynamic-feed';
          if (route.name === 'Explore') iconName = 'search';
          if (route.name === 'Notifications') iconName = 'notifications';
          if (route.name === 'Messages') iconName = 'message';
          if (route.name === 'PublicChat') iconName = 'forum';
          if (route.name === 'Profile') iconName = 'person';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: t.feed }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: t.explore }} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t.notifications, tabBarBadge: unreadNotifications || undefined }}
      />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: t.messages }} />
      <Tab.Screen name="PublicChat" component={PublicChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t.profile }} />
    </Tab.Navigator>
  );
}
