import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import JobApplicationModal from '../components/JobApplicationModal';
import * as api from '../api';
import { openModerationMenu } from '../utils/moderation';
import { repairUploadUrl } from '../utils/media';
import Avatar from '../components/Avatar';

const POST_TYPES = [
  { id: 'TEXT', label: 'Post', icon: 'notes', color: '#A9AFBF' },
  { id: 'GIT', label: 'Kod', icon: 'code', color: '#6CB6FF' },
  { id: 'DEPLOY', label: 'Demo', icon: 'web', color: '#FF9A5C' },
  { id: 'MEDIA', label: 'Video', icon: 'play-circle-outline', color: '#FF6B8A' },
  { id: 'JOB', label: 'İş', icon: 'work-outline', color: '#F5B83D' },
];

const PAGE_SIZE = 20;
const AI_ICON = require('../../assets/ai-assistant.png');

const FEED_TABS = [
  { id: 'all', label: 'Sizin üçün' },
  { id: 'MEDIA', label: 'Videolar' },
  { id: 'DEPLOY', label: 'Demolar' },
  { id: 'JOB', label: 'İş' },
];

function parseMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try {
    return JSON.parse(metadata);
  } catch (error) {
    return {};
  }
}

export function normalizePost(row) {
  const metadata = parseMetadata(row.metadata);
  const type = String(row.post_type || row.type || 'TEXT').toUpperCase();
  return {
    ...row,
    type,
    metadata,
    authorName: row.name || row.user?.name || row.userEmail || 'İstifadəçi',
    authorRole: row.role_sub || row.role || 'DevFeed member',
    authorAvatar: row.avatar_url || row.user?.avatar_url || row.authorAvatar || null,
    caption: row.caption || row.title || row.body || 'Yeni paylaşım',
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
  if (!value) return 'indi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'indi';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'indi';
  if (minutes < 60) return `${minutes} dəq`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} saat`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / 1440)} gün`;
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

const URL_PATTERN = /(https?:\/\/[^\s]+)/gi;

function normalizeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return '';
}

function hostFromUrl(value) {
  const url = normalizeExternalUrl(value);
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./, '');
}

function inferLiveService(value) {
  const host = hostFromUrl(value);
  if (host.includes('vercel.app') || host.includes('vercel.com')) return 'Vercel';
  if (host.includes('netlify.app') || host.includes('netlify.com')) return 'Netlify';
  if (host.includes('github.io')) return 'GitHub Pages';
  return 'Live preview';
}

function getRepoUrl(metadata = {}) {
  const direct = normalizeExternalUrl(metadata.repoUrl || metadata.url || metadata.link);
  if (direct) return direct;
  const repo = String(metadata.repo || '').trim();
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) return `https://github.com/${repo}`;
  return '';
}

function LinkifiedText({ text, style, linkStyle, numberOfLines }) {
  const value = String(text || '');
  const parts = value.split(URL_PATTERN);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, index) => {
        if (/^https?:\/\//i.test(part)) {
          return (
            <Text
              key={`${part}-${index}`}
              style={linkStyle || styles.inlineLink}
              onPress={(event) => {
                event?.stopPropagation?.();
                openExternalUrl(part);
              }}
            >
              {part}
            </Text>
          );
        }
        return <Text key={`${part}-${index}`}>{part}</Text>;
      })}
    </Text>
  );
}

function formatClock(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// Feed video: 4:5 preview that plays muted while it is on screen and opens
// the full-screen 9:16 player on tap.
function FeedVideo({ uri, post, active }) {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [muted, setMuted] = useState(true);
  const shouldPlay = !!active && isFocused;
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.timeUpdateEventInterval = 0.25;
  });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0 });
  useEvent(player, 'statusChange', { status: player.status });
  const duration = player.duration > 0 ? Math.round(player.duration * 1000) : 0;
  const position = Math.round((currentTime || 0) * 1000);
  const progress = duration ? Math.min(1, position / duration) : 0;

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (shouldPlay) player.play();
    else player.pause();
  }, [player, shouldPlay]);

  return (
    <Pressable
      style={styles.feedVideo}
      onPress={(event) => {
        event?.stopPropagation?.();
        navigation.navigate('VideoPlayer', { uri, authorName: post.authorName, caption: post.caption });
      }}
      accessibilityLabel="Videonu tam ekranda aç"
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
      </View>
      {!!duration && (
        <View style={styles.videoTimePill} pointerEvents="none">
          <MaterialIcons name={shouldPlay ? 'play-arrow' : 'pause'} size={13} color="#ffffff" />
          <Text style={styles.videoTimeText}>{formatClock(duration - position)}</Text>
        </View>
      )}
      <Pressable
        style={styles.videoMuteButton}
        hitSlop={10}
        onPress={(event) => {
          event?.stopPropagation?.();
          setMuted((value) => !value);
        }}
        accessibilityLabel={muted ? 'Səsi aç' : 'Səsi bağla'}
      >
        <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={17} color="#ffffff" />
      </Pressable>
      <View style={styles.videoProgressTrack} pointerEvents="none">
        <View style={[styles.videoProgressFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

function AuthorAvatar({ name, avatarUrl, size }) {
  return <Avatar name={name} uri={avatarUrl} size={size || 42} />;
}

function GitPayload({ post }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const { metadata } = post;
  const commits = Array.isArray(metadata.commits) ? metadata.commits : [];
  const repoUrl = getRepoUrl(metadata);
  return (
    <View style={[styles.gitBox, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
      <View style={styles.payloadHeader}>
        <MaterialIcons name="code" size={16} color="#FF9A5C" />
        <Text style={[styles.gitRepo, { color: colors.text }]}>{metadata.repo || 'repo qeyd edilmeyib'}</Text>
        <Text style={[styles.payloadMuted, { color: colors.muted }]}>{metadata.branch || 'main'}</Text>
      </View>
      {!!repoUrl && (
        <TouchableOpacity
          style={styles.repoLinkRow}
          onPress={(event) => {
            event?.stopPropagation?.();
            openExternalUrl(repoUrl);
          }}
        >
          <MaterialIcons name="open-in-new" size={15} color="#93c5fd" />
          <Text style={[styles.payloadLink, styles.repoLinkText]} numberOfLines={1}>{repoUrl}</Text>
        </TouchableOpacity>
      )}
      {commits.length > 0 ? (
        commits.map((commit, index) => (
          <View key={`${commit.hash || index}`} style={styles.commitRow}>
            <Text style={styles.commitHash}>{commit.hash || 'commit'}</Text>
            <Text style={[styles.commitText, { color: colors.text }]}>{commit.msg || commit.message}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.payloadMuted, { color: colors.muted }]}>Commit mesaji elave edilmeyib.</Text>
      )}
      <View style={styles.statsRow}>
        <Text style={styles.additionText}>+{metadata.stats?.additions ?? 0}</Text>
        <Text style={styles.deletionText}>-{metadata.stats?.deletions ?? 0}</Text>
        <Text style={[styles.payloadMuted, { color: colors.muted }]}>{metadata.stats?.files ?? 1} fayl</Text>
      </View>
    </View>
  );
}

export function DeployPayload({ post }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const { metadata } = post;
  const deployUrl = normalizeExternalUrl(metadata.url || metadata.link || metadata.deployUrl);
  const host = hostFromUrl(deployUrl);
  const serviceName = metadata.service || inferLiveService(deployUrl);
  const repoUrl = normalizeExternalUrl(metadata.repoUrl)
    || (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(String(metadata.repo || '')) ? `https://github.com/${metadata.repo}` : '');
  const previewImage = metadata.previewImage || metadata.ogImage || metadata.image;
  const title = metadata.title || host || 'Demo';

  const openDemo = (event) => {
    event?.stopPropagation?.();
    if (!deployUrl) return;
    WebBrowser.openBrowserAsync(deployUrl, { toolbarColor: '#06080F', controlsColor: '#FF7A2F' }).catch(() => openExternalUrl(deployUrl));
  };

  return (
    <View style={[styles.demoCard, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
      <Pressable style={styles.demoPreview} onPress={openDemo} disabled={!deployUrl} accessibilityLabel={`Demonu aç: ${host}`}>
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.demoPlaceholder}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <RadialGradient id="demoGlow" cx="85%" cy="0%" rx="60%" ry="80%">
                  <Stop offset="0" stopColor="#FF7A2F" stopOpacity="0.35" />
                  <Stop offset="1" stopColor="#FF7A2F" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#demoGlow)" />
            </Svg>
            <Text style={styles.demoHost} numberOfLines={2}>{host || 'Demo linki yoxdur'}</Text>
            <Text style={styles.demoHint}>Önizləmə üçün toxun</Text>
          </View>
        )}
        {!!host && (
          <View style={styles.demoUrlPill}>
            <MaterialIcons name="lock" size={12} color="#DCE2EE" />
            <Text style={styles.demoUrlText} numberOfLines={1}>{host}</Text>
          </View>
        )}
        <View style={styles.demoServicePill}>
          <View style={styles.demoDot} />
          <Text style={styles.demoServiceText}>{serviceName}</Text>
        </View>
      </Pressable>
      <View style={styles.demoFooter}>
        <View style={styles.demoFooterText}>
          <Text style={[styles.demoTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.demoMeta, { color: colors.muted }]} numberOfLines={1}>
            {metadata.env || 'Production'}{metadata.stack ? ` · ${metadata.stack}` : ''}
          </Text>
        </View>
        {!!repoUrl && (
          <Pressable
            style={[styles.demoCodeButton, { borderColor: colors.border }]}
            onPress={(event) => {
              event?.stopPropagation?.();
              openExternalUrl(repoUrl);
            }}
            accessibilityLabel="Mənbə kodu"
          >
            <MaterialIcons name="code" size={19} color={colors.text} />
          </Pressable>
        )}
        {!!deployUrl && (
          <Pressable style={styles.demoOpenButton} onPress={openDemo}>
            <MaterialIcons name="play-arrow" size={17} color="#1A0A02" />
            <Text style={styles.demoOpenText}>Demonu aç</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function MediaPayload({ post, active }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const { metadata } = post;
  const mediaUrl = repairUploadUrl(metadata.mediaUrl || metadata.url);
  const mediaType = metadata.mediaType || (String(metadata.mimeType || '').startsWith('image/') ? 'image' : 'video');

  if (mediaType === 'video' && mediaUrl) return <FeedVideo uri={mediaUrl} post={post} active={active} />;
  if (mediaType === 'image' && mediaUrl) {
    return <Image source={{ uri: mediaUrl }} style={[styles.feedImage, { backgroundColor: colors.surfaceStrong }]} resizeMode="cover" />;
  }
  return (
    <View style={[styles.feedImage, styles.mediaMissing, { backgroundColor: colors.surfaceStrong }]}>
      <MaterialIcons name="play-circle-outline" size={44} color={colors.muted} />
      <Text style={[styles.demoMeta, { color: colors.muted }]}>Media əlavə edilməyib</Text>
    </View>
  );
}

function JobPayload({ post, onApplyJob }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const metadata = post.metadata || {};
  const requirements = Array.isArray(metadata.requirements) ? metadata.requirements : [];
  return (
    <View style={[styles.jobBox, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
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
          onApplyJob?.(post);
        }}
      >
        <Text style={styles.jobApplyText}>Müraciət et</Text>
      </TouchableOpacity>
    </View>
  );
}

function PostPayload({ post, onApplyJob, active }) {
  if (post.type === 'GIT') return <GitPayload post={post} />;
  if (post.type === 'DEPLOY') return <DeployPayload post={post} />;
  if (post.type === 'MEDIA') return <MediaPayload post={post} active={active} />;
  if (post.type === 'JOB') return <JobPayload post={post} onApplyJob={onApplyJob} />;
  return null;
}

export function PostCard({ post, onPress, onAuthorPress, onLike, onBookmark, onApplyJob, onMore, active }) {
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
            <Text style={[styles.postTime, themed.muted]} numberOfLines={1}>{post.authorRole} · {formatTime(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {post.type !== 'TEXT' && (
          <View style={[styles.typeBadge, { backgroundColor: `${kind.color}1F` }]}>
            <View style={[styles.typeDot, { backgroundColor: kind.color }]} />
            <Text style={[styles.typeBadgeText, { color: kind.color }]}>{kind.label}</Text>
          </View>
        )}
        {onMore && (
          <TouchableOpacity
            style={styles.moreButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={(event) => {
              event?.stopPropagation?.();
              onMore(post);
            }}
          >
            <MaterialIcons name="more-vert" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <LinkifiedText text={post.caption} style={[styles.postCaption, themed.text]} linkStyle={styles.inlineLink} />
      {post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.tagItem}>#{String(tag).replace(/^#/, '')}</Text>
          ))}
        </View>
      )}

      <PostPayload post={post} onApplyJob={onApplyJob} active={active} />

      <View style={styles.postFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            onLike(post);
          }}
        >
          <MaterialIcons name={post.likedByMe ? 'favorite' : 'favorite-border'} size={18} color={post.likedByMe ? '#f85149' : '#8790A6'} />
          <Text style={[styles.metaText, themed.muted, post.likedByMe && styles.likeTextActive]}>{post.likeCount}</Text>
        </TouchableOpacity>
        <View style={styles.actionButton}>
          <MaterialIcons name="chat-bubble-outline" size={18} color="#8790A6" />
          <Text style={[styles.metaText, themed.muted]}>{post.commentCount}</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event?.stopPropagation?.();
            onBookmark(post);
          }}
        >
          <MaterialIcons name={post.bookmarkedByMe ? 'bookmark' : 'bookmark-border'} size={18} color={post.bookmarkedByMe ? '#fbbf24' : '#8790A6'} />
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
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [service, setService] = useState('Vercel');
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
    && (type !== 'GIT' || repo.trim() || repoUrl.trim())
    && (type !== 'DEPLOY' || deployUrl.trim())
    && (type !== 'JOB' || company.trim())
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
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.82,
      videoMaxDuration: 90,
    });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.type === 'video') {
      const mimeType = String(asset.mimeType || '').toLowerCase();
      const uri = String(asset.uri || '').toLowerCase();
      const supportedVideo = mimeType.includes('mp4')
        || mimeType.includes('webm')
        || uri.endsWith('.mp4')
        || uri.endsWith('.webm');
      if (!supportedVideo) {
        Alert.alert('Video formatı', 'Android-də stabil oynatma üçün MP4 və ya WebM video seç.');
        return;
      }
    }
    setSelectedMedia(asset);
  };

  const reset = () => {
    setCaption('');
    setRepo('');
    setRepoUrl('');
    setBranch('');
    setCommitMsg('');
    setService('Vercel');
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
        const normalizedRepoUrl = normalizeExternalUrl(repoUrl);
        if (repoUrl.trim() && !normalizedRepoUrl) throw new Error('Git linkini düzgün yaz.');
        metadata.repo = repo.trim() || (normalizedRepoUrl ? hostFromUrl(normalizedRepoUrl) : 'Git repo');
        metadata.repoUrl = normalizedRepoUrl;
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
        const normalizedDeployUrl = normalizeExternalUrl(deployUrl);
        if (!normalizedDeployUrl) throw new Error('Vercel və ya Netlify linkini düzgün yaz.');
        metadata.service = service.trim() || inferLiveService(normalizedDeployUrl);
        metadata.env = env.trim() || 'Production';
        metadata.url = normalizedDeployUrl;
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
        const nextRequirements = [
          ...requirements,
          requirementInput.trim(),
        ].map((item) => item.trim()).filter(Boolean);
        metadata.company = company.trim();
        metadata.location = location.trim() || 'Remote';
        metadata.salary = salary.trim();
        metadata.employmentType = employmentType.trim() || 'Full-time';
        metadata.deadline = deadline.trim();
        metadata.requirements = [...new Set(nextRequirements)];
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
          <Text style={labelStyle}>REPO ADI</Text>
          <TextInput value={repo} onChangeText={setRepo} placeholder="username/my-project" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" />
          <Text style={labelStyle}>GİT LİNKİ</Text>
          <TextInput value={repoUrl} onChangeText={setRepoUrl} placeholder="https://github.com/username/my-project" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" keyboardType="url" />
          <Text style={labelStyle}>BRANCH</Text>
          <TextInput value={branch} onChangeText={setBranch} placeholder="feat/new-feature" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" />
          <Text style={labelStyle}>COMMİT MESAJI</Text>
          <TextInput value={commitMsg} onChangeText={setCommitMsg} placeholder="Fix: login validation" placeholderTextColor={colors.muted} style={modalInputStyle} />
        </View>
      );
    }
    if (type === 'DEPLOY') {
      return (
        <View style={extraBoxStyle}>
          <Text style={labelStyle}>SERVİS</Text>
          <TextInput value={service} onChangeText={setService} placeholder="Vercel, Netlify, GitHub Pages" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>MÜHİT</Text>
          <TextInput value={env} onChangeText={setEnv} placeholder="Production" placeholderTextColor={colors.muted} style={modalInputStyle} />
          <Text style={labelStyle}>DEMO LİNKİ *</Text>
          <TextInput value={deployUrl} onChangeText={setDeployUrl} placeholder="https://my-app.vercel.app" placeholderTextColor={colors.muted} style={modalInputStyle} autoCapitalize="none" keyboardType="url" />
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
          <Text style={labelStyle}>BAŞLIQ</Text>
          <TextInput value={mediaTitle} onChangeText={setMediaTitle} placeholder="Demo video, UI preview..." placeholderTextColor={colors.muted} style={modalInputStyle} />
          <TouchableOpacity style={styles.mediaPickerButton} onPress={pickMedia}>
            <MaterialIcons name={selectedMedia ? 'perm-media' : 'add-photo-alternate'} size={19} color="#FF9A5C" />
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
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, themed.title]}>Nə paylaşırsan?</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} accessibilityLabel="Bağla">
              <MaterialIcons name="close" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.composeScroll}
            contentContainerStyle={styles.composeScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.typeTabs} accessibilityRole="radiogroup">
              {POST_TYPES.map((item) => {
                const active = item.id === type;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.typeTab,
                      { borderColor: active ? item.color : colors.border, backgroundColor: active ? `${item.color}1F` : colors.surfaceStrong },
                    ]}
                    onPress={() => setType(item.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <MaterialIcons name={item.icon} size={22} color={item.color} />
                    <Text style={[styles.typeTabText, { color: active ? colors.text : colors.muted }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
              style={[styles.submitButton, { backgroundColor: canSubmit ? colors.primary : colors.surfaceStrong }]}
              onPress={handleSubmit}
              disabled={!canSubmit || working}
            >
              {working ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={[styles.submitButtonText, { color: canSubmit ? colors.onPrimary : colors.muted }]}>Paylaş</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FeedScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { theme, themeMode } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    quickComposer: { backgroundColor: colors.surface, borderColor: colors.border },
    quickComposerText: { color: colors.muted },
    emptyText: { color: colors.muted },
    headerIconButton: { backgroundColor: colors.surface, borderColor: colors.border },
  }), [colors]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJob, setApplyingJob] = useState(false);

  const normalizedPosts = useMemo(() => posts.map(normalizePost), [posts]);
  const [feedTab, setFeedTab] = useState('all');
  const visiblePosts = useMemo(
    () => (feedTab === 'all' ? normalizedPosts : normalizedPosts.filter((post) => post.type === feedTab)),
    [normalizedPosts, feedTab]
  );
  // "N yeni paylaşım" counts other people's posts newer than the newest post
  // the previous load showed, so it clears once you have seen them.
  const seenKey = `devfeed.feedSeen.${user?.id || 'guest'}`;
  const [seenAt, setSeenAt] = useState(null);
  const freshCount = useMemo(
    () => (seenAt === null ? 0 : normalizedPosts.filter(
      (post) => new Date(post.createdAt).getTime() > seenAt && String(post.user_id || post.userId) !== String(user?.id)
    ).length),
    [normalizedPosts, seenAt, user?.id]
  );
  const [activeVideoId, setActiveVideoId] = useState(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  // Only the first video post that is mostly on screen plays.
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const video = viewableItems.find((entry) => entry.item?.type === 'MEDIA');
    setActiveVideoId(video ? video.item.id : null);
  }).current;

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.fetchPosts({ limit: PAGE_SIZE, offset: 0 });
      const rows = Array.isArray(data) ? data : [];
      const stored = Number(await AsyncStorage.getItem(seenKey).catch(() => null)) || 0;
      const newest = Math.max(stored, ...rows.map((row) => new Date(row.created_at).getTime() || 0));
      setSeenAt(stored || newest);
      AsyncStorage.setItem(seenKey, String(newest)).catch(() => {});
      setPosts(rows);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      Alert.alert('Feed yüklənmədi', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seenKey]);

  // Next page when the list nears its end; ids already shown are skipped so
  // posts created meanwhile (which shift offsets) don't appear twice.
  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const data = await api.fetchPosts({ limit: PAGE_SIZE, offset: posts.length });
      const rows = Array.isArray(data) ? data : [];
      setPosts((prev) => {
        const seen = new Set(prev.map((post) => String(post.id)));
        return [...prev, ...rows.filter((post) => !seen.has(String(post.id)))];
      });
      setHasMore(rows.length === PAGE_SIZE);
    } catch (error) {
      // Keep what is on screen; the next scroll retries.
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // The tab bar's black hole button opens the composer through this param.
  useEffect(() => {
    if (route?.params?.compose) setComposeOpen(true);
  }, [route?.params?.compose]);

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
      Alert.alert('Paylaşım alınmadı', error.response?.data?.error || error.response?.data?.message || error.message);
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

  const handlePostMore = (post) => {
    const authorId = post.user_id || post.userId;
    openModerationMenu({
      targetType: 'post',
      targetId: post.id,
      userId: authorId,
      userName: post.authorName,
      currentUserId: user?.id,
      onBlocked: () => setPosts((prev) => prev.filter((item) => String(item.user_id || item.userId) !== String(authorId))),
    });
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
      <View pointerEvents="none" style={styles.aurora}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="feedGlowA" cx="20%" cy="0%" rx="70%" ry="60%">
              <Stop offset="0" stopColor="#FF7A2F" stopOpacity={themeMode === 'light' ? 0.14 : 0.22} />
              <Stop offset="1" stopColor="#FF7A2F" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="feedGlowB" cx="95%" cy="0%" rx="55%" ry="50%">
              <Stop offset="0" stopColor="#FF3D5A" stopOpacity={themeMode === 'light' ? 0.1 : 0.18} />
              <Stop offset="1" stopColor="#FF3D5A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#feedGlowA)" />
          <Rect width="100%" height="100%" fill="url(#feedGlowB)" />
        </Svg>
      </View>

      <View style={styles.header}>
        <View style={styles.greetingAvatarRing}>
          <View style={[styles.greetingAvatarInner, { borderColor: colors.background }]}>
            <AuthorAvatar name={user?.name || user?.email || 'U'} avatarUrl={user?.avatar_url || user?.avatarUrl} size={36} />
          </View>
        </View>
        <View style={styles.greetingText}>
          <Text style={[styles.greetingHello, themed.subtitle]}>Salam, {String(user?.name || '').split(' ')[0] || 'dost'}</Text>
          <Text style={[styles.greetingTitle, themed.title]} numberOfLines={1}>
            {freshCount ? `${freshCount} yeni paylaşım` : 'Yeni paylaşım yoxdur'}
          </Text>
        </View>
        <TouchableOpacity style={styles.aiButton} onPress={() => navigation.navigate('Assistant')} accessibilityLabel="DevFeed AI">
          <Image source={AI_ICON} style={styles.aiButtonIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.plusButton, themed.headerIconButton, styles.headerButtonGap]} onPress={() => navigation.navigate('Messages')} accessibilityLabel="Mesajlar">
          <MaterialIcons name="chat-bubble-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.feedTabs} accessibilityRole="tablist">
        {FEED_TABS.map((tab) => {
          const selected = feedTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setFeedTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={styles.feedTab}
            >
              <Text style={[styles.feedTabText, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '600' }]}>{tab.label}</Text>
              <View style={[styles.feedTabBar, { backgroundColor: selected ? colors.primary : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={visiblePosts}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={(post) => navigation.navigate('PostDetail', { post })}
              onAuthorPress={handleAuthorPress}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onApplyJob={handleApplyJob}
              onMore={String(item.user_id || item.userId) === String(user?.id) ? undefined : handlePostMore}
              active={item.id === activeVideoId}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
              <TouchableOpacity style={[styles.quickComposer, themed.quickComposer]} onPress={() => setComposeOpen(true)}>
                <AuthorAvatar name={user?.name || user?.email || 'U'} avatarUrl={user?.avatar_url || user?.avatarUrl} />
                <Text style={[styles.quickComposerText, themed.quickComposerText]}>Nə paylaşmaq istəyirsən?</Text>
                <MaterialIcons name="add-circle" size={22} color={colors.primary} />
              </TouchableOpacity>

            </View>
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadMoreSpinner} color={colors.primary} /> : null}
          ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>{feedTab === 'all' ? 'Hələ paylaşım yoxdur. İlk postu sən yaz.' : 'Bu bölmədə hələ paylaşım yoxdur.'}</Text>}
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
  aiButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButtonIcon: {
    width: 48,
    height: 48,
  },
  container: {
    flex: 1,
    backgroundColor: '#06080F',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#F1F4FA',
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 8,
  },
  brandAccent: {
    color: '#FF7A2F',
  },
  headerSubtitle: {
    color: '#8790A6',
    fontSize: 12,
    marginTop: 3,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
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
    paddingBottom: 150,
  },
  quickComposer: {
    backgroundColor: '#10131D',
    borderRadius: 14,
    borderColor: '#1F2433',
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickComposerText: {
    color: '#8790A6',
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
  },
  trendingRow: {
    marginBottom: 12,
  },
  trendingChip: {
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  trendingText: {
    color: '#FF9A5C',
    fontSize: 12,
    fontWeight: '700',
  },
  postCard: {
    backgroundColor: '#10131D',
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1F2433',
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
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1A0A02',
    fontSize: 15,
    fontWeight: '900',
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F2433',
  },
  authorBlock: {
    flex: 1,
    marginLeft: 10,
  },
  postUser: {
    color: '#F1F4FA',
    fontWeight: '800',
    fontSize: 14,
  },
  postTime: {
    color: '#8790A6',
    fontSize: 11,
    marginTop: 2,
  },
  moreButton: {
    marginLeft: 6,
    padding: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  likeTextActive: {
    color: '#fca5a5',
  },
  bookmarkTextActive: {
    color: '#fbbf24',
  },
  postCaption: {
    color: '#DCE2EE',
    lineHeight: 21,
    marginBottom: 10,
    fontSize: 14,
  },
  inlineLink: {
    color: '#FF9A5C',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagItem: {
    color: '#FF9A5C',
    fontSize: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  gitBox: {
    backgroundColor: '#06080F',
    borderRadius: 10,
    padding: 14,
    borderColor: '#1F2433',
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
  livePreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payloadBodyNoMargin: {
    flex: 1,
  },
  livePreviewFrame: {
    borderColor: 'rgba(63,185,80,0.25)',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,32,24,0.72)',
  },
  livePreviewBar: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: 'rgba(63,185,80,0.18)',
    borderBottomWidth: 1,
    paddingHorizontal: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  livePreviewUrl: {
    color: '#a7f3d0',
    fontSize: 11,
    marginLeft: 5,
    flex: 1,
  },
  livePreviewBody: {
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  livePreviewTitle: {
    color: '#F1F4FA',
    fontWeight: '900',
    marginTop: 6,
    fontSize: 13,
  },
  livePreviewHint: {
    color: '#86efac',
    fontSize: 11,
    marginTop: 3,
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
    backgroundColor: '#06080F',
  },
  mediaPreviewVideo: {
    width: '100%',
    height: 220,
    backgroundColor: '#06080F',
  },
  videoPausedOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
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
    color: '#F1F4FA',
    fontWeight: '800',
    fontSize: 13,
  },
  payloadMuted: {
    color: '#8790A6',
    fontSize: 11,
    marginLeft: 8,
  },
  gitRepo: {
    color: '#FF9A5C',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
    marginLeft: 8,
  },
  repoLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  repoLinkText: {
    flex: 1,
    marginLeft: 6,
    marginTop: 0,
  },
  commitRow: {
    borderTopColor: '#1F2433',
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  commitHash: {
    color: '#8790A6',
    fontSize: 10,
  },
  commitText: {
    color: '#F1F4FA',
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
    color: '#FF9A5C',
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
    color: '#8790A6',
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
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  typeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  composeScroll: {
    flexGrow: 0,
  },
  composeScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
  },
  typeTab: {
    flex: 1,
    height: 70,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  captionInput: {
    minHeight: 110,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  extraBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 14,
    color: '#F1F4FA',
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 10,
    fontSize: 14,
  },
  mediaPickerButton: {
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mediaPickerTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  mediaPickerTitle: {
    color: '#F1F4FA',
    fontWeight: '900',
  },
  mediaPickerMeta: {
    color: '#8790A6',
    fontSize: 11,
    marginTop: 3,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 14,
    color: '#F1F4FA',
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 14,
  },
  addSmallButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addSmallButtonText: {
    color: '#F1F4FA',
    fontSize: 18,
    fontWeight: '900',
  },
  removeChip: {
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 8,
    backgroundColor: '#10131D',
  },
  removeChipText: {
    color: '#FF9A5C',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    borderTopColor: '#1F2433',
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  publicInfoText: {
    color: '#8790A6',
    fontSize: 12,
    marginLeft: 5,
  },
  submitButton: {
    minWidth: 120,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  aurora: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 320,
  },
  greetingAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    backgroundColor: '#FF7A2F',
  },
  greetingAvatarInner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  greetingHello: {
    fontSize: 12,
    fontWeight: '600',
  },
  greetingTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerButtonGap: {
    marginLeft: 8,
  },
  feedTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  feedTab: {
    marginRight: 22,
    paddingTop: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  feedTabText: {
    fontSize: 15,
  },
  feedTabBar: {
    alignSelf: 'center',
    width: 22,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
  feedVideo: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginTop: 4,
  },
  videoTimePill: {
    position: 'absolute',
    left: 10,
    bottom: 12,
    height: 26,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: 'rgba(6,8,15,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoTimeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  videoMuteButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6,8,15,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  videoProgressFill: {
    height: 3,
    backgroundColor: '#FF7A2F',
  },
  feedImage: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 18,
    marginTop: 4,
  },
  mediaMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  demoPreview: {
    height: 176,
    backgroundColor: '#0B0F1C',
    overflow: 'hidden',
  },
  demoPlaceholder: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  demoHost: {
    color: '#F1F4FA',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  demoHint: {
    color: '#8790A6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  demoUrlPill: {
    position: 'absolute',
    left: 10,
    top: 10,
    maxWidth: '62%',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(6,8,15,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoUrlText: {
    color: '#DCE2EE',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
    flexShrink: 1,
  },
  demoServicePill: {
    position: 'absolute',
    right: 10,
    top: 10,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(6,8,15,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,47,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF7A2F',
    marginRight: 6,
  },
  demoServiceText: {
    color: '#FFB07A',
    fontSize: 11,
    fontWeight: '800',
  },
  demoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  demoFooterText: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  demoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  demoMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  demoCodeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  demoOpenButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#FF7A2F',
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoOpenText: {
    color: '#1A0A02',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  loadMoreSpinner: {
    marginVertical: 18,
  },
});
