import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
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
import { AuroraGlow, HeaderIconButton, ScreenHeader } from '../components/ScreenChrome';
import { avatarTone } from '../utils/avatarTone';
import { timeAgo } from '../utils/time';


function ConversationAvatar({ title, avatarUrl }) {
  const letter = String(title || 'S').slice(0, 1).toUpperCase();
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  const tone = avatarTone(title);
  return (
    <View style={[styles.avatar, { backgroundColor: tone.bg }]}>
      <Text style={[styles.avatarText, { color: tone.fg }]}>{letter}</Text>
    </View>
  );
}

function NewConversationModal({ visible, creating, onClose, onCreate }) {
  const [email, setEmail] = useState('');

  const handleSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!value) return;
    await onCreate(value);
    setEmail('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.newChatSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni söhbət</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#8790A6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>İSTİFADƏÇİ EMAILİ</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            placeholderTextColor="#4b5563"
            style={styles.emailInput}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={[styles.createButton, !email.trim() && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={creating || !email.trim()}
          >
            {creating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.createButtonText}>Söhbət aç</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MessagesScreen({ navigation }) {
  const { theme, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    tabButton: { backgroundColor: colors.surface, borderColor: colors.border },
    tabButtonActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    tabText: { color: colors.muted },
    tabTextActive: { color: colors.text },
    card: { backgroundColor: colors.surface, borderColor: colors.border },
    text: { color: colors.text },
    muted: { color: colors.muted },
    emptyText: { color: colors.muted },
  }), [colors]);
  const [conversations, setConversations] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const [conversationData, applicationData] = await Promise.all([
        api.fetchConversations(),
        api.fetchJobApplicationInbox().catch(() => []),
      ]);
      setConversations(Array.isArray(conversationData) ? conversationData : []);
      setApplications(Array.isArray(applicationData) ? applicationData : []);
    } catch (error) {
      Alert.alert('Mesaj xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleCreate = async (email) => {
    setCreating(true);
    try {
      const conversation = await api.createConversation({ email });
      setModalOpen(false);
      await loadConversations();
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.title,
      });
    } catch (error) {
      Alert.alert('Söhbət xətası', error.response?.data?.message || error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleReplyApplication = async (application) => {
    try {
      const conversation = await api.createConversation({ userId: application.user_id });
      navigation.navigate('Chat', {
        conversationId: conversation.id,
        title: conversation.title || application.applicant_name || application.name,
      });
    } catch (error) {
      Alert.alert('Geri dönüş xətası', error.response?.data?.message || error.message);
    }
  };

  const handleOpenResume = async (resumeUrl) => {
    if (!resumeUrl) return;
    try {
      await Linking.openURL(resumeUrl);
    } catch (error) {
      Alert.alert('CV açılmadı', error.message);
    }
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatRow, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.title })}
    >
      <ConversationAvatar title={item.title} avatarUrl={item.avatar_url || item.otherUser?.avatar_url} />
      <View style={styles.chatBody}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatTitle, themed.text]}>{item.title || 'Söhbət'}</Text>
          <Text style={[styles.chatTime, themed.muted]}>{timeAgo(item.updatedAt || item.time)}</Text>
        </View>
        <Text style={[styles.chatLast, themed.muted]} numberOfLines={1}>{item.lastMessage || 'Hələ mesaj yoxdur'}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderApplication = ({ item }) => (
    <View style={[styles.applicationCard, themed.card]}>
      <View style={styles.applicationTop}>
        <ConversationAvatar title={item.applicant_name || item.name} avatarUrl={item.applicant_avatar_url || item.avatar_url} />
        <View style={styles.chatBody}>
          <Text style={[styles.chatTitle, themed.text]}>{item.applicant_name || item.name || 'Namizəd'}</Text>
          <Text style={[styles.chatLast, themed.muted]}>{item.post_caption || item.post_title || 'İş elanı'}</Text>
          <Text style={styles.applicationPhone}>{item.applicant_phone || 'Telefon qeyd edilməyib'}</Text>
        </View>
      </View>
      {!!item.cover_letter && <Text style={[styles.applicationLetter, themed.text]} numberOfLines={3}>{item.cover_letter}</Text>}
      <View style={styles.applicationActions}>
        <TouchableOpacity style={styles.resumeButton} onPress={() => handleOpenResume(item.resume_url)} disabled={!item.resume_url}>
          <MaterialIcons name="picture-as-pdf" size={16} color="#f87171" />
          <Text style={styles.resumeButtonText}>{item.resume_file_name || 'CV PDF'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.replyButton} onPress={() => handleReplyApplication(item)}>
          <MaterialIcons name="send" size={16} color="#ffffff" />
          <Text style={styles.replyButtonText}>Geri dönüş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF7A2F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <AuroraGlow />
      <ScreenHeader title={t.messages} subtitle={t.messagesSubtitle} onBack={() => navigation.goBack()}>
        <HeaderIconButton icon="forum" onPress={() => navigation.navigate('PublicChat')} label="Ümumi chat otaqları" />
        <HeaderIconButton icon="edit" onPress={() => setModalOpen(true)} label="Yeni söhbət" />
      </ScreenHeader>

      <View style={styles.tabs} accessibilityRole="tablist">
        {[['chats', t.chats], ['applications', t.applications]].map(([id, label]) => {
          const selected = activeTab === id;
          return (
            <TouchableOpacity key={id} style={styles.tabButton} onPress={() => setActiveTab(id)} accessibilityRole="tab" accessibilityState={{ selected }}>
              <Text style={[styles.tabText, { color: selected ? colors.text : colors.muted, fontWeight: selected ? '800' : '600' }]}>{label}</Text>
              <View style={[styles.tabBar, { backgroundColor: selected ? colors.primary : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={activeTab === 'chats' ? conversations : applications}
        keyExtractor={(item) => item.id?.toString() ?? `${activeTab}-${Math.random()}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={activeTab === 'chats' ? renderConversation : renderApplication}
        ListEmptyComponent={
          <Text style={[styles.emptyText, themed.emptyText]}>
            {activeTab === 'chats' ? 'Hələ söhbət yoxdur. Email ilə ilk söhbəti aç.' : 'Hələ iş müraciəti yoxdur.'}
          </Text>
        }
      />

      <NewConversationModal
        visible={modalOpen}
        creating={creating}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06080F',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#06080F',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomColor: '#1F2433',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  tabButton: {
    marginRight: 22,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#312e81',
    borderColor: '#FF7A2F',
  },
  tabText: {
    fontSize: 15,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  chatCard: {
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 16,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F2433',
  },
  chatBody: {
    flex: 1,
    marginLeft: 12,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    flex: 1,
    color: '#F1F4FA',
    fontWeight: '800',
    fontSize: 14,
  },
  chatLast: {
    color: '#8790A6',
    fontSize: 13,
  },
  chatTime: {
    color: '#6b7280',
    fontSize: 11,
    marginLeft: 8,
  },
  applicationCard: {
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  applicationTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicationPhone: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  applicationLetter: {
    color: '#DCE2EE',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  applicationActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  resumeButton: {
    flex: 1,
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  resumeButtonText: {
    color: '#F1F4FA',
    fontWeight: '800',
    marginLeft: 6,
  },
  replyButton: {
    backgroundColor: '#FF7A2F',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    marginLeft: 6,
  },
  emptyText: {
    color: '#8790A6',
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  newChatSheet: {
    backgroundColor: '#10131D',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderColor: '#1F2433',
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
    color: '#F1F4FA',
    fontSize: 17,
    fontWeight: '900',
  },
  fieldLabel: {
    color: '#8790A6',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  emailInput: {
    backgroundColor: '#06080F',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 10,
    color: '#F1F4FA',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#FF7A2F',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#1F2433',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    alignSelf: 'center',
    width: 22,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
});
