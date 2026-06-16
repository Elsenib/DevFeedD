import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import JobApplicationModal from '../components/JobApplicationModal';
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
    authorAvatar: row?.avatar_url || row?.user?.avatar_url || row?.authorAvatar || null,
    likeCount: Number(row?.like_count ?? row?.likes ?? 0),
    commentCount: Number(row?.comment_count ?? row?.comments ?? 0),
    bookmarkCount: Number(row?.bookmark_count ?? 0),
    likedByMe: !!(row?.liked_by_me ?? row?.likedByMe),
    bookmarkedByMe: !!(row?.bookmarked_by_me ?? row?.bookmarkedByMe),
    tags: Array.isArray(row?.tags) ? row.tags : [],
  };
}

function formatDate(value) {
  if (!value) return 'Indi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indi';
  return date.toLocaleDateString();
}

function AuthorAvatar({ name, avatarUrl }) {
  const letter = String(name || 'U').slice(0, 1).toUpperCase();
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  }
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
    </View>
  );
}

async function openExternalUrl(url) {
  const value = String(url || '').trim();
  if (!/^https?:\/\//i.test(value)) return;
  try {
    const supported = await Linking.canOpenURL(value);
    if (!supported) {
      Alert.alert('Link açılmadı', 'Bu linki açmaq mümkün olmadı.');
      return;
    }
    await Linking.openURL(value);
  } catch (error) {
    Alert.alert('Link xətası', error.message);
  }
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
    const mediaUrl = metadata.mediaUrl || metadata.url;
    const mediaType = metadata.mediaType || (String(metadata.mimeType || '').startsWith('image/') ? 'image' : 'video');
    return (
      <TouchableOpacity
        style={styles.mediaBox}
        activeOpacity={mediaUrl ? 0.85 : 1}
        onPress={() => {
          if (mediaType !== 'video') openExternalUrl(mediaUrl);
        }}
        disabled={!mediaUrl || mediaType === 'video'}
      >
        {mediaType === 'image' && mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.mediaPreviewImage} />
        ) : mediaType === 'video' && mediaUrl ? (
          <Video
            source={{ uri: mediaUrl }}
            style={styles.mediaPreviewVideo}
            resizeMode={ResizeMode.COVER}
            useNativeControls
            shouldPlay={false}
          />
        ) : (
          <View style={styles.mediaPreviewIcon}>
            <MaterialIcons name="play-circle-outline" size={42} color="#818cf8" />
          </View>
        )}
        <View style={styles.mediaOverlay}>
          <Text style={styles.mediaTitle}>{metadata.title || 'Media paylaşım'}</Text>
          <Text style={styles.mediaLink}>{mediaType === 'video' && mediaUrl ? 'Video player' : mediaUrl || 'Media əlavə edilməyib'}</Text>
        </View>
      </TouchableOpacity>
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

function CommentComposer({ saving, replyTarget, colors, onCancelReply, onSubmit }) {
  const [draft, setDraft] = useState('');
  const themed = useMemo(() => ({
    commentBox: { backgroundColor: colors.surface, borderColor: colors.border },
    commentInput: { color: colors.text },
    replyBar: { borderBottomColor: colors.border },
  }), [colors]);

  const handleSend = async () => {
    const value = draft.trim();
    if (!value || saving) return;
    const submitted = await onSubmit(value);
    if (submitted !== false) setDraft('');
  };

  return (
    <View style={[styles.commentBox, themed.commentBox]}>
      <View style={styles.commentComposerBody}>
        {!!replyTarget && (
          <View style={[styles.replyingBar, themed.replyBar]}>
            <MaterialIcons name="reply" size={15} color="#58a6ff" />
            <Text style={styles.replyingText} numberOfLines={1}>
              {replyTarget.name || 'İstifadəçi'} şərhinə cavab
            </Text>
            <TouchableOpacity onPress={onCancelReply}>
              <MaterialIcons name="close" size={16} color="#8b949e" />
            </TouchableOpacity>
          </View>
        )}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={replyTarget ? '@tag ilə cavab yaz...' : 'Şərh yaz...'}
          placeholderTextColor={colors.muted}
          style={[styles.commentInput, themed.commentInput]}
          multiline
        />
      </View>
      <TouchableOpacity style={styles.commentButton} onPress={handleSend} disabled={saving || !draft.trim()}>
        {saving ? <ActivityIndicator color="#ffffff" /> : <MaterialIcons name="send" size={18} color="#ffffff" />}
      </TouchableOpacity>
    </View>
  );
}

export default function PostDetailScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { theme, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    iconButton: { backgroundColor: colors.surface, borderColor: colors.border },
    title: { color: colors.text },
    muted: { color: colors.muted },
    card: { backgroundColor: colors.surface, borderColor: colors.border },
    commentBox: { backgroundColor: colors.surface, borderColor: colors.border },
    commentInput: { color: colors.text },
    commentCard: { backgroundColor: colors.surface, borderColor: colors.border },
    emptyText: { color: colors.muted },
  }), [colors]);
  const initialPost = useMemo(() => normalizePost(route.params?.post || {}), [route.params?.post]);
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [applyingJob, setApplyingJob] = useState(false);
  const [boostingJob, setBoostingJob] = useState(false);
  const [applications, setApplications] = useState([]);

  const kind = POST_TYPES[post.type] || POST_TYPES.TEXT;
  const isOwner = String(user?.id || '') === String(post.user_id || post.userId || '');
  const isJobPost = post.type === 'JOB';

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

  useEffect(() => {
    if (!isOwner || !isJobPost || !post.id) return;
    api.fetchPostApplications(post.id)
      .then((data) => setApplications(Array.isArray(data) ? data : []))
      .catch(() => setApplications([]));
  }, [isOwner, isJobPost, post.id]);

  const handleAddComment = async (text) => {
    if (!text) return;
    setSavingComment(true);
    try {
      const newComment = await api.addComment(post.id, {
        text,
        parentId: replyTarget?.id,
        replyToUserId: replyTarget?.user_id || replyTarget?.userId,
      });
      setComments((prev) => [
        {
          ...newComment,
          name: user?.name || user?.email || 'Sen',
          reply_to_name: replyTarget?.name || replyTarget?.user?.name || null,
        },
        ...prev,
      ]);
      setPost((prev) => ({ ...prev, commentCount: prev.commentCount + 1, comment_count: prev.commentCount + 1 }));
      setReplyTarget(null);
      return true;
    } catch (error) {
      Alert.alert('Serh xetasi', error.response?.data?.message || error.response?.data?.error || error.message);
      return false;
    } finally {
      setSavingComment(false);
    }
  };

  const handleLike = async () => {
    const nextLiked = !post.likedByMe;
    setPost((prev) => {
      const nextCount = Math.max(0, prev.likeCount + (nextLiked ? 1 : -1));
      return {
        ...prev,
        likedByMe: nextLiked,
        liked_by_me: nextLiked,
        likeCount: nextCount,
        like_count: nextCount,
      };
    });
    try {
      const result = nextLiked ? await api.toggleLike(post.id) : await api.unlikePost(post.id);
      setPost((prev) => ({
        ...prev,
        likedByMe: result.liked ?? nextLiked,
        liked_by_me: result.liked ?? nextLiked,
        likeCount: result.like_count ?? prev.likeCount,
        like_count: result.like_count ?? prev.likeCount,
      }));
    } catch (error) {
      loadPost();
    }
  };

  const handleBookmark = async () => {
    const nextBookmarked = !post.bookmarkedByMe;
    setPost((prev) => {
      const nextCount = Math.max(0, prev.bookmarkCount + (nextBookmarked ? 1 : -1));
      return {
        ...prev,
        bookmarkedByMe: nextBookmarked,
        bookmarked_by_me: nextBookmarked,
        bookmarkCount: nextCount,
        bookmark_count: nextCount,
      };
    });
    try {
      const result = nextBookmarked ? await api.bookmarkPost(post.id) : await api.removeBookmark(post.id);
      setPost((prev) => ({
        ...prev,
        bookmarkedByMe: result.bookmarked ?? nextBookmarked,
        bookmarked_by_me: result.bookmarked ?? nextBookmarked,
        bookmarkCount: result.bookmark_count ?? prev.bookmarkCount,
        bookmark_count: result.bookmark_count ?? prev.bookmarkCount,
      }));
    } catch (error) {
      loadPost();
    }
  };

  const handleSubmitJobApplication = async ({ coverLetter, phone, resume }) => {
    setApplyingJob(true);
    try {
      const uploadedResume = await api.uploadJobResume({
        uri: resume.uri,
        name: resume.name || 'cv.pdf',
        type: resume.mimeType || 'application/pdf',
      });
      const result = await api.applyToJob(post.id, {
        coverLetter,
        phone,
        resumeUrl: uploadedResume.resumeUrl,
        resumeFileName: uploadedResume.resumeFileName,
      });
      setApplyOpen(false);
      Alert.alert('Müraciət göndərildi', result.conversationId ? 'Elan sahibinin DM və müraciətlər bölməsinə düşdü.' : 'Müraciətin qeydə alındı.');
    } catch (error) {
      Alert.alert('Müraciət xətası', error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setApplyingJob(false);
    }
  };

  const handleBoostJob = async () => {
    setBoostingJob(true);
    try {
      const result = await api.createJobBoostPayment({ postId: post.id, amount: 5 });
      Alert.alert(
        'Boost qeydə alındı',
        `5 AZN köçürməni bu hesaba et:\n${result.accountNumber}\nReferans: ${result.boost.reference}`
      );
    } catch (error) {
      Alert.alert('Boost xətası', error.response?.data?.message || error.message);
    } finally {
      setBoostingJob(false);
    }
  };

  const handleAuthorPress = () => {
    const authorId = post.user_id || post.userId;
    if (!authorId) return;
    if (String(authorId) === String(user?.id)) {
      navigation.navigate('Main', { screen: 'Profile' });
      return;
    }
    navigation.navigate('UserProfile', { userId: authorId });
  };

  const handleMessageApplicant = async (application) => {
    try {
      const conversation = await api.createConversation({ userId: application.user_id });
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.title || application.name || application.applicant_name,
      });
    } catch (error) {
      Alert.alert('Mesaj xətası', error.response?.data?.message || error.message);
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
      <View style={[styles.header, themed.header]}>
        <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, themed.title]}>{t.post}</Text>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={() => setEditOpen(true)}>
              <MaterialIcons name="edit" size={20} color="#58a6ff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, themed.iconButton, styles.deleteButton]} onPress={handleDelete}>
              <MaterialIcons name="delete-outline" size={21} color="#f85149" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={[styles.card, themed.card]}>
        <View style={styles.postHeader}>
          <TouchableOpacity style={styles.authorTap} onPress={handleAuthorPress}>
            <AuthorAvatar name={post.authorName} avatarUrl={post.authorAvatar} />
            <View style={styles.authorBlock}>
              <Text style={[styles.postUser, themed.title]}>{post.authorName}</Text>
              <Text style={[styles.postTime, themed.muted]}>{post.authorRole} - {formatDate(post.created_at || post.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.typeBadge, { borderColor: kind.color, backgroundColor: `${kind.color}18` }]}>
            <MaterialIcons name={kind.icon} size={13} color={kind.color} />
            <Text style={[styles.typeBadgeText, { color: kind.color }]}>{kind.label}</Text>
          </View>
        </View>

        <Text style={[styles.postTitle, themed.title]}>{post.title}</Text>
        {!!post.body && <Text style={[styles.postBody, themed.title]}>{post.body}</Text>}
        {post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag) => (
              <Text key={tag} style={styles.tagItem}>#{String(tag).replace(/^#/, '')}</Text>
            ))}
          </View>
        )}
        <PayloadPreview post={post} />

        {isJobPost && !isOwner && (
          <TouchableOpacity style={styles.applyButton} onPress={() => setApplyOpen(true)}>
            <MaterialIcons name="assignment-turned-in" size={18} color="#111827" />
            <Text style={styles.applyButtonText}>Müraciət et</Text>
          </TouchableOpacity>
        )}

        {isJobPost && isOwner && (
          <View style={styles.applicationsBox}>
            <View style={styles.applicationsHeader}>
              <Text style={styles.applicationsTitle}>Müraciətlər</Text>
              <Text style={styles.applicationsCount}>{applications.length}</Text>
            </View>
            <TouchableOpacity style={styles.boostButton} onPress={handleBoostJob} disabled={boostingJob}>
              {boostingJob ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <>
                  <MaterialIcons name="trending-up" size={17} color="#111827" />
                  <Text style={styles.boostButtonText}>Elanı önə çıxar · 5 AZN</Text>
                </>
              )}
            </TouchableOpacity>
            {applications.length > 0 ? (
              applications.slice(0, 4).map((item) => (
                <View key={String(item.id || item.user_id)} style={styles.applicationRow}>
                  <View style={styles.applicationBody}>
                    <Text style={styles.applicationName}>{item.name || item.applicant_name || 'İstifadəçi'}</Text>
                    <Text style={styles.applicationMeta}>{item.applicant_phone || 'Telefon yoxdur'} · {item.resume_file_name || 'CV'}</Text>
                    {!!item.cover_letter && <Text style={styles.applicationText} numberOfLines={2}>{item.cover_letter}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.applicationMessageButton}
                    onPress={() => handleMessageApplicant(item)}
                  >
                    <MaterialIcons name="send" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.applicationEmpty}>Hələ müraciət yoxdur.</Text>
            )}
          </View>
        )}

        <View style={styles.metricsRow}>
          <TouchableOpacity style={styles.metricButton} onPress={handleLike}>
            <MaterialIcons name={post.likedByMe ? 'favorite' : 'favorite-border'} size={18} color={post.likedByMe ? '#f85149' : '#8b949e'} />
            <Text style={[styles.metricText, post.likedByMe && styles.likeTextActive]}>{post.likeCount}</Text>
          </TouchableOpacity>
          <View style={styles.metricButton}>
            <MaterialIcons name="chat-bubble-outline" size={18} color="#8b949e" />
            <Text style={styles.metricText}>{post.commentCount || comments.length}</Text>
          </View>
          <TouchableOpacity style={styles.metricButton} onPress={handleBookmark}>
            <MaterialIcons name={post.bookmarkedByMe ? 'bookmark' : 'bookmark-border'} size={18} color={post.bookmarkedByMe ? '#fbbf24' : '#8b949e'} />
            <Text style={[styles.metricText, post.bookmarkedByMe && styles.bookmarkTextActive]}>{post.bookmarkCount}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CommentComposer
        saving={savingComment}
        replyTarget={replyTarget}
        colors={colors}
        onCancelReply={() => setReplyTarget(null)}
        onSubmit={handleAddComment}
      />

      <Text style={[styles.sectionTitle, themed.title]}>{t.comments}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, themed.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <FlatList
        data={comments}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.commentCard, themed.commentCard]}>
            <AuthorAvatar name={item.name || item.user?.name || item.sender?.name} avatarUrl={item.avatar_url || item.user?.avatar_url || item.sender?.avatar_url} />
            <View style={styles.commentBody}>
              <Text style={[styles.commentAuthor, themed.title]}>{item.name || item.user?.name || item.userEmail || 'Istifadeci'}</Text>
              {!!item.reply_to_name && (
                <Text style={styles.replyMeta}>@{item.reply_to_name} cavab</Text>
              )}
              <Text style={[styles.commentText, themed.title]}>{item.text}</Text>
              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => setReplyTarget({
                  id: item.id,
                  user_id: item.user_id,
                  name: item.name || item.user?.name || item.userEmail || 'İstifadəçi',
                })}
              >
                <MaterialIcons name="reply" size={14} color="#58a6ff" />
                <Text style={styles.replyButtonText}>Cavab ver</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>Hələ şərh yoxdur. İlk fikri sən yaz.</Text>}
      />
      <EditPostModal
        visible={editOpen}
        post={post}
        saving={savingEdit}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
      />
      <JobApplicationModal
        visible={applyOpen}
        post={post}
        submitting={applyingJob}
        onClose={() => setApplyOpen(false)}
        onSubmit={handleSubmitJobApplication}
      />
    </SafeAreaView>
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
  authorTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#21262d',
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
    overflow: 'hidden',
  },
  mediaPreviewImage: {
    width: '100%',
    height: 190,
    backgroundColor: '#0d1117',
  },
  mediaPreviewVideo: {
    width: '100%',
    height: 230,
    backgroundColor: '#0d1117',
  },
  mediaPreviewIcon: {
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    borderTopColor: '#30215a',
    borderTopWidth: 1,
    padding: 12,
    backgroundColor: 'rgba(21,17,38,0.95)',
  },
  mediaTitle: {
    color: '#818cf8',
    fontWeight: '800',
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
  applyButton: {
    marginTop: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  applyButtonText: {
    color: '#111827',
    fontWeight: '900',
    marginLeft: 8,
  },
  applicationsBox: {
    marginTop: 12,
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  applicationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  applicationsTitle: {
    color: '#e6edf3',
    fontWeight: '900',
  },
  applicationsCount: {
    color: '#fbbf24',
    fontWeight: '900',
  },
  boostButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  boostButtonText: {
    color: '#111827',
    fontWeight: '900',
    marginLeft: 7,
  },
  applicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: '#21262d',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  applicationBody: {
    flex: 1,
  },
  applicationName: {
    color: '#e6edf3',
    fontWeight: '900',
  },
  applicationMeta: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 3,
  },
  applicationText: {
    color: '#c9d1d9',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  applicationMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  applicationEmpty: {
    color: '#8b949e',
    fontSize: 12,
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
  likeTextActive: {
    color: '#fca5a5',
  },
  bookmarkTextActive: {
    color: '#fbbf24',
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
  commentComposerBody: {
    flex: 1,
  },
  replyingBar: {
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingBottom: 8,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyingText: {
    flex: 1,
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
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
  replyMeta: {
    color: '#58a6ff',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },
  replyButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
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
