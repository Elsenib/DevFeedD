import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ResizeMode, Video } from 'expo-av';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import JobApplicationModal from '../components/JobApplicationModal';
import * as api from '../api';

const POST_TYPES = [
  { id: 'TEXT', label: 'Post', icon: 'terminal', color: '#8b949e' },
  { id: 'GIT', label: 'Git', icon: 'code', color: '#58a6ff' },
  { id: 'DEPLOY', label: 'Deploy', icon: 'cloud-upload', color: '#3fb950' },
  { id: 'MEDIA', label: 'Media', icon: 'videocam', color: '#818cf8' },
  { id: 'JOB', label: 'İş', icon: 'work', color: '#fbbf24' },
];

const TRENDING = ['#reactnative', '#golang', '#kubernetes', '#ai'];

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
  const metadata = parseMetadata(row.metadata);
  const type = String(row.post_type || row.type || 'TEXT').toUpperCase();
  return {
    ...row,
    type,
    metadata,
    authorName: row.name || row.user?.name || row.userEmail || 'Istifadeci',
    authorRole: row.role_sub || row.role || 'DevFeed member',
    authorAvatar: row.avatar_url || row.user?.avatar_url || row.authorAvatar || null,
    caption: row.caption || row.title || row.body || 'Yeni paylasim',
    body: row.body || row.caption || row.title || '',
    likeCount: Number(row.like_count ?? row.likes ?? 0),
    commentCount: Number(row.comment_count ?? row.comments?.length ?? row.comments ?? 0),
    bookmarkCount: Number(row.bookmark_count ?? 0),
    likedByMe: !!(row.liked_by_me ?? row.likedByMe),
    bookmarkedByMe: !!(row.bookmarked_by_me ?? row.bookmarkedByMe),
    createdAt: row.created_at || row.createdAt,
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

function formatTime(value) {
  if (!value) return 'Indi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Indi';
  return date.toLocaleDateString();
}

function typeStyle(type) {
  return POST_TYPES.find((item) => item.id === type) || POST_TYPES[0];
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

function GitPayload({ post }) {
  const { metadata } = post;
  const commits = Array.isArray(metadata.commits) ? metadata.commits : [];
  return (
    <View style={styles.gitBox}>
      <View style={styles.payloadHeader}>
        <MaterialIcons name="code" size={16} color="#58a6ff" />
        <Text style={styles.gitRepo}>{metadata.repo || 'repo qeyd edilmeyib'}</Text>
        <Text style={styles.payloadMuted}>{metadata.branch || 'main'}</Text>
      </View>
      {commits.length > 0 ? (
        commits.map((commit, index) => (
          <View key={`${commit.hash || index}`} style={styles.commitRow}>
            <Text style={styles.commitHash}>{commit.hash || 'commit'}</Text>
            <Text style={styles.commitText}>{commit.msg || commit.message}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.payloadMuted}>Commit mesaji elave edilmeyib.</Text>
      )}
      <View style={styles.statsRow}>
        <Text style={styles.additionText}>+{metadata.stats?.additions ?? 0}</Text>
        <Text style={styles.deletionText}>-{metadata.stats?.deletions ?? 0}</Text>
        <Text style={styles.payloadMuted}>{metadata.stats?.files ?? 1} fayl</Text>
      </View>
    </View>
  );
}

function DeployPayload({ post }) {
  const { metadata } = post;
  const deployUrl = metadata.url || metadata.link || metadata.deployUrl;
  return (
    <View style={styles.deployBox}>
      <View style={styles.payloadHeader}>
        <MaterialIcons name="cloud-upload" size={18} color="#3fb950" />
        <View style={styles.payloadBody}>
          <Text style={styles.payloadTitle}>{metadata.service || 'Deploy'} -> {metadata.env || 'Production'}</Text>
          <Text style={styles.deployText}>Deploy uğurlu - {metadata.duration || '2m 30s'}</Text>
          {!!deployUrl && (
            <TouchableOpacity onPress={() => openExternalUrl(deployUrl)}>
              <Text style={styles.payloadLink} numberOfLines={1}>{deployUrl}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.liveBadge}>LIVE</Text>
      </View>
    </View>
  );
}

function MediaPayload({ post }) {
  const { metadata } = post;
  const mediaUrl = metadata.mediaUrl || metadata.url;
  const mediaType = metadata.mediaType || (String(metadata.mimeType || '').startsWith('image/') ? 'image' : 'video');
  return (
    <TouchableOpacity
      style={styles.mediaBox}
      activeOpacity={mediaUrl ? 0.82 : 1}
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
          isLooping={false}
        />
      ) : (
        <View style={styles.mediaPreviewIcon}>
          <MaterialIcons name="play-circle-outline" size={46} color="#c4b5fd" />
        </View>
      )}
      <View style={styles.mediaOverlay}>
        <Text style={styles.mediaTitle}>{metadata.title || 'Media paylaşım'}</Text>
        <Text style={styles.mediaLink} numberOfLines={1}>
          {mediaType === 'video' && mediaUrl ? 'Video player' : mediaUrl ? 'Açmaq üçün toxun' : 'Media əlavə edilməyib'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function JobPayload({ post, onApplyJob }) {
  const metadata = post.metadata || {};
  const requirements = metadata.requirements || [];
  return (
    <View style={styles.jobBox}>
      <View style={styles.jobHeaderRow}>
        <View style={styles.payloadBody}>
          <Text style={styles.jobCompany}>{metadata.company || 'Şirkət qeyd edilməyib'}</Text>
          <Text style={styles.jobMeta}>{metadata.location || 'Remote / Bakı'} · {metadata.employmentType || 'Full-time'}</Text>
        </View>
        {!!metadata.salary && <Text style={styles.salaryBadge}>{metadata.salary}</Text>}
      </View>
      <View style={styles.chipWrap}>
        {requirements.map((item) => (
          <Text key={item} style={styles.jobChip}>{item}</Text>
        ))}
      </View>
      <TouchableOpacity
        style={styles.jobApplyButton}
        onPress={(event) => {
          event?.stopPropagation?.();
          onApplyJob(post);
        }}
      >
        <Text style={styles.jobApplyText}>Muraciet et</Text>
      </TouchableOpacity>
    </View>
  );
}

function PostPayload({ post, onApplyJob }) {
  if (post.type === 'GIT') return <GitPayload post={post} />;
  if (post.type === 'DEPLOY') return <DeployPayload post={post} />;
  if (post.type === 'MEDIA') return <MediaPayload post={post} />;
  if (post.type === 'JOB') return <JobPayload post={post} onApplyJob={onApplyJob} />;
  return null;
}

function PostCard({ post, onPress, onAuthorPress, onLike, onBookmark, onApplyJob }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    card: { backgroundColor: colors.surface, borderColor: colors.border },
    text: { color: colors.text },
    muted: { color: colors.muted },
  }), [colors]);
  const kind = typeStyle(post.type);
  return (
    <Pressable style={[styles.postCard, themed.card]} onPress={() => onPress(post)}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.authorTap}
          onPress={(event) => {
            event?.stopPropagation?.();
            onAuthorPress?.(post);
          }}
        >
          <AuthorAvatar name={post.authorName} avatarUrl={post.authorAvatar} />
          <View style={styles.authorBlock}>
            <Text style={[styles.postUser, themed.text]}>{post.authorName}</Text>
            <Text style={[styles.postTime, themed.muted]}>{post.authorRole} - {formatTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <View style={[styles.typeBadge, { borderColor: kind.color, backgroundColor: `${kind.color}18` }]}>
          <Text style={[styles.typeBadgeText, { color: kind.color }]}>{kind.label.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.postCaption, themed.text]}>{post.caption}</Text>
      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tagItem}>#{String(tag).replace(/^#/, '')}</Text>
          ))}
        </View>
      )}

      <PostPayload post={post} onApplyJob={onApplyJob} />

      <View style={styles.postFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            onLike(post);
          }}
        >
          <MaterialIcons name={post.likedByMe ? 'favorite' : 'favorite-border'} size={18} color={post.likedByMe ? '#f85149' : '#8b949e'} />
          <Text style={[styles.metaText, themed.muted, post.likedByMe && styles.likeTextActive]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.actionButton}>
          <MaterialIcons name="chat-bubble-outline" size={18} color="#8b949e" />
          <Text style={[styles.metaText, themed.muted]}>{post.commentCount}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            onBookmark(post);
          }}
        >
          <MaterialIcons name={post.bookmarkedByMe ? 'bookmark' : 'bookmark-border'} size={18} color={post.bookmarkedByMe ? '#fbbf24' : '#8b949e'} />
          <Text style={[styles.metaText, themed.muted, post.bookmarkedByMe && styles.bookmarkTextActive]}>{post.bookmarkCount}</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

function ComposeModal({ visible, onClose, onSubmit, submitting }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    sheet: { backgroundColor: colors.surface, borderColor: colors.border },
    title: { color: colors.text },
    captionInput: { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
    extraBox: { backgroundColor: colors.background, borderColor: colors.border },
    input: { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
    footer: { borderTopColor: colors.border },
    muted: { color: colors.muted },
  }), [colors]);
  const [type, setType] = useState('TEXT');
  const [caption, setCaption] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [service, setService] = useState('Railway');
  const [env, setEnv] = useState('Production');
  const [deployUrl, setDeployUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [requirementInput, setRequirementInput] = useState('');
  const [requirements, setRequirements] = useState([]);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('Remote');
  const [salary, setSalary] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [deadline, setDeadline] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const activeType = typeStyle(type);
  const hasMedia = !!mediaUrl.trim() || !!selectedMedia;
  const working = submitting || uploadingMedia;
  const modalInputStyle = [styles.modalInput, themed.input];
  const inlineInputStyle = [styles.inlineInput, themed.input];
  const extraBoxStyle = [styles.extraBox, themed.extraBox];
  const labelStyle = [styles.fieldLabel, themed.muted];
  const canSubmit = caption.trim().length > 0
    && (type !== 'GIT' || repo.trim())
    && (type !== 'JOB' || (company.trim() && requirements.length > 0))
    && (type !== 'MEDIA' || hasMedia);

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '');
    if (value && !tags.includes(value)) setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const addRequirement = () => {
    const value = requirementInput.trim();
    if (value && !requirements.includes(value)) setRequirements((prev) => [...prev, value]);
    setRequirementInput('');
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İcazə lazımdır', 'Media paylaşmaq üçün qalereya icazəsi ver.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.82,
      videoMaxDuration: 90,
    });

    if (result.canceled || !result.assets?.[0]) return;
    setSelectedMedia(result.assets[0]);
  };

  const reset = () => {
    setCaption('');
    setRepo('');
    setBranch('');
    setCommitMsg('');
    setService('Railway');
    setEnv('Production');
    setDeployUrl('');
    setMediaTitle('');
    setMediaUrl('');
    setSelectedMedia(null);
    setTagInput('');
    setTags([]);
    setRequirementInput('');
    setRequirements([]);
    setCompany('');
    setLocation('Remote');
    setSalary('');
    setEmploymentType('Full-time');
    setDeadline('');
    setType('TEXT');
  };

  const handleSubmit = async () => {
    if (!canSubmit || working) return;
    const metadata = {};
    setUploadingMedia(true);
    try {
      if (type === 'GIT') {
        metadata.repo = repo.trim();
        metadata.branch = branch.trim() || 'main';
        metadata.commits = [
          {
            hash: Math.random().toString(16).slice(2, 9),
            msg: commitMsg.trim() || caption.trim(),
          },
        ];
        metadata.stats = { additions: 0, deletions: 0, files: 1 };
      }
      if (type === 'DEPLOY') {
        metadata.service = service.trim() || 'Deploy';
        metadata.env = env.trim() || 'Production';
        metadata.duration = '2m 30s';
        metadata.url = deployUrl.trim();
      }
      if (type === 'MEDIA') {
        let uploadedMedia = null;
        if (selectedMedia) {
          uploadedMedia = await api.uploadPostMedia({
            uri: selectedMedia.uri,
            name: selectedMedia.fileName || selectedMedia.name || (selectedMedia.type === 'video' ? 'video.mp4' : 'image.jpg'),
            type: selectedMedia.mimeType || (selectedMedia.type === 'video' ? 'video/mp4' : 'image/jpeg'),
            mediaType: selectedMedia.type || 'media',
          });
        }
        metadata.title = mediaTitle.trim() || 'Media paylaşım';
        metadata.url = mediaUrl.trim() || uploadedMedia?.mediaUrl || '';
        metadata.mediaUrl = uploadedMedia?.mediaUrl || '';
        metadata.mediaType = uploadedMedia?.mediaType || selectedMedia?.type || 'link';
        metadata.mimeType = uploadedMedia?.mimeType || selectedMedia?.mimeType || '';
        metadata.fileName = uploadedMedia?.mediaFileName || selectedMedia?.fileName || selectedMedia?.name || '';
      }
      if (type === 'JOB') {
        metadata.company = company.trim();
        metadata.location = location.trim() || 'Remote';
        metadata.salary = salary.trim();
        metadata.employmentType = employmentType.trim() || 'Full-time';
        metadata.deadline = deadline.trim();
        metadata.requirements = requirements;
      }

      await onSubmit({
        title: caption.trim().slice(0, 80),
        caption: caption.trim(),
        body: caption.trim(),
        post_type: type,
        metadata,
        tags,
      });
      reset();
    } catch (error) {
      Alert.alert('Paylaşım xətası', error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const renderExtraFields = () => {
    if (type === 'GIT') {
      return (
        <View style={extraBoxStyle}>
          <Text style={labelStyle}>REPO ADI *</Text>
          <TextInput value={repo} onChangeText={setRepo} placeholder="username/my-project" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" />
          <Text style={labelStyle}>BRANCH</Text>
          <TextInput value={branch} onChangeText={setBranch} placeholder="feat/new-feature" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" />
          <Text style={labelStyle}>COMMIT MESAJI</Text>
          <TextInput value={commitMsg} onChangeText={setCommitMsg} placeholder="Fix: login validation" placeholderTextColor={colors.muted} style={modalInputStyle} />
        </View>
      );
    }
    if (type === 'DEPLOY') {
      return (
        <View style={extraBoxStyle}>
          <Text style={labelStyle}>SERVIS</Text>
          <TextInput value={service} onChangeText={setService} placeholder="Railway, Vercel, Kubernetes" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>MUHIT</Text>
          <TextInput value={env} onChangeText={setEnv} placeholder="Production" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>DEPLOY LINKI</Text>
          <TextInput value={deployUrl} onChangeText={setDeployUrl} placeholder="https://my-app.railway.app" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" keyboardType="url" />
        </View>
      );
    }
    if (type === 'JOB') {
      return (
        <View style={extraBoxStyle}>
          <Text style={labelStyle}>ŞİRKƏT *</Text>
          <TextInput value={company} onChangeText={setCompany} placeholder="DevFeed MMC" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>LOKASİYA</Text>
          <TextInput value={location} onChangeText={setLocation} placeholder="Bakı, Remote, Hybrid..." placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>İŞ TİPİ</Text>
          <TextInput value={employmentType} onChangeText={setEmploymentType} placeholder="Full-time, Part-time, Freelance" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>MAAŞ ARALIĞI</Text>
          <TextInput value={salary} onChangeText={setSalary} placeholder="1500-2500 AZN" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>SON TARİX</Text>
          <TextInput value={deadline} onChangeText={setDeadline} placeholder="30.06.2026" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>TƏLƏBLƏR *</Text>
          <View style={styles.chipWrap}>
            {requirements.map((item) => (
              <TouchableOpacity key={item} style={styles.removeChip} onPress={() => setRequirements((prev) => prev.filter((entry) => entry !== item))}>
                <Text style={styles.removeChipText}>{item} x</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.inlineInputRow}>
            <TextInput value={requirementInput} onChangeText={setRequirementInput} placeholder="Node.js, Docker..." placeholderTextColor={colors.muted} style={inlineInputStyle} />
            <TouchableOpacity style={styles.addSmallButton} onPress={addRequirement}>
              <Text style={styles.addSmallButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (type === 'MEDIA') {
      return (
        <View style={extraBoxStyle}>
          <Text style={labelStyle}>MEDIA BAŞLIĞI</Text>
          <TextInput value={mediaTitle} onChangeText={setMediaTitle} placeholder="Demo video, UI preview..." placeholderTextColor={colors.muted} style={modalInputStyle} />
          <TouchableOpacity style={styles.mediaPickerButton} onPress={pickMedia}>
            <MaterialIcons name={selectedMedia ? 'perm-media' : 'add-photo-alternate'} size={19} color="#c4b5fd" />
            <View style={styles.mediaPickerTextBlock}>
              <Text style={styles.mediaPickerTitle}>{selectedMedia?.fileName || selectedMedia?.name || 'Şəkil və ya video seç'}</Text>
              <Text style={styles.mediaPickerMeta}>{selectedMedia ? 'Posta yüklənəcək' : 'Instagram/TikTok kimi qalereyadan paylaş'}</Text>
            </View>
          </TouchableOpacity>
          <Text style={labelStyle}>İSTƏYƏ BAĞLI LİNK</Text>
          <TextInput value={mediaUrl} onChangeText={setMediaUrl} placeholder="https://demo-link.com" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" keyboardType="url" />
        </View>
      );
    }
    return null;
  };

  const renderTagFields = () => {
    return (
      <View style={extraBoxStyle}>
        <Text style={labelStyle}>HASHTAG</Text>
        <View style={styles.chipWrap}>
          {tags.map((tag) => (
            <TouchableOpacity key={tag} style={styles.removeChip} onPress={() => setTags((prev) => prev.filter((entry) => entry !== tag))}>
              <Text style={styles.removeChipText}>#{tag} x</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inlineInputRow}>
          <TextInput value={tagInput} onChangeText={setTagInput} placeholder="#reactnative" placeholderTextColor={colors.muted} style={inlineInputStyle} autoCapitalize="none" />
          <TouchableOpacity style={styles.addSmallButton} onPress={addTag}>
            <Text style={styles.addSmallButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
      >
        <View style={[styles.composeSheet, themed.sheet]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.title]}>Yeni Paylaşım</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.composeScroll}
            contentContainerStyle={styles.composeScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeTabs}>
              {POST_TYPES.map((item) => {
                const active = item.id === type;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.typeTab, active && { borderColor: item.color, backgroundColor: `${item.color}18` }]}
                    onPress={() => setType(item.id)}
                  >
                    <MaterialIcons name={item.icon} size={15} color={active ? item.color : '#8b949e'} />
                    <Text style={[styles.typeTabText, active && { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={
                type === 'GIT'
                  ? 'Commit haqqında nə bildirmək istəyirsən?'
                  : type === 'DEPLOY'
                    ? 'Deploy haqqında qeyd...'
                    : type === 'JOB'
                      ? 'Vakansiya haqqında ətraflı izah...'
                      : 'Nə düşünürsən?'
              }
              placeholderTextColor={colors.muted}
              style={[styles.captionInput, themed.captionInput]}
              multiline
              numberOfLines={4}
            />

            {renderExtraFields()}
            {renderTagFields()}
          </ScrollView>

          <View style={[styles.modalFooter, themed.footer]}>
            <View style={styles.publicInfo}>
              <MaterialIcons name="public" size={15} color={colors.muted} />
              <Text style={[styles.publicInfoText, themed.muted]}>Hamıya açıq</Text>
            </View>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: canSubmit ? activeType.color : '#21262d' }]}
              onPress={handleSubmit}
              disabled={!canSubmit || working}
            >
              {working ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Paylas</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FeedScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { theme, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    quickComposer: { backgroundColor: colors.surface, borderColor: colors.border },
    quickComposerText: { color: colors.muted },
    emptyText: { color: colors.muted },
  }), [colors]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(false);

  const normalizedPosts = useMemo(() => posts.map(normalizePost), [posts]);

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.fetchPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Feed xetasi', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleCreatePost = async (payload) => {
    setPosting(true);
    try {
      const created = await api.createPost(payload);
      setPosts((prev) => [
        {
          ...created,
          name: user?.name || user?.email,
          role: user?.role,
          role_sub: user?.role_sub || user?.roleSub,
          avatar_url: user?.avatar_url || user?.avatarUrl,
          like_count: 0,
          comment_count: 0,
          bookmark_count: 0,
          liked_by_me: false,
          bookmarked_by_me: false,
        },
        ...prev,
      ]);
      setComposeOpen(false);
    } catch (error) {
      Alert.alert('Paylasim xetasi', error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post) => {
    const nextLiked = !post.likedByMe;
    setPosts((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(post.id)) return item;
        const current = Number(item.like_count ?? item.likes ?? 0);
        return {
          ...item,
          like_count: Math.max(0, current + (nextLiked ? 1 : -1)),
          liked_by_me: nextLiked,
        };
      })
    );
    try {
      const result = nextLiked ? await api.toggleLike(post.id) : await api.unlikePost(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          String(item.id) === String(post.id)
            ? {
                ...item,
                like_count: result.like_count ?? item.like_count,
                liked_by_me: result.liked ?? nextLiked,
              }
            : item
        )
      );
    } catch (error) {
      loadPosts();
    }
  };

  const handleBookmark = async (post) => {
    const nextBookmarked = !post.bookmarkedByMe;
    setPosts((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(post.id)) return item;
        const current = Number(item.bookmark_count ?? 0);
        return {
          ...item,
          bookmark_count: Math.max(0, current + (nextBookmarked ? 1 : -1)),
          bookmarked_by_me: nextBookmarked,
        };
      })
    );
    try {
      const result = nextBookmarked ? await api.bookmarkPost(post.id) : await api.removeBookmark(post.id);
      setPosts((prev) =>
        prev.map((item) =>
          String(item.id) === String(post.id)
            ? {
                ...item,
                bookmark_count: result.bookmark_count ?? item.bookmark_count,
                bookmarked_by_me: result.bookmarked ?? nextBookmarked,
              }
            : item
        )
      );
    } catch (error) {
      loadPosts();
    }
  };

  const handleAuthorPress = (post) => {
    const authorId = post.user_id || post.userId;
    if (!authorId) return;
    if (String(authorId) === String(user?.id)) {
      navigation.navigate('Profile');
      return;
    }
    navigation.navigate('UserProfile', { userId: authorId });
  };

  const handleApplyJob = async (post) => {
    setSelectedJob(post);
  };

  const handleSubmitJobApplication = async ({ coverLetter, phone, resume }) => {
    if (!selectedJob) return;
    setApplyingJob(true);
    try {
      const uploadedResume = await api.uploadJobResume({
        uri: resume.uri,
        name: resume.name || 'cv.pdf',
        type: resume.mimeType || 'application/pdf',
      });
      const result = await api.applyToJob(selectedJob.id, {
        coverLetter,
        phone,
        resumeUrl: uploadedResume.resumeUrl,
        resumeFileName: uploadedResume.resumeFileName,
      });
      setSelectedJob(null);
      Alert.alert('Müraciət göndərildi', result.conversationId ? 'Elan sahibinin DM və müraciətlər bölməsinə düşdü.' : 'Müraciətin qeydə alındı.');
    } catch (error) {
      Alert.alert('Müraciət xətası', error.response?.data?.error || error.response?.data?.message || error.message);
    } finally {
      setApplyingJob(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <View style={[styles.header, themed.header]}>
        <View>
          <View style={styles.brandRow}>
            <MaterialIcons name="terminal" size={22} color="#6366f1" />
            <Text style={[styles.brandText, themed.title]}>dev<Text style={styles.brandAccent}>feed</Text></Text>
          </View>
          <Text style={[styles.headerSubtitle, themed.subtitle]}>{t.feedSubtitle}</Text>
        </View>
        <TouchableOpacity style={styles.plusButton} onPress={() => setComposeOpen(true)}>
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={normalizedPosts}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={(post) => navigation.navigate('PostDetail', { post })}
              onAuthorPress={handleAuthorPress}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onApplyJob={handleApplyJob}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <TouchableOpacity style={[styles.quickComposer, themed.quickComposer]} onPress={() => setComposeOpen(true)}>
                <AuthorAvatar name={user?.name || user?.email || 'U'} avatarUrl={user?.avatar_url || user?.avatarUrl} />
                <Text style={[styles.quickComposerText, themed.quickComposerText]}>Nə paylaşmaq istəyirsən?</Text>
                <MaterialIcons name="send" size={18} color="#6366f1" />
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendingRow}>
                {TRENDING.map((tag) => (
                  <View key={tag} style={styles.trendingChip}>
                    <Text style={styles.trendingText}>{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>Hələ paylaşım yoxdur. İlk postu sən yaz.</Text>}
        />
      )}

      <ComposeModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSubmit={handleCreatePost}
        submitting={posting}
      />
      <JobApplicationModal
        visible={!!selectedJob}
        post={selectedJob}
        submitting={applyingJob}
        onClose={() => setSelectedJob(null)}
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
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    backgroundColor: '#0d1117',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 8,
  },
  brandAccent: {
    color: '#6366f1',
  },
  headerSubtitle: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 3,
  },
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 100,
  },
  quickComposer: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    borderColor: '#21262d',
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickComposerText: {
    color: '#8b949e',
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
  },
  trendingRow: {
    marginBottom: 12,
  },
  trendingChip: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  trendingText: {
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: '700',
  },
  postCard: {
    backgroundColor: '#161b22',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#21262d',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  likeTextActive: {
    color: '#fca5a5',
  },
  bookmarkTextActive: {
    color: '#fbbf24',
  },
  postCaption: {
    color: '#c9d1d9',
    lineHeight: 21,
    marginBottom: 10,
    fontSize: 14,
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
  gitBox: {
    backgroundColor: '#0d1117',
    borderRadius: 10,
    padding: 14,
    borderColor: '#21262d',
    borderWidth: 1,
    marginTop: 4,
  },
  deployBox: {
    backgroundColor: '#0f2018',
    borderRadius: 10,
    padding: 14,
    borderColor: '#1f3a1f',
    borderWidth: 1,
    marginTop: 4,
  },
  mediaBox: {
    backgroundColor: '#151126',
    borderRadius: 10,
    minHeight: 150,
    borderColor: '#30215a',
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  mediaPreviewImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#0d1117',
  },
  mediaPreviewVideo: {
    width: '100%',
    height: 220,
    backgroundColor: '#0d1117',
  },
  mediaPreviewIcon: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    borderTopColor: '#30215a',
    borderTopWidth: 1,
    padding: 12,
    backgroundColor: 'rgba(21,17,38,0.95)',
  },
  jobBox: {
    backgroundColor: '#1c1200',
    borderRadius: 10,
    padding: 14,
    borderColor: '#3d2a00',
    borderWidth: 1,
    marginTop: 4,
  },
  jobHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  jobCompany: {
    color: '#fbbf24',
    fontWeight: '900',
    fontSize: 13,
  },
  jobMeta: {
    color: '#d6a742',
    fontSize: 11,
    marginTop: 3,
  },
  salaryBadge: {
    color: '#111827',
    backgroundColor: '#fbbf24',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 10,
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
  statsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  additionText: {
    color: '#3fb950',
    fontSize: 11,
    marginRight: 14,
  },
  deletionText: {
    color: '#f85149',
    fontSize: 11,
    marginRight: 14,
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
  mediaTitle: {
    color: '#818cf8',
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 4,
  },
  mediaLink: {
    color: '#a5b4fc',
    fontSize: 12,
    textAlign: 'center',
  },
  payloadLink: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  chipWrap: {
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
  jobApplyButton: {
    marginTop: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  jobApplyText: {
    color: '#000000',
    fontWeight: '900',
  },
  postFooter: {
    flexDirection: 'row',
    marginTop: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  metaText: {
    color: '#8b949e',
    fontSize: 12,
    marginLeft: 5,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  composeSheet: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: '#21262d',
    borderWidth: 1,
    padding: 18,
    maxHeight: '92%',
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
  typeTabs: {
    marginBottom: 14,
  },
  composeScroll: {
    flexGrow: 0,
  },
  composeScrollContent: {
    paddingBottom: 8,
  },
  typeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 8,
  },
  typeTabText: {
    color: '#8b949e',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  captionInput: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e6edf3',
    minHeight: 104,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 12,
  },
  extraBox: {
    backgroundColor: '#0d1117',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 9,
    color: '#e6edf3',
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
  },
  mediaPickerButton: {
    backgroundColor: '#161b22',
    borderColor: '#312e81',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaPickerTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  mediaPickerTitle: {
    color: '#e6edf3',
    fontWeight: '900',
  },
  mediaPickerMeta: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 3,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 9,
    color: '#e6edf3',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  addSmallButton: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: '#21262d',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addSmallButtonText: {
    color: '#e6edf3',
    fontSize: 18,
    fontWeight: '900',
  },
  removeChip: {
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 8,
    backgroundColor: '#161b22',
  },
  removeChipText: {
    color: '#58a6ff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    borderTopColor: '#21262d',
    borderTopWidth: 1,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  publicInfoText: {
    color: '#8b949e',
    fontSize: 12,
    marginLeft: 5,
  },
  submitButton: {
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
    minWidth: 92,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
