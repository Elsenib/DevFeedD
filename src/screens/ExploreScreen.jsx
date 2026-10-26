import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';
import { AuroraGlow, ScreenHeader } from '../components/ScreenChrome';
import { avatarTone } from '../utils/avatarTone';

function parseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch (error) {
    return {};
  }
}

function normalizePost(row) {
  const type = String(row.post_type || row.type || 'TEXT').toUpperCase();
  return {
    ...row,
    type,
    metadata: parseMetadata(row.metadata),
    title: row.title || row.caption || row.body || 'Paylaşım',
    authorName: row.name || row.user?.name || 'İstifadəçi',
    authorAvatar: row.avatar_url || row.user?.avatar_url || null,
    likeCount: Number(row.like_count || 0),
    commentCount: Number(row.comment_count || 0),
  };
}

function Avatar({ name, uri, size = 42 }) {
  const letter = String(name || 'U').slice(0, 1).toUpperCase();
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.avatarImage, style]} />;
  const tone = avatarTone(name);
  return (
    <View style={[styles.avatar, style, { backgroundColor: tone.bg }]}>
      <Text style={[styles.avatarText, { color: tone.fg }]}>{letter}</Text>
    </View>
  );
}

export default function ExploreScreen({ navigation }) {
  const { theme, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    searchRow: { backgroundColor: colors.surface, borderColor: colors.border },
    searchInput: { color: colors.text },
    tab: { backgroundColor: colors.surface, borderColor: colors.border },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    resultCard: { backgroundColor: colors.surface, borderColor: colors.border },
    resultTitle: { color: colors.text },
    resultSubtitle: { color: colors.muted },
    resultMeta: { color: colors.muted },
    emptyText: { color: colors.muted },
  }), [colors]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const normalizedPosts = useMemo(() => posts.map(normalizePost), [posts]);

  const loadResults = useCallback(async () => {
    try {
      const [userResults, postResults] = await Promise.all([
        api.searchUsers(query),
        api.searchPosts(query),
      ]);
      setUsers(Array.isArray(userResults) ? userResults : []);
      setPosts(Array.isArray(postResults) ? postResults : []);
    } catch (error) {
      Alert.alert('Kəşf xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadResults();
  };

  const handleToggleFollow = async (target) => {
    const nextFollowing = !target.following_by_me;
    setUsers((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? {
              ...item,
              following_by_me: nextFollowing,
              followers_count: Math.max(0, Number(item.followers_count || 0) + (nextFollowing ? 1 : -1)),
            }
          : item
      )
    );
    try {
      const result = nextFollowing ? await api.followUser(target.id) : await api.unfollowUser(target.id);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === target.id
            ? {
                ...item,
                following_by_me: result.following ?? nextFollowing,
                followers_count: result.followers_count ?? item.followers_count,
              }
            : item
        )
      );
    } catch (error) {
      Alert.alert('İzləmə xətası', error.response?.data?.message || error.message);
      loadResults();
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity style={[styles.resultCard, themed.resultCard]} onPress={() => navigation.navigate('UserProfile', { userId: item.id })}>
      <Avatar name={item.name} uri={item.avatar_url} />
      <View style={styles.resultBody}>
        <Text style={[styles.resultTitle, themed.resultTitle]}>{item.name || item.email}</Text>
        <Text style={[styles.resultSubtitle, themed.resultSubtitle]}>{item.role_sub || item.role || item.bio || 'DevFeed member'}</Text>
        <Text style={[styles.resultMeta, themed.resultMeta]}>{Number(item.followers_count || 0)} izləyici</Text>
      </View>
      <Pressable
        style={[
          styles.followPill,
          item.following_by_me
            ? { borderColor: colors.border, backgroundColor: 'transparent' }
            : { borderColor: colors.primary, backgroundColor: colors.primary },
        ]}
        hitSlop={6}
        onPress={(event) => {
          event?.stopPropagation?.();
          handleToggleFollow(item);
        }}
        accessibilityLabel={item.following_by_me ? `${item.name} izlənilir` : `${item.name} izlə`}
      >
        <Text style={[styles.followPillText, { color: item.following_by_me ? colors.text : colors.onPrimary }]}>
          {item.following_by_me ? 'İzlənilir' : 'İzlə'}
        </Text>
      </Pressable>
    </TouchableOpacity>
  );

  const renderPost = ({ item }) => (
    <TouchableOpacity style={[styles.resultCard, themed.resultCard]} onPress={() => navigation.navigate('PostDetail', { post: item })}>
      <Avatar name={item.authorName} uri={item.authorAvatar} />
      <View style={styles.resultBody}>
        <View style={styles.postTop}>
          <Text style={styles.typeBadge}>{item.type}</Text>
          <Text style={[styles.resultMeta, themed.resultMeta]}>{item.authorName}</Text>
        </View>
        <Text style={[styles.resultTitle, themed.resultTitle]} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.resultSubtitle, themed.resultSubtitle]} numberOfLines={2}>{item.body || item.caption}</Text>
        <Text style={[styles.resultMeta, themed.resultMeta]}>{item.likeCount} bəyənmə · {item.commentCount} şərh</Text>
      </View>
    </TouchableOpacity>
  );

  const data = activeTab === 'users' ? users : normalizedPosts;

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <AuroraGlow />
      <ScreenHeader title={t.explore} subtitle={t.exploreSubtitle} />

      <View style={[styles.searchRow, themed.searchRow]}>
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, themed.searchInput]}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={loadResults}
        />
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {[['users', 'İstifadəçilər'], ['posts', 'Postlar']].map(([id, label]) => {
          const selected = activeTab === id;
          return (
            <Pressable key={id} style={styles.tab} onPress={() => setActiveTab(id)} accessibilityRole="tab" accessibilityState={{ selected }}>
              <Text style={[styles.tabText, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '600' }]}>{label}</Text>
              <View style={[styles.tabBar, { backgroundColor: selected ? colors.primary : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={activeTab === 'users' ? renderUser : renderPost}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>{t.noResults}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06080F',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomColor: '#1F2433',
    borderBottomWidth: 1,
  },
  title: {
    color: '#F1F4FA',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8790A6',
    fontSize: 12,
    marginTop: 3,
  },
  searchRow: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#F1F4FA',
    marginLeft: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  tab: {
    marginRight: 22,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#FF7A2F',
    borderColor: '#FF7A2F',
  },
  tabText: {
    fontSize: 15,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 150,
  },
  resultCard: {
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    backgroundColor: '#1F2433',
  },
  avatarText: {
    fontWeight: '800',
  },
  resultBody: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    color: '#F1F4FA',
    fontWeight: '900',
    fontSize: 14,
  },
  resultSubtitle: {
    color: '#8790A6',
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12,
  },
  resultMeta: {
    color: '#6b7280',
    marginTop: 5,
    fontSize: 11,
  },
  followButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  followButtonActive: {
    backgroundColor: '#3fb950',
  },
  postTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  typeBadge: {
    color: '#FF9A5C',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 8,
  },
  emptyText: {
    color: '#8790A6',
    textAlign: 'center',
    marginTop: 24,
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
  followPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tabBar: {
    alignSelf: 'center',
    width: 22,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
