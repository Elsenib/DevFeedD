import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import { AuroraGlow, ScreenHeader } from '../components/ScreenChrome';
import Avatar from '../components/Avatar';
import * as api from '../api';
import { errorText } from '../utils/errors';

const TABS = [
  { id: 'followers', label: 'İzləyicilər' },
  { id: 'following', label: 'İzlənənlər' },
];

export default function FollowListScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const { userId, name } = route.params || {};
  const [tab, setTab] = useState(route.params?.mode === 'following' ? 'following' : 'followers');
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = tab === 'followers' ? await api.fetchFollowers(userId) : await api.fetchFollowing(userId);
      setPeople(Array.isArray(rows) ? rows : []);
    } catch (error) {
      Alert.alert('Siyahı yüklənmədi', errorText(error));
    } finally {
      setLoading(false);
    }
  }, [tab, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const openProfile = (person) => {
    if (String(person.id) === String(user?.id)) navigation.navigate('Main', { screen: 'Profile' });
    else navigation.push('UserProfile', { userId: person.id });
  };

  const toggleFollow = async (person) => {
    const next = !person.following_by_me;
    setPeople((prev) => prev.map((item) => (item.id === person.id ? { ...item, following_by_me: next } : item)));
    try {
      if (next) await api.followUser(person.id);
      else await api.unfollowUser(person.id);
    } catch (error) {
      setPeople((prev) => prev.map((item) => (item.id === person.id ? { ...item, following_by_me: !next } : item)));
      Alert.alert('İzləmə xətası', errorText(error));
    }
  };

  const renderPerson = ({ item }) => {
    const isMe = String(item.id) === String(user?.id);
    return (
      <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => openProfile(item)}>
        <Avatar name={item.name} uri={item.avatar_url} size={46} />
        <View style={styles.rowBody}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.name || 'İstifadəçi'}</Text>
          <Text style={[styles.rowRole, { color: colors.muted }]} numberOfLines={1}>{item.role_sub || item.role || 'DevFeed üzvü'}</Text>
        </View>
        {!isMe && (
          <Pressable
            hitSlop={6}
            onPress={(event) => {
              event?.stopPropagation?.();
              toggleFollow(item);
            }}
            style={[
              styles.followPill,
              item.following_by_me
                ? { borderColor: colors.border, backgroundColor: 'transparent' }
                : { borderColor: colors.primary, backgroundColor: colors.primary },
            ]}
            accessibilityLabel={item.following_by_me ? `${item.name} izlənilir` : `${item.name} izlə`}
          >
            <Text style={[styles.followText, { color: item.following_by_me ? colors.text : colors.onPrimary }]}>
              {item.following_by_me ? 'İzlənilir' : 'İzlə'}
            </Text>
          </Pressable>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AuroraGlow />
      <ScreenHeader title={name || 'Profil'} onBack={() => navigation.goBack()} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable key={item.id} style={styles.tab} onPress={() => setTab(item.id)} accessibilityRole="tab" accessibilityState={{ selected }}>
              <Text style={[styles.tabText, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '600' }]}>{item.label}</Text>
              <View style={[styles.tabBar, { backgroundColor: selected ? colors.primary : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPerson}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.muted }]}>
              {tab === 'followers' ? 'Hələ izləyici yoxdur.' : 'Hələ heç kimi izləmir.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 22,
    marginBottom: 6,
  },
  tab: {
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 15,
  },
  tabBar: {
    height: 3,
    width: 22,
    borderRadius: 2,
    marginTop: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 14,
    paddingBottom: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
  },
  rowBody: {
    flex: 1,
    marginLeft: 12,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowRole: {
    fontSize: 12,
    marginTop: 3,
  },
  followPill: {
    minWidth: 84,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  followText: {
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    textAlign: 'center',
    marginTop: 30,
  },
});
