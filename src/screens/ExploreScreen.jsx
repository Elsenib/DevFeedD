import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
  return (
    <View style={[styles.avatar, style]}>
      <Text style={styles.avatarText}>{letter}</Text>
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
      <TouchableOpacity
        style={[styles.followButton, item.following_by_me && styles.followButtonActive]}
        onPress={(event) => {
          event?.stopPropagation?.();
          handleToggleFollow(item);
        }}
      >
        <MaterialIcons name={item.following_by_me ? 'check' : 'person-add'} size={17} color="#ffffff" />
      </TouchableOpacity>
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
      <View style={[styles.header, themed.header]}>
        <Text style={[styles.title, themed.title]}>{t.explore}</Text>
        <Text style={[styles.subtitle, themed.subtitle]}>{t.exploreSubtitle}</Text>
      </View>

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

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, themed.tab, activeTab === 'users' && styles.tabActive, activeTab === 'users' && themed.tabActive]} onPress={() => setActiveTab('users')}>
          <MaterialIcons name="people" size={18} color={activeTab === 'users' ? '#ffffff' : '#8b949e'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>İstifadəçilər</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, themed.tab, activeTab === 'posts' && styles.tabActive, activeTab === 'posts' && themed.tabActive]} onPress={() => setActiveTab('posts')}>
          <MaterialIcons name="dynamic-feed" size={18} color={activeTab === 'posts' ? '#ffffff' : '#8b949e'} />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>Postlar</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0d1117',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
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
  searchRow: {
    margin: 14,
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#e6edf3',
    marginLeft: 8,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#161b22',
  },
  tabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tabText: {
    color: '#8b949e',
    fontWeight: '900',
    marginLeft: 6,
    fontSize: 12,
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
    paddingBottom: 100,
  },
  resultCard: {
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    backgroundColor: '#21262d',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  resultBody: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    color: '#e6edf3',
    fontWeight: '900',
    fontSize: 14,
  },
  resultSubtitle: {
    color: '#8b949e',
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
    backgroundColor: '#6366f1',
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
    color: '#58a6ff',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 8,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 24,
  },
});
