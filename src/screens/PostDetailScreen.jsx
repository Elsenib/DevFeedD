import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as api from '../api';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;
  const [comments, setComments] = useState(post.comments || post.commentsList || []);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [likes, setLikes] = useState(post.likes ?? 0);
  const [liked, setLiked] = useState(post.liked || false);

  const handleAddComment = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const newComment = await api.addComment(post.id, text.trim());
      setComments((prev) => [newComment, ...prev]);
      setText('');
    } catch (error) {
      Alert.alert('Xəta', error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLike = async () => {
    setLiked((prev) => !prev);
    setLikes((prev) => (liked ? prev - 1 : prev + 1));
    try {
      await api.toggleLike(post.id);
    } catch (error) {
      console.warn(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Post detayı</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.postTitle}>{post.title || post.caption || 'Paylaşım'}</Text>
        <Text style={styles.postBody}>{post.body || post.caption || 'Detallar burada göstəriləcək.'}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>❤️ {likes}</Text>
          <Pressable onPress={handleLike} style={styles.likeButton}>
            <Text style={styles.likeText}>{liked ? 'Sınıfı geri al' : 'Bəyən'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.commentBox}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Şərh yaz..."
          placeholderTextColor="#94a3b8"
          style={styles.commentInput}
          multiline
        />
        <Pressable style={styles.commentButton} onPress={handleAddComment} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.commentButtonText}>Göndər</Text>}
        </Pressable>
      </View>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        style={styles.commentList}
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <Text style={styles.commentAuthor}>{item.user?.name || item.userEmail || 'İstifadəçi'}</Text>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Şərh yoxdur. İlk yaz!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 18,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    borderColor: '#111827',
    borderWidth: 1,
  },
  postTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  postBody: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  metaText: {
    color: '#94a3b8',
  },
  likeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#7c3aed',
    borderRadius: 14,
  },
  likeText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 14,
    color: '#e2e8f0',
    minHeight: 44,
  },
  commentButton: {
    marginLeft: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  commentButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentList: {
    marginHorizontal: 16,
  },
  commentCard: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderColor: '#111827',
    borderWidth: 1,
  },
  commentAuthor: {
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 6,
  },
  commentText: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
