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

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function ConversationAvatar({ title, avatarUrl }) {
  const letter = String(title || 'S').slice(0, 1).toUpperCase();
  if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />;
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{letter}</Text>
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
              <MaterialIcons name="close" size={24} color="#8b949e" />
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
      style={[styles.chatCard, themed.card]}
      onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.title })}
    >
      <ConversationAvatar title={item.title} avatarUrl={item.avatar_url || item.otherUser?.avatar_url} />
      <View style={styles.chatBody}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatTitle, themed.text]}>{item.title || 'Söhbət'}</Text>
          <Text style={[styles.chatTime, themed.muted]}>{formatTime(item.updatedAt || item.time)}</Text>
        </View>
        <Text style={[styles.chatLast, themed.muted]} numberOfLines={1}>{item.lastMessage || 'Hələ mesaj yoxdur'}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
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
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <View style={[styles.header, themed.header]}>
        <View>
          <Text style={[styles.title, themed.title]}>{t.messages}</Text>
          <Text style={[styles.subtitle, themed.subtitle]}>{t.messagesSubtitle}</Text>
        </View>
        <TouchableOpacity style={styles.plusButton} onPress={() => setModalOpen(true)}>
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, themed.tabButton, activeTab === 'chats' && styles.tabButtonActive, activeTab === 'chats' && themed.tabButtonActive]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabText, themed.tabText, activeTab === 'chats' && styles.tabTextActive, activeTab === 'chats' && themed.tabTextActive]}>{t.chats}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, themed.tabButton, activeTab === 'applications' && styles.tabButtonActive, activeTab === 'applications' && themed.tabButtonActive]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.tabText, themed.tabText, activeTab === 'applications' && styles.tabTextActive, activeTab === 'applications' && themed.tabTextActive]}>{t.applications}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0d1117',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d1117',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    padding: 10,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#161b22',
  },
  tabButtonActive: {
    backgroundColor: '#312e81',
    borderColor: '#6366f1',
  },
  tabText: {
    color: '#8b949e',
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 14,
    paddingBottom: 90,
  },
  chatCard: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#21262d',
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
    color: '#e6edf3',
    fontWeight: '800',
    fontSize: 14,
  },
  chatLast: {
    color: '#8b949e',
    fontSize: 13,
  },
  chatTime: {
    color: '#6b7280',
    fontSize: 11,
    marginLeft: 8,
  },
  applicationCard: {
    backgroundColor: '#161b22',
    borderColor: '#21262d',
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
    color: '#c9d1d9',
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
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  resumeButtonText: {
    color: '#e6edf3',
    fontWeight: '800',
    marginLeft: 6,
  },
  replyButton: {
    backgroundColor: '#6366f1',
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
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  newChatSheet: {
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
  },
  emailInput: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    color: '#e6edf3',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#21262d',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
