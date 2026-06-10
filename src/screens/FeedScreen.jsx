import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, RefreshControl } from 'react-native';
import * as api from '../api';

function PostItem({ post, onPress }) {
  return (
    <Pressable style={styles.postCard} onPress={() => onPress(post)}>
      <View style={styles.postHeader}>
        <Text style={styles.postUser}>{post.user?.name || post.userEmail || 'İstifadəçi'}</Text>
        <Text style={styles.postTime}>{post.createdAt ? new Date(post.createdAt).toLocaleString() : 'İndi'}</Text>
      </View>
      <Text style={styles.postCaption}>{post.caption || post.title || 'Yeni paylaşım'}</Text>
      {post.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tagItem}>#{tag.replace(/^#/, '')}</Text>
          ))}
        </View>
      )}
      <View style={styles.postFooter}>
        <Text style={styles.metaText}>❤️ {post.likes ?? 0}</Text>
        <Text style={styles.metaText}>💬 {post.comments?.length ?? post.comments ?? 0}</Text>
      </View>
    </Pressable>
  );
}

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = async () => {
    try {
      const data = await api.fetchPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={({ item }) => <PostItem post={item} onPress={(post) => navigation.navigate('PostDetail', { post })} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
          ListEmptyComponent={<Text style={styles.emptyText}>Heç bir paylaşım yoxdur.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  postUser: {
    color: '#e2e8f0',
    fontWeight: '700',
  },
  postTime: {
    color: '#94a3b8',
    fontSize: 12,
  },
  postCaption: {
    color: '#cbd5e1',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagItem: {
    color: '#7c3aed',
    fontSize: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
