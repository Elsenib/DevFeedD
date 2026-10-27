import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';
import usePolling from '../hooks/usePolling';
import { AuroraGlow, HeaderIconButton, ScreenHeader } from '../components/ScreenChrome';
import { avatarTone } from '../utils/avatarTone';
import { timeAgo } from '../utils/time';
import Avatar from '../components/Avatar';


function ConversationAvatar({ title, avatarUrl }) {
  return <Avatar name={title} uri={avatarUrl} size={44} />;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pick someone by name (live search) or, as a fallback, by exact e-mail.
function NewConversationModal({ visible, creating, onClose, onCreate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const value = query.trim();

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      return undefined;
    }
    if (value.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchUsers(value)
        .then((data) => {
          if (!cancelled) setResults(Array.isArray(data) ? data.slice(0, 8) : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, visible]);

  const isEmail = EMAIL_PATTERN.test(value);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior="padding">
        <View style={styles.newChatSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni söhbət</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose} accessibilityLabel="Bağla">
              <MaterialIcons name="close" size={22} color="#8790A6" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchField}>
            <MaterialIcons name="search" size={20} color="#8790A6" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Ad və ya e-poçt yaz..."
              placeholderTextColor="#7C859A"
              style={styles.emailInput}
              autoCapitalize="none"
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color="#FF7A2F" />}
          </View>

          {results.map((person) => (
            <TouchableOpacity
              key={person.id}
              style={styles.personRow}
              onPress={() => onCreate({ userId: person.id })}
              disabled={creating}
            >
              <Avatar name={person.name} uri={person.avatar_url} size={40} />
              <View style={styles.personText}>
                <Text style={styles.personName} numberOfLines={1}>{person.name}</Text>
                <Text style={styles.personRole} numberOfLines={1}>{person.role_sub || person.role || 'DevFeed üzvü'}</Text>
              </View>
              <MaterialIcons name="chat-bubble-outline" size={19} color="#8790A6" />
            </TouchableOpacity>
          ))}

          {value.length >= 2 && !searching && results.length === 0 && (
            <Text style={styles.searchEmpty}>{isEmail ? 'Bu e-poçtla söhbət aça bilərsən.' : 'Heç kim tapılmadı.'}</Text>
          )}

          {isEmail && (
            <TouchableOpacity
              style={[styles.createButton, creating && styles.disabledButton]}
              onPress={() => onCreate({ email: value.toLowerCase() })}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#1A0A02" /> : <Text style={styles.createButtonText}>E-poçtla söhbət aç</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
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
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('chats');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    try {
      const [conversationData, applicationData, roomData] = await Promise.all([
        api.fetchConversations(),
        api.fetchJobApplicationInbox().catch(() => []),
        api.fetchChatRooms().catch(() => []),
      ]);
      setConversations(Array.isArray(conversationData) ? conversationData : []);
      setApplications(Array.isArray(applicationData) ? applicationData : []);
      setRooms(Array.isArray(roomData) ? roomData : []);
    } catch (error) {
      if (!silent) Alert.alert('Mesaj xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  usePolling(() => loadConversations({ silent: true }), 8000);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleCreate = async (target) => {
    setCreating(true);
    try {
      const conversation = await api.createConversation(target);
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

  const renderRoom = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatRow, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('PublicChat', { roomId: item.id })}
    >
      <View style={[styles.roomIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialIcons name="tag" size={22} color={colors.primary} />
      </View>
      <View style={styles.chatBody}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatTitle, themed.text]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.chatTime, themed.muted]}>{item.member_count || 0} üzv</Text>
        </View>
        <Text style={[styles.chatLast, themed.muted]} numberOfLines={1}>{item.last_message || item.description || 'Hələ mesaj yoxdur'}</Text>
      </View>
    </TouchableOpacity>
  );

  const assistantRow = (
    <TouchableOpacity style={[styles.chatRow, { borderBottomColor: colors.border }]} onPress={() => navigation.navigate('Assistant')}>
      <Image source={AI_ICON} style={styles.aiIcon} />
      <View style={styles.chatBody}>
        <View style={styles.chatTopRow}>
          <Text style={[styles.chatTitle, themed.text]}>DevFeed AI</Text>
          <Text style={[styles.aiBadge, { color: colors.primary }]}>AI</Text>
        </View>
        <Text style={[styles.chatLast, themed.muted]} numberOfLines={1}>Kod, CV və paylaşım mətnində kömək edir</Text>
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

  const LISTS = {
    chats: { data: conversations, render: renderConversation, empty: 'Hələ söhbət yoxdur. Yuxarıdakı ✎ düyməsi ilə yeni söhbət başlat.' },
    rooms: { data: rooms, render: renderRoom, empty: 'Hələ otaq yoxdur.' },
    applications: { data: applications, render: renderApplication, empty: 'Hələ iş müraciəti yoxdur.' },
  };
  const list = LISTS[activeTab];

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
        <HeaderIconButton icon="edit" onPress={() => setModalOpen(true)} label="Yeni söhbət" />
      </ScreenHeader>

      <View style={styles.tabs} accessibilityRole="tablist">
        {[['chats', t.chats], ['rooms', 'Otaqlar'], ['applications', t.applications]].map(([id, label]) => {
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
        data={list.data}
        keyExtractor={(item) => item.id?.toString() ?? `${activeTab}-${Math.random()}`}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderItem={list.render}
        ListHeaderComponent={activeTab === 'chats' ? assistantRow : null}
        ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>{list.empty}</Text>}
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

const AI_ICON = require('../../assets/ai-assistant.png');

const styles = StyleSheet.create({
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    width: 48,
    height: 48,
  },
  aiBadge: {
    fontSize: 11,
    fontWeight: '900',
  },
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderColor: '#1F2433',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    minHeight: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#F1F4FA',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  fieldLabel: {
    color: '#8790A6',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  emailInput: {
    flex: 1,
    outlineStyle: 'none',
    color: '#F1F4FA',
    fontSize: 15,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  createButton: {
    backgroundColor: '#FF7A2F',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  disabledButton: {
    backgroundColor: '#1F2433',
  },
  createButtonText: {
    color: '#1A0A02',
    fontWeight: '800',
    fontSize: 15,
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
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3040',
    marginBottom: 10,
  },
  sheetClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0E17',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  personText: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    color: '#F1F4FA',
    fontWeight: '700',
    fontSize: 15,
  },
  personRole: {
    color: '#8790A6',
    fontSize: 12,
    marginTop: 2,
  },
  searchEmpty: {
    color: '#8790A6',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
