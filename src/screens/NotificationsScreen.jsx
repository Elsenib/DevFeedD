import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';
import { useNotifications } from '../context/NotificationsContext';
import * as api from '../api';

function iconFor(type) {
  if (type === 'post_like') return { name: 'favorite', color: '#f85149' };
  if (type === 'post_comment') return { name: 'chat-bubble', color: '#58a6ff' };
  if (type === 'comment_reply') return { name: 'reply', color: '#38bdf8' };
  if (type === 'mention') return { name: 'alternate-email', color: '#a78bfa' };
  if (type === 'post_bookmark') return { name: 'bookmark', color: '#fbbf24' };
  if (type === 'follow') return { name: 'person-add', color: '#3fb950' };
  if (type === 'message') return { name: 'mail', color: '#818cf8' };
  if (type === 'chat_invite') return { name: 'group-add', color: '#22c55e' };
  if (type === 'chat_mention') return { name: 'alternate-email', color: '#22d3ee' };
  if (type === 'job_application') return { name: 'work', color: '#f59e0b' };
  return { name: 'notifications', color: '#6366f1' };
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function ActorAvatar({ name, uri }) {
  const letter = String(name || 'D').slice(0, 1).toUpperCase();
  if (uri) return <Image source={{ uri }} style={styles.avatarImage} />;
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

export default function NotificationsScreen({ navigation }) {
  const { theme, t } = useContext(PreferencesContext);
  const {
    syncUnreadFromList,
    markNotificationReadLocal,
    markAllNotificationsReadLocal,
    refreshUnreadNotifications,
  } = useNotifications();
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    iconButton: { backgroundColor: colors.surface, borderColor: colors.border },
    card: { backgroundColor: colors.surface, borderColor: colors.border },
    cardUnread: { backgroundColor: colors.surfaceStrong, borderColor: colors.primary },
    text: { color: colors.text },
    time: { color: colors.muted },
    emptyText: { color: colors.muted },
  }), [colors]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.fetchNotifications();
      const nextNotifications = Array.isArray(data) ? data : [];
      setNotifications(nextNotifications);
      syncUnreadFromList(nextNotifications);
    } catch (error) {
      Alert.alert('Bildiriş xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [syncUnreadFromList]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleReadAll = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      markAllNotificationsReadLocal();
    } catch (error) {
      Alert.alert('Bildiriş xətası', error.response?.data?.message || error.message);
    }
  };

  const handleOpen = async (item) => {
    markNotificationReadLocal(item);
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === item.id
          ? { ...notification, read_at: notification.read_at || new Date().toISOString() }
          : notification
      )
    );
    api.markNotificationRead(item.id)
      .then(refreshUnreadNotifications)
      .catch(refreshUnreadNotifications);

    if (item.entity_type === 'post' && item.entity_id) {
      navigation.navigate('PostDetail', { post: { id: item.entity_id } });
      return;
    }
    if (item.type === 'follow' && (item.actor_id || item.entity_id)) {
      navigation.navigate('UserProfile', { userId: item.actor_id || item.entity_id });
      return;
    }
    if (item.entity_type === 'conversation' && item.entity_id) {
      navigation.navigate('Chat', { conversationId: item.entity_id, title: item.actor_name || 'Söhbət' });
      return;
    }
    if (item.entity_type === 'chat_room' && item.entity_id) {
      navigation.navigate('PublicChat', { roomId: item.entity_id });
    }
  };

  const renderItem = ({ item }) => {
    const icon = iconFor(item.type);
    const unread = !item.read_at;
    return (
      <TouchableOpacity style={[styles.card, themed.card, unread && styles.cardUnread, unread && themed.cardUnread]} onPress={() => handleOpen(item)}>
        <ActorAvatar name={item.actor_name} uri={item.actor_avatar_url} />
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.text, themed.text]} numberOfLines={2}>{item.text}</Text>
            <View style={[styles.iconBadge, { backgroundColor: `${icon.color}22` }]}>
              <MaterialIcons name={icon.name} size={16} color={icon.color} />
            </View>
          </View>
          <Text style={[styles.time, themed.time]}>{formatTime(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <View style={[styles.header, themed.header]}>
        <View>
          <Text style={[styles.title, themed.title]}>{t.notifications}</Text>
          <Text style={[styles.subtitle, themed.subtitle]}>{t.notificationsSubtitle}</Text>
        </View>
        <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={handleReadAll}>
          <MaterialIcons name="done-all" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>Hələ bildiriş yoxdur.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
  },
  cardUnread: {
    borderColor: '#6366f1',
    backgroundColor: '#111827',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#21262d',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  body: {
    flex: 1,
    marginLeft: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
    color: '#e6edf3',
    lineHeight: 20,
    fontWeight: '700',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  time: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 6,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 24,
  },
});
