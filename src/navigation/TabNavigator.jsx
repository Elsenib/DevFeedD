import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { PreferencesContext } from '../context/PreferencesContext';
import { NotificationsProvider, useNotifications } from '../context/NotificationsContext';
import FeedScreen from '../screens/FeedScreen';
import ExploreScreen from '../screens/ExploreScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import PublicChatScreen from '../screens/PublicChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BlackHoleTabBar from '../components/BlackHoleTabBar';

const Tab = createBottomTabNavigator();

function TabNavigatorInner() {
  const { t } = useContext(PreferencesContext);
  const { unreadCount, refreshUnreadNotifications } = useNotifications();

  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenListeners={{ state: refreshUnreadNotifications }}
      tabBar={(props) => <BlackHoleTabBar {...props} unreadCount={unreadCount} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: t.feed }} />
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: t.explore }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: t.notifications }} />
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
