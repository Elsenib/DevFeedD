import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import FeedScreen from '../screens/FeedScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#111827' },
        tabBarActiveTintColor: '#6d28d9',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Feed') iconName = 'dynamic-feed';
          if (route.name === 'Messages') iconName = 'message';
          if (route.name === 'Profile') iconName = 'person';
          if (route.name === 'Settings') iconName = 'settings';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
