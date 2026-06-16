import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageAvatar({ name, uri }) {
  const letter = String(name || 'U').slice(0, 1).toUpperCase();
  if (uri) return <Image source={{ uri }} style={styles.messageAvatarImage} />;
  return (
    <View style={styles.messageAvatar}>
      <Text style={styles.messageAvatarText}>{letter}</Text>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.background },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    iconButton: { backgroundColor: colors.surface, borderColor: colors.border },
    title: { color: colors.text },
    subtitle: { color: colors.muted },
    bubble: { backgroundColor: colors.surface, borderColor: colors.border },
    mineBubble: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { color: colors.text },
    composer: { backgroundColor: colors.background, borderTopColor: colors.border },
    input: { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
    emptyText: { color: colors.muted },
  }), [colors]);
  const { conversationId, title } = route.params || {};
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const screenTitle = useMemo(() => conversation?.title || title || 'Söhbət', [conversation?.title, title]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await api.fetchConversation(conversationId);
      setConversation(data);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      Alert.alert('Söhbət xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversation();
  };

  const handleSend = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const sent = await api.sendMessage(conversationId, value);
      setMessages((prev) => [...prev, sent]);
      setText('');
    } catch (error) {
      Alert.alert('Mesaj xətası', error.response?.data?.message || error.message);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const mine = String(item.sender?.id || item.sender_id || '') === String(user?.id || '');
    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        {!mine && <MessageAvatar name={item.sender?.name || item.sender_name || screenTitle} uri={item.sender?.avatar_url || item.sender_avatar_url} />}
        <View style={[styles.messageBubble, themed.bubble, mine && styles.messageBubbleMine, mine && themed.mineBubble]}>
          <Text style={[styles.senderName, mine && styles.senderNameMine]}>
            {mine ? 'Sən' : item.sender?.name || item.sender_name || screenTitle}
          </Text>
          <Text style={[styles.messageText, themed.text, mine && styles.messageTextMine]}>{item.text}</Text>
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatTime(item.createdAt || item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, themed.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themed.container]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <View style={[styles.header, themed.header]}>
        <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, themed.title]}>{screenTitle}</Text>
          <Text style={[styles.subtitle, themed.subtitle]}>Direct message</Text>
        </View>
        <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={loadConversation}>
          <MaterialIcons name="refresh" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={<Text style={[styles.emptyText, themed.emptyText]}>Hələ mesaj yoxdur. İlk mesajı yaz.</Text>}
      />

      <View style={[styles.composer, themed.composer]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.muted}
          style={[styles.input, themed.input]}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.disabledButton]}
          onPress={handleSend}
          disabled={sending || !text.trim()}
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <MaterialIcons name="send" size={19} color="#ffffff" />}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  keyboard: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1117',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  headerText: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    color: '#e6edf3',
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 2,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    backgroundColor: '#161b22',
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  messageBubbleMine: {
    backgroundColor: '#312e81',
    borderColor: '#4f46e5',
    borderBottomRightRadius: 4,
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#21262d',
    marginRight: 8,
  },
  messageAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  senderName: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  senderNameMine: {
    color: '#c7d2fe',
  },
  messageText: {
    color: '#e6edf3',
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#ffffff',
  },
  messageTime: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  messageTimeMine: {
    color: '#c7d2fe',
  },
  emptyText: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 24,
  },
  composer: {
    borderTopColor: '#21262d',
    borderTopWidth: 1,
    padding: 12,
    backgroundColor: '#0d1117',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#161b22',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 12,
    color: '#e6edf3',
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#21262d',
  },
});
