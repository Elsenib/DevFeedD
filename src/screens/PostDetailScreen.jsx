import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as api from '../api';

const POST_TYPES = {
  TEXT: { label: 'POST', color: '#8b949e', icon: 'terminal' },
  GIT: { label: 'GIT', color: '#58a6ff', icon: 'code' },
  DEPLOY: { label: 'DEPLOY', color: '#3fb950', icon: 'cloud-upload' },
  MEDIA: { label: 'MEDIA', color: '#818cf8', icon: 'videocam' },
  JOB: { label: 'IS', color: '#fbbf24', icon: 'work' },
};

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
  const type = String(row?.post_type || row?.type || 'TEXT').toUpperCase();
  return {
    ...(row || {}),
    type,
    metadata: parseMetadata(row?.metadata),
    title: row?.title || row?.caption || 'Paylasim',
    caption: row?.caption || row?.title || row?.body || '',
    body: row?.body || row?.caption || row?.title || '',
    authorName: row?.name || row?.user?.name || 'Istifadeci',
    authorRole: row?.role_sub || row?.role || 'DevFeed member',
    likeCount: Number(row?.like_count ?? row?.likes ?? 0),
    commentCount: Number(row?.comment_count ?? row?.comments ?? 0),
    bookmarkCount: Number(row?.bookmark_count ?? 0),
    tags: Array.isArray(row?.tags) ? row.tags : [],
  };
}

function formatDate(value) {
  if (!value) return 'Indi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indi';
  return date.toLocaleDateString();
}

function AuthorAvatar({ name }) {
  const letter = String(name || 'U').slice(0, 1).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

function PayloadPreview({ post }) {
  const metadata = post.metadata || {};
  if (post.type === 'GIT') {
    const commits = Array.isArray(metadata.commits) ? metadata.commits : [];
    return (
      <View style={styles.gitBox}>
        <View style={styles.payloadHeader}>
          <MaterialIcons name="code" size={17} color="#58a6ff" />
          <Text style={styles.gitRepo}>{metadata.repo || 'repo qeyd edilmeyib'}</Text>
          <Text style={styles.payloadMuted}>{metadata.branch || 'main'}</Text>
        </View>
        {commits.map((commit, index) => (
          <View key={`${commit.hash || index}`} style={styles.commitRow}>
            <Text style={styles.commitHash}>{commit.hash || 'commit'}</Text>
            <Text style={styles.commitText}>{commit.msg || commit.message || post.caption}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (post.type === 'DEPLOY') {
    return (
      <View style={styles.deployBox}>
        <MaterialIcons name="cloud-upload" size={20} color="#3fb950" />
        <View style={styles.payloadBody}>
          <Text style={styles.payloadTitle}>{metadata.service || 'Deploy'} -> {metadata.env || 'Production'}</Text>
          <Text style={styles.deployText}>Deploy ugurlu - {metadata.duration || '2m 30s'}</Text>
        </View>
        <Text style={styles.liveBadge}>LIVE</Text>
      </View>
    );
  }
  if (post.type === 'MEDIA') {
    return (
      <View style={styles.mediaBox}>
        <MaterialIcons name="play-circle-outline" size={42} color="#818cf8" />
        <Text style={styles.mediaTitle}>{metadata.title || 'Media paylasim'}</Text>
        <Text style={styles.mediaLink}>{metadata.url || 'Demo/link elave edilmeyib'}</Text>
      </View>
    );
  }
  if (post.type === 'JOB') {
    const requirements = Array.isArray(metadata.requirements) ? metadata.requirements : [];
    return (
      <View style={styles.jobBox}>
        {requirements.map((item) => (
          <Text key={item} style={styles.jobChip}>{item}</Text>
        ))}
      </View>
    );
  }
  return null;
}

function EditPostModal({ visible, post, saving, onClose, onSave }) {
  const [caption, setCaption] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!post) return;
    setCaption(post.caption || '');
    setBody(post.body || post.caption || '');
    setTags((post.tags || []).map((tag) => `#${String(tag).replace(/^#/, '')}`).join(' '));
  }, [post, visible]);

  const handleSave = () => {
    const nextTags = tags
      .split(/[,\s]+/)
      .map((tag) => tag.trim().replace(/^#/, ''))
      .filter(Boolean);
    onSave({
      title: caption.trim().slice(0, 80) || body.trim().slice(0, 80),
      caption: caption.trim(),
      body: body.trim() || caption.trim(),
      metadata: post.metadata || {},
      tags: nextTags,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.editSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Postu redakte et</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#8b949e" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>BASLIQ / CAPTION</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Paylasim basligi"
            placeholderTextColor="#4b5563"
            style={styles.modalInput}
          />
          <Text style={styles.fieldLabel}>METN</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Detalli metn"
            placeholderTextColor="#4b5563"
            style={[styles.modalInput, styles.modalTextarea]}
            multiline
          />
          <Text style={styles.fieldLabel}>HASHTAG</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="#reactnative #backend"
            placeholderTextColor="#4b5563"
            style={styles.modalInput}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.saveButton, (!caption.trim() && !body.trim()) && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving || (!caption.trim() && !body.trim())}
          >
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>Yadda saxla</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PostDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const initialPost = useMemo(() => normalizePost(route.params?.post || {}), [route.params?.post]);
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const kind = POST_TYPES[post.type] || POST_TYPES.TEXT;
  const isOwner = String(user?.id || '') === String(post.user_id || post.userId || '');

  const loadPost = useCallback(async () => {
    try {
      const [freshPost, freshComments] = await Promise.all([
        api.fetchPostById(initialPost.id),
        api.fetchComments(initialPost.id),
      ]);
      setPost(normalizePost(freshPost));
      setComments(Array.isArray(freshComments) ? freshComments : []);
    } catch (error) {
      Alert.alert('Post xetasi', error.response?.data?.message || error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [initialPost.id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleAddComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setSavingComment(true);
    try {
      const newComment = await api.addComment(post.id, text);
      setComments((prev) => [
        {
          ...newComment,
          name: user?.name || user?.email || 'Sen',
        },
        ...prev,
      ]);
      setPost((prev) => ({ ...prev, commentCount: prev.commentCount + 1, comment_count: prev.commentCount + 1 }));
      setCommentText('');
    } catch (error) {
      Alert.alert('Serh xetasi', error.response?.data?.message || error.response?.data?.error || error.message);
    } finally {
      setSavingComment(false);
    }
  };

  const handleLike = async () => {
    setPost((prev) => ({ ...prev, likeCount: prev.likeCount + 1, like_count: prev.likeCount + 1 }));
    try {
      await api.toggleLike(post.id);
    } catch (error) {
      loadPost();
    }
  };

  const handleSaveEdit = async (payload) => {
    setSavingEdit(true);
    try {
      const updated = await api.updatePost(post.id, payload);
      setPost(normalizePost({
        ...post,
        ...updated,
        name: post.authorName,
        role_sub: post.authorRole,
      }));
      setEditOpen(false);
    } catch (error) {
      Alert.alert('Redakte xetasi', error.response?.data?.message || error.response?.data?.error || error.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Post silinsin?', 'Bu emeliyyat geri qaytarilmir.', [
      { text: 'Legv et', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePost(post.id);
            navigation.goBack();
          } catch (error) {
            Alert.alert('Silme xetasi', error.response?.data?.message || error.response?.data?.error || error.message);
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color="#e6edf3" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Paylasim</Text>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setEditOpen(true)}>
              <MaterialIcons name="edit" size={20} color="#58a6ff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.deleteButton]} onPress={handleDelete}>
              <MaterialIcons name="delete-outline" size={21} color="#f85149" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.postHeader}>
          <AuthorAvatar name={post.authorName} />
          <View style={styles.authorBlock}>
            <Text style={styles.postUser}>{post.authorName}</Text>
            <Text style={styles.postTime}>{post.authorRole} - {formatDate(post.created_at || post.createdAt)}</Text>
          </View>
          <View style={[styles.typeBadge, { borderColor: kind.color, backgroundColor: `${kind.color}18` }]}>
            <MaterialIcons name={kind.icon} size={13} color={kind.color} />
            <Text style={[styles.typeBadgeText, { color: kind.color }]}>{kind.label}</Text>
          </View>
        </View>

        <Text style={styles.postTitle}>{post.title}</Text>
        {!!post.body && <Text style={styles.postBody}>{post.body}</Text>}
        {post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag) => (
              <Text key={tag} style={styles.tagItem}>#{String(tag).replace(/^#/, '')}</Text>
            ))}
          </View>
        )}
        <PayloadPreview post={post} />

        <View style={styles.metricsRow}>
          <TouchableOpacity style={styles.metricButton} onPress={handleLike}>
            <MaterialIcons name="favorite-border" size={18} color="#8b949e" />
            <Text style={styles.metricText}>{post.likeCount}</Text>
          </TouchableOpacity>
          <View style={styles.metricButton}>
            <MaterialIcons name="chat-bubble-outline" size={18} color="#8b949e" />
            <Text style={styles.metricText}>{post.commentCount || comments.length}</Text>
          </View>
          <View style={styles.metricButton}>
            <MaterialIcons name="bookmark-border" size={18} color="#8b949e" />
            <Text style={styles.metricText}>{post.bookmarkCount}</Text>
          </View>
        </View>
      </View>

      <View style={styles.commentBox}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Serh yaz..."
          placeholderTextColor="#4b5563"
          style={styles.commentInput}
          multiline
        />
        <TouchableOpacity style={styles.commentButton} onPress={handleAddComment} disabled={savingComment || !commentText.trim()}>
          {savingComment ? <ActivityIndicator color="#ffffff" /> : <MaterialIcons name="send" size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Serhler</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <AuthorAvatar name={item.name || item.user?.name || item.sender?.name} />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{item.name || item.user?.name || item.userEmail || 'Istifadeci'}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Hele serh yoxdur. Ilk fikri sen yaz.</Text>}
      />
      <EditPostModal
        visible={editOpen}
        post={post}
        saving={savingEdit}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1117',
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    color: '#e6edf3',
    fontSize: 17,
    fontWeight: '900',
  },
  ownerActions: {
    flexDirection: 'row',
  },
  deleteButton: {
    marginLeft: 8,
  },
  headerSpacer: {
    width: 38,
  },
  card: {
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    margin: 14,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  authorBlock: {
    flex: 1,
    marginLeft: 10,
  },
  postUser: {
    color: '#e6edf3',
    fontWeight: '800',
    fontSize: 14,
  },
  postTime: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
  postTitle: {
    color: '#e6edf3',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  postBody: {
    color: '#c9d1d9',
    lineHeight: 22,
    fontSize: 14,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagItem: {
    color: '#58a6ff',
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  payloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payloadBody: {
    flex: 1,
    marginLeft: 10,
  },
  payloadTitle: {
    color: '#e6edf3',
    fontWeight: '800',
    fontSize: 13,
  },
  payloadMuted: {
    color: '#8b949e',
    fontSize: 11,
    marginLeft: 8,
  },
  gitBox: {
    backgroundColor: '#0d1117',
    borderRadius: 10,
    padding: 14,
    borderColor: '#21262d',
    borderWidth: 1,
  },
  gitRepo: {
    color: '#58a6ff',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  commitRow: {
    borderTopColor: '#21262d',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  commitHash: {
    color: '#8b949e',
    fontSize: 10,
  },
  commitText: {
    color: '#e6edf3',
    fontSize: 12,
    marginTop: 2,
  },
  deployBox: {
    backgroundColor: '#0f2018',
    borderRadius: 10,
    padding: 14,
    borderColor: '#1f3a1f',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deployText: {
    color: '#3fb950',
    fontSize: 11,
    marginTop: 3,
  },
  liveBadge: {
    color: '#3fb950',
    borderColor: '#3fb950',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '900',
  },
  mediaBox: {
    backgroundColor: '#151126',
    borderRadius: 10,
    minHeight: 145,
    borderColor: '#30215a',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mediaTitle: {
    color: '#818cf8',
    fontWeight: '800',
    marginTop: 8,
  },
  mediaLink: {
    color: '#a5b4fc',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  jobBox: {
    backgroundColor: '#1c1200',
    borderRadius: 10,
    padding: 14,
    borderColor: '#3d2a00',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobChip: {
    color: '#fbbf24',
    borderColor: 'rgba(245,158,11,0.3)',
    borderWidth: 1,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopColor: '#21262d',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metricText: {
    color: '#8b949e',
    fontSize: 12,
    marginLeft: 5,
  },
  commentBox: {
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    color: '#e6edf3',
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  commentButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#e6edf3',
    fontWeight: '900',
    fontSize: 15,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  commentCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
  },
  commentBody: {
    flex: 1,
    marginLeft: 10,
  },
  commentAuthor: {
    color: '#e6edf3',
    fontWeight: '800',
    marginBottom: 4,
  },
  commentText: {
    color: '#c9d1d9',
    lineHeight: 20,
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: '#21262d',
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 17,
    fontWeight: '900',
  },
  fieldLabel: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    color: '#e6edf3',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  modalTextarea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#21262d',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
