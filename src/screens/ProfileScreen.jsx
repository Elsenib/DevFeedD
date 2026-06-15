import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';

function splitList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function postTypeLabel(type) {
  const value = String(type || 'TEXT').toUpperCase();
  if (value === 'GIT') return 'Git';
  if (value === 'DEPLOY') return 'Deploy';
  if (value === 'MEDIA') return 'Media';
  if (value === 'JOB') return 'İş elanı';
  return 'Post';
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
      <View style={styles.modalOverlay}>
        <View style={styles.sheet}>
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
        </View>
      </View>
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
  const { user, updateCurrentUser } = useContext(AuthContext);
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

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, postsData, configData] = await Promise.all([
        isOwnProfile ? api.fetchProfile() : api.fetchUserProfile(targetUserId),
        isOwnProfile ? api.fetchMyPosts().catch(() => []) : api.fetchUserPosts(targetUserId).catch(() => ({ posts: [] })),
        api.fetchSupportConfig().catch(() => null),
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

  const displayName = profile?.name || user?.name || user?.email || 'İstifadəçi';
  const stack = profile?.stack || profile?.skills || ['React Native', 'Node.js', 'PostgreSQL'];

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar || !isOwnProfile}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            {isOwnProfile && (
              <View style={styles.cameraBadge}>
                {uploadingAvatar ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="photo-camera" size={14} color="#ffffff" />}
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{profile?.email || user?.email}</Text>
            <Text style={styles.roleText}>{profile?.role_sub || profile?.role || 'DevFeed member'}</Text>
          </View>
          {isOwnProfile && (
            <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
              <MaterialIcons name="settings" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.posts ?? myPosts.length}</Text>
            <Text style={styles.statLabel}>Paylaşım</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.followers_count ?? 0}</Text>
            <Text style={styles.statLabel}>İzləyici</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.following_count ?? 0}</Text>
            <Text style={styles.statLabel}>İzlənən</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, !isOwnProfile && styles.hiddenAction]} onPress={() => setEditOpen(true)} disabled={!isOwnProfile}>
            <MaterialIcons name="edit" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Profili düzəlt</Text>
          </TouchableOpacity>
          {!isOwnProfile && (
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleFollow}>
              <MaterialIcons name={profile?.following_by_me ? 'person-remove' : 'person-add'} size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>{profile?.following_by_me ? 'İzləmədən çıx' : 'İzlə'}</Text>
            </TouchableOpacity>
          )}
          {!isOwnProfile && (
            <TouchableOpacity style={[styles.actionButton, styles.messageButton]} onPress={handleMessage}>
              <MaterialIcons name="send" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Mesaj</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionButton, styles.supportButton]} onPress={() => setSupportOpen(true)}>
            <MaterialIcons name="local-cafe" size={18} color="#111827" />
            <Text style={styles.supportButtonText}>Dəstək ol</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bodyText}>{profile?.bio || 'Qısa bio əlavə et.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stack</Text>
          <View style={styles.tagRow}>
            {stack.map((item) => (
              <View key={item} style={styles.tagItem}>
                <Text style={styles.tagText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buy me a coffee</Text>
          <Text style={styles.bodyText}>Bu profili minimum 1 AZN ilə dəstəklə. Manual ödəniş hesab nömrəsi ilə aparılır.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Paylaşımlar</Text>
            <Text style={styles.countText}>{myPosts.length}</Text>
          </View>
          {activityHidden ? (
            <Text style={styles.bodyText}>Bu istifadəçi fəaliyyətini gizlədib.</Text>
          ) : myPosts.length > 0 ? (
            myPosts.map((post) => (
              <TouchableOpacity key={post.id} style={styles.postCard} onPress={() => navigation.navigate('PostDetail', { post })}>
                <View style={styles.postTopRow}>
                  <Text style={styles.postType}>{postTypeLabel(post.post_type)}</Text>
                  <Text style={styles.postMeta}>{Number(post.like_count || 0)} bəyənmə</Text>
                </View>
                <Text style={styles.postTitle} numberOfLines={2}>{post.caption || post.title || post.body}</Text>
                {!!post.body && <Text style={styles.postBody} numberOfLines={2}>{post.body}</Text>}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.bodyText}>Hələ paylaşım yoxdur.</Text>
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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 100,
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
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.primary,
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
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: colors.surfaceStrong,
    },
    avatarImageLarge: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: colors.surfaceStrong,
    },
    avatarText: {
      color: '#ffffff',
      fontSize: 26,
      fontWeight: '900',
    },
    cameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      borderColor: colors.surface,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
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
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
      marginBottom: 4,
    },
    email: {
      color: colors.muted,
      fontSize: 13,
    },
    roleText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 6,
    },
    statsRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderColor: colors.border,
      borderWidth: 1,
      marginBottom: 12,
      overflow: 'hidden',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRightColor: colors.border,
      borderRightWidth: 1,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      marginTop: 3,
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginRight: 8,
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
    },
    supportButton: {
      backgroundColor: colors.warning,
      marginRight: 0,
      marginLeft: 8,
    },
    supportButtonText: {
      color: '#111827',
      fontWeight: '900',
      marginLeft: 7,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderColor: colors.border,
      borderWidth: 1,
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
    },
    tagItem: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.border,
      borderWidth: 1,
      marginRight: 8,
      marginBottom: 8,
      borderRadius: 7,
      paddingVertical: 7,
      paddingHorizontal: 10,
    },
    tagText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    postCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    postTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
    },
    postType: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    postMeta: {
      color: colors.muted,
      fontSize: 11,
    },
    postTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 5,
    },
    postBody: {
      color: colors.muted,
      lineHeight: 18,
      fontSize: 12,
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
