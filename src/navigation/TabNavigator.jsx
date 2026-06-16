import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useContext } from 'react';
import { PreferencesContext } from '../context/PreferencesContext';
import { NotificationsProvider, useNotifications } from '../context/NotificationsContext';
import FeedScreen from '../screens/FeedScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PublicChatScreen from '../screens/PublicChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TabNavigatorInner() {
  const { theme, t } = useContext(PreferencesContext);
  const { unreadCount, refreshUnreadNotifications } = useNotifications();
  const colors = theme.colors;

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
        options={{ title: t.notifications, tabBarBadge: unreadCount || undefined }}
      />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: t.messages }} />
      <Tab.Screen name="PublicChat" component={PublicChatScreen} options={{ title: 'Chat' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t.profile }} />
    </Tab.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <NotificationsProvider>
      <TabNavigatorInner />
    </NotificationsProvider>
  );
}
