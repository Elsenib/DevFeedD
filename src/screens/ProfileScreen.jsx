import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';
import { PAYMENTS_ENABLED } from '../constants/config';
import { AuroraGlow, HeaderIconButton } from '../components/ScreenChrome';
import Avatar from '../components/Avatar';
import { openModerationMenu } from '../utils/moderation';
import { PostCard, normalizePost } from './FeedScreen';

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function EditProfileModal({ visible, profile, colors, saving, onClose, onSave, onPickAvatar }) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [role, setRole] = useState('');
  const [roleSub, setRoleSub] = useState('');
  const [skills, setSkills] = useState('');

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setBio(profile.bio || '');
    setWebsite(profile.website || '');
    setRole(profile.role || '');
    setRoleSub(profile.role_sub || profile.roleSub || '');
    setSkills((profile.skills || profile.stack || []).join(', '));
  }, [profile, visible]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Android draws edge-to-edge, so the window no longer shrinks for the
          keyboard; padding lifts the sheet and the scroll view reaches every field. */}
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profili düzəlt</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.avatarPicker} onPress={onPickAvatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImageLarge} />
              ) : (
                <View style={styles.avatarLarge}>
                  <MaterialIcons name="add-a-photo" size={28} color="#ffffff" />
                </View>
              )}
              <Text style={styles.avatarPickerText}>Profil şəkli seç</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>AD</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Ad Soyad" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.fieldLabel}>BIO</Text>
            <TextInput value={bio} onChangeText={setBio} placeholder="Qisa bio" placeholderTextColor={colors.muted} style={[styles.input, styles.textarea]} multiline />
            <Text style={styles.fieldLabel}>ROL</Text>
            <TextInput value={role} onChangeText={setRole} placeholder="Developer, Designer..." placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.fieldLabel}>ALT ROL</Text>
            <TextInput value={roleSub} onChangeText={setRoleSub} placeholder="Frontend, Backend..." placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.fieldLabel}>STACK</Text>
            <TextInput value={skills} onChangeText={setSkills} placeholder="React Native, Node.js" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.fieldLabel}>WEBSITE</Text>
            <TextInput value={website} onChangeText={setWebsite} placeholder="https://..." placeholderTextColor={colors.muted} style={styles.input} autoCapitalize="none" />

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={() => onSave({ name, bio, website, role, roleSub, skills: splitList(skills) })}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Yadda saxla</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SupportModal({ visible, profile, colors, config, submitting, onClose, onSubmit }) {
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (visible) {
      setAmount('1');
      setNote('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Destek ol</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.supportTitle}>{profile?.name || 'DevFeed profili'} üçün dəstək</Text>
          <Text style={styles.supportText}>Minimum 1 AZN. Ödənişi hesab nömrəsinə edərək referans kodunu saxla.</Text>

          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>HESAB NÖMRƏSİ</Text>
            <Text style={styles.accountNumber}>{config?.accountNumber || 'AZ00 XXXX XXXX XXXX XXXX XXXX XXXX'}</Text>
            <Text style={styles.accountMeta}>{config?.receiverName || 'DevFeed creator'}</Text>
          </View>

          <Text style={styles.fieldLabel}>MƏBLƏĞ (AZN)</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.fieldLabel}>QEYD</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="İstəyə bağlı qeyd" placeholderTextColor={colors.muted} style={styles.input} />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={() => onSubmit({ amount: Number(amount), note })}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Dəstəyi qeydə al</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ManualSupportModal({ visible, profile, colors, config, submitting, onClose, onSubmit }) {
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (visible) {
      setAmount('1');
      setNote('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Dəstək ol</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.supportTitle}>{profile?.name || 'DevFeed profili'} üçün dəstək</Text>
          <Text style={styles.supportText}>
            Bu mərhələdə ödəniş kartdan avtomatik tutulmur. Məbləği bank tətbiqindən aşağıdakı hesaba köçür, sonra bu formanı doldur.
          </Text>

          <View style={styles.accountBox}>
            <Text style={styles.accountLabel}>KÖÇÜRMƏ ÜÇÜN HESAB</Text>
            <Text style={styles.accountNumber}>{config?.accountNumber || 'AZ00 XXXX XXXX XXXX XXXX XXXX XXXX'}</Text>
            <Text style={styles.accountMeta}>{config?.receiverName || 'DevFeed creator'}</Text>
          </View>

          <Text style={styles.supportStep}>1. Bank tətbiqində bu hesaba köçürmə et.</Text>
          <Text style={styles.supportStep}>2. Məbləği burada yaz və qeydə al.</Text>
          <Text style={styles.supportStep}>3. App sənə referans kodu verəcək.</Text>

          <Text style={styles.fieldLabel}>MƏBLƏĞ (AZN)</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="1" placeholderTextColor={colors.muted} style={styles.input} />
          <Text style={styles.fieldLabel}>QEYD</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="İstəyə bağlı qeyd" placeholderTextColor={colors.muted} style={styles.input} />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={() => onSubmit({ amount: Number(amount), note })}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Köçürməni qeydə al</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen({ route, navigation }) {
  const { user, updateCurrentUser, openAccountSwitcher } = useContext(AuthContext);
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [supportConfig, setSupportConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [activityHidden, setActivityHidden] = useState(false);
  const targetUserId = route?.params?.userId;
  const isOwnProfile = !targetUserId || String(targetUserId) === String(user?.id);
  const scrollRef = useRef(null);
  const [postsY, setPostsY] = useState(0);
  const posts = useMemo(() => myPosts.map(normalizePost), [myPosts]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, postsData, configData] = await Promise.all([
        isOwnProfile ? api.fetchProfile() : api.fetchUserProfile(targetUserId),
        isOwnProfile ? api.fetchMyPosts().catch(() => []) : api.fetchUserPosts(targetUserId).catch(() => ({ posts: [] })),
        PAYMENTS_ENABLED ? api.fetchSupportConfig().catch(() => null) : null,
      ]);
      setProfile(profileData);
      setMyPosts(Array.isArray(postsData) ? postsData : (postsData.posts || []));
      setActivityHidden(!Array.isArray(postsData) && !!postsData.hidden);
      setSupportConfig(configData);
    } catch (error) {
      Alert.alert('Profil xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, targetUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (isOwnProfile && route?.params?.openEdit) {
      setEditOpen(true);
    }
  }, [isOwnProfile, route?.params?.openEdit]);

  const displayName = profile?.name || (isOwnProfile ? user?.name || user?.email : null) || 'İstifadəçi';
  const stack = Array.isArray(profile?.stack) ? profile.stack : (Array.isArray(profile?.skills) ? profile.skills : []);

  const handleSaveProfile = async (payload) => {
    setSaving(true);
    try {
      const data = await updateCurrentUser(payload);
      const nextProfile = { ...(profile || {}), ...(data.user || {}), stack: payload.skills };
      setProfile(nextProfile);
      setEditOpen(false);
      Alert.alert('Profil yeniləndi', 'Məlumatlar yadda saxlanıldı.');
    } catch (error) {
      Alert.alert('Profil xətası', error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!isOwnProfile) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İcazə lazımdır', 'Profil şəkli seçmək üçün qalereya icazəsi ver.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const uploaded = await api.uploadAvatar({
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      setProfile((prev) => ({ ...(prev || {}), avatar_url: uploaded.avatar_url }));
      await updateCurrentUser({ avatar_url: uploaded.avatar_url }).catch(() => null);
      Alert.alert('Şəkil yeniləndi', 'Profil şəklin uğurla yükləndi.');
    } catch (error) {
      Alert.alert('Avatar xətası', error.response?.data?.message || error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSupport = async ({ amount, note }) => {
    if (!Number.isFinite(amount) || amount < 1) {
      Alert.alert('Məbləğ səhvdir', 'Minimum dəstək 1 AZN olmalıdır.');
      return;
    }
    setSupportSubmitting(true);
    try {
      const result = await api.createSupportPayment({ receiverId: profile?.id || user?.id, amount, note });
      setSupportOpen(false);
      Alert.alert(
        'Dəstək qeydə alındı',
        `Referans: ${result.payment.reference}\nHesab: ${result.accountNumber}`
      );
    } catch (error) {
      Alert.alert('Dəstək xətası', error.response?.data?.message || error.message);
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile?.id) return;
    const nextFollowing = !profile.following_by_me;
    setProfile((prev) => ({
      ...(prev || {}),
      following_by_me: nextFollowing,
      followers_count: Math.max(0, Number(prev?.followers_count || 0) + (nextFollowing ? 1 : -1)),
    }));

    try {
      const result = nextFollowing ? await api.followUser(profile.id) : await api.unfollowUser(profile.id);
      setProfile((prev) => ({
        ...(prev || {}),
        following_by_me: result.following ?? nextFollowing,
        followers_count: result.followers_count ?? prev?.followers_count,
        following_count: result.following_count ?? prev?.following_count,
      }));
    } catch (error) {
      Alert.alert('İzləmə xətası', error.response?.data?.message || error.message);
      loadProfile();
    }
  };

  const handleProfileMore = () => {
    openModerationMenu({
      targetType: 'user',
      targetId: profile?.id || targetUserId,
      userId: profile?.id || targetUserId,
      userName: profile?.name,
      currentUserId: user?.id,
      onBlocked: () => navigation.goBack(),
    });
  };

  // Optimistic like/bookmark on the profile's own copy of the posts.
  const patchPost = (postId, patch) => {
    setMyPosts((prev) => prev.map((item) => (String(item.id) === String(postId) ? { ...item, ...patch(item) } : item)));
  };

  const handleLike = async (post) => {
    const next = !post.likedByMe;
    patchPost(post.id, (item) => ({ liked_by_me: next, like_count: Math.max(0, Number(item.like_count || 0) + (next ? 1 : -1)) }));
    try {
      const result = next ? await api.toggleLike(post.id) : await api.unlikePost(post.id);
      patchPost(post.id, (item) => ({ liked_by_me: result.liked ?? next, like_count: result.like_count ?? item.like_count }));
    } catch (error) {
      loadProfile();
    }
  };

  const handleBookmark = async (post) => {
    const next = !post.bookmarkedByMe;
    patchPost(post.id, (item) => ({ bookmarked_by_me: next, bookmark_count: Math.max(0, Number(item.bookmark_count || 0) + (next ? 1 : -1)) }));
    try {
      const result = next ? await api.bookmarkPost(post.id) : await api.removeBookmark(post.id);
      patchPost(post.id, (item) => ({ bookmarked_by_me: result.bookmarked ?? next, bookmark_count: result.bookmark_count ?? item.bookmark_count }));
    } catch (error) {
      loadProfile();
    }
  };

  const openFollowList = (mode) => {
    const id = profile?.id || targetUserId || user?.id;
    if (!id) return;
    navigation.navigate('FollowList', { userId: id, mode, name: displayName });
  };

  const handleMessage = async () => {
    if (!profile?.id) return;
    try {
      const conversation = await api.createConversation({ userId: profile.id });
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.title || profile.name,
      });
    } catch (error) {
      Alert.alert('Mesaj xətası', error.response?.data?.message || error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AuroraGlow />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          {!isOwnProfile && navigation.canGoBack() ? (
            <HeaderIconButton icon="arrow-back" onPress={() => navigation.goBack()} label="Geri" />
          ) : (
            <TouchableOpacity style={styles.handleButton} onPress={openAccountSwitcher} accessibilityLabel="Hesablar arasında keç">
              <Text style={[styles.topHandle, { color: colors.text }]} numberOfLines={1}>
                @{String(profile?.email || user?.email || displayName).split('@')[0]}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          {isOwnProfile ? (
            <HeaderIconButton icon="settings" onPress={() => navigation.navigate('Settings')} label="Tənzimləmələr" />
          ) : (
            <HeaderIconButton icon="more-horiz" onPress={handleProfileMore} label="Seçimlər" />
          )}
        </View>

        <View style={styles.hero}>
          <TouchableOpacity style={styles.avatarRing} onPress={handlePickAvatar} disabled={uploadingAvatar || !isOwnProfile} accessibilityLabel={isOwnProfile ? 'Profil şəklini dəyiş' : displayName}>
            <View style={[styles.avatarRingInner, { borderColor: colors.background }]}>
              <Avatar name={displayName} uri={profile?.avatar_url} size={76} />
            </View>
            {isOwnProfile && (
              <View style={[styles.cameraBadge, { borderColor: colors.background }]}>
                {uploadingAvatar ? <ActivityIndicator size="small" color="#1A0A02" /> : <MaterialIcons name="photo-camera" size={13} color="#1A0A02" />}
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.statsRow}>
            {[
              [profile?.posts ?? myPosts.length, 'Paylaşım', () => scrollRef.current?.scrollTo({ y: postsY, animated: true })],
              [profile?.followers_count ?? 0, 'İzləyici', () => openFollowList('followers')],
              [profile?.following_count ?? 0, 'İzlənən', () => openFollowList('following')],
            ].map(([value, label, onPress]) => (
              <TouchableOpacity key={label} style={styles.statItem} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${value} ${label}`}>
                <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.roleText, { color: colors.accentText }]}>{profile?.role_sub || profile?.role || 'DevFeed üzvü'}</Text>
        <Text style={[styles.bioText, { color: profile?.bio ? colors.text : colors.muted }]}>
          {profile?.bio || (isOwnProfile ? 'Özün haqqında qısa bio əlavə et.' : 'Hələ bio yazılmayıb.')}
        </Text>
        {stack.length > 0 && (
          <View style={styles.tagRow}>
            {stack.map((item) => (
              <View key={item} style={[styles.tagItem, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionRow}>
          {isOwnProfile ? (
            <TouchableOpacity style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setEditOpen(true)}>
              <MaterialIcons name="edit" size={17} color={colors.text} />
              <Text style={[styles.pillButtonText, { color: colors.text }]}>Profili düzəlt</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.pillButton,
                  profile?.following_by_me
                    ? { borderColor: colors.border, backgroundColor: colors.surface }
                    : { borderColor: colors.primary, backgroundColor: colors.primary },
                ]}
                onPress={handleToggleFollow}
              >
                <Text style={[styles.pillButtonText, { color: profile?.following_by_me ? colors.text : colors.onPrimary }]}>
                  {profile?.following_by_me ? 'İzlənilir' : 'İzlə'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={handleMessage}>
                <Text style={[styles.pillButtonText, { color: colors.text }]}>Mesaj</Text>
              </TouchableOpacity>
            </>
          )}
          {PAYMENTS_ENABLED && (
            <TouchableOpacity style={[styles.pillButton, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => setSupportOpen(true)}>
              <MaterialIcons name="local-cafe" size={17} color={colors.text} />
              <Text style={[styles.pillButtonText, { color: colors.text }]}>Dəstək ol</Text>
            </TouchableOpacity>
          )}
        </View>

        {PAYMENTS_ENABLED && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Buy me a coffee</Text>
            <Text style={styles.bodyText}>Bu profili minimum 1 AZN ilə dəstəklə. Manual ödəniş hesab nömrəsi ilə aparılır.</Text>
          </View>
        )}

        <View onLayout={(event) => setPostsY(event.nativeEvent.layout.y)}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Paylaşımlar</Text>
            <Text style={styles.countText}>{posts.length}</Text>
          </View>
          {activityHidden ? (
            <View style={styles.card}>
              <Text style={styles.bodyText}>Bu istifadəçi fəaliyyətini gizlədib.</Text>
            </View>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={(item) => navigation.navigate('PostDetail', { post: item })}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onApplyJob={(item) => navigation.navigate('PostDetail', { post: item })}
              />
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.bodyText}>Hələ paylaşım yoxdur.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <EditProfileModal
        visible={editOpen}
        profile={profile}
        colors={colors}
        saving={saving || uploadingAvatar}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveProfile}
        onPickAvatar={handlePickAvatar}
      />
      <ManualSupportModal
        visible={supportOpen}
        profile={profile}
        colors={colors}
        config={supportConfig}
        submitting={supportSubmitting}
        onClose={() => setSupportOpen(false)}
        onSubmit={handleSupport}
      />
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    handleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    topHandle: {
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
      marginRight: 12,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      padding: 3,
      backgroundColor: colors.primary,
    },
    avatarRingInner: {
      flex: 1,
      borderRadius: 41,
      borderWidth: 3,
      overflow: 'hidden',
    },
    bioText: {
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
    },
    pillButton: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    pillButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 150,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderColor: colors.border,
      borderWidth: 1,
      marginBottom: 12,
    },
    avatarWrap: {
      marginRight: 14,
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLarge: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 40,
    },
    avatarImageLarge: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: colors.surfaceStrong,
    },
    avatarText: {
      fontSize: 30,
      fontWeight: '800',
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 3,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    settingsButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.3,
      marginTop: 14,
    },
    email: {
      color: colors.muted,
      fontSize: 13,
    },
    roleText: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
    statsRow: {
      flex: 1,
      flexDirection: 'row',
      marginLeft: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      marginBottom: 18,
    },
    actionButton: {
      flexGrow: 1,
      flexBasis: '31%',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginHorizontal: 4,
      marginBottom: 8,
      minHeight: 44,
    },
    hiddenAction: {
      display: 'none',
    },
    messageButton: {
      backgroundColor: colors.success,
    },
    actionButtonText: {
      color: '#ffffff',
      fontWeight: '900',
      marginLeft: 7,
      fontSize: 12,
      flexShrink: 1,
    },
    supportButton: {
      backgroundColor: colors.warning,
    },
    moreAction: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    moreActionText: {
      color: colors.text,
      fontWeight: '900',
      marginLeft: 7,
    },
    supportButtonText: {
      color: '#111827',
      fontWeight: '900',
      marginLeft: 7,
      fontSize: 12,
      flexShrink: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 22,
      padding: 14,
      marginBottom: 12,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 10,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    countText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
    },
    bodyText: {
      color: colors.text,
      lineHeight: 21,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 12,
    },
    tagItem: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderColor: colors.border,
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
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
    },
    avatarPicker: {
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarPickerText: {
      color: colors.primary,
      fontWeight: '800',
      marginTop: 8,
    },
    fieldLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '900',
      marginTop: 5,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.input,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },
    textarea: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    primaryButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    disabledButton: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontWeight: '900',
    },
    supportTitle: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      marginBottom: 8,
    },
    supportText: {
      color: colors.muted,
      lineHeight: 20,
      marginBottom: 12,
    },
    supportStep: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 5,
    },
    accountBox: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: colors.background,
      padding: 12,
      marginBottom: 12,
    },
    accountLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '900',
      marginBottom: 5,
    },
    accountNumber: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
    },
    accountMeta: {
      color: colors.muted,
      marginTop: 4,
      fontSize: 12,
    },
  });
}
