import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';
import { avatarTone } from '../utils/avatarTone';
import { openModerationMenu } from '../utils/moderation';
import Avatar from '../components/Avatar';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageAvatar({ name, uri }) {
  return <Avatar name={name} uri={uri} size={30} />;
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

  const otherUser = conversation?.participants?.other;

  const handleConversationMore = () => {
    if (!otherUser?.id) return;
    openModerationMenu({
      targetType: 'user',
      targetId: otherUser.id,
      userId: otherUser.id,
      userName: otherUser.name,
      currentUserId: user?.id,
      onBlocked: () => navigation.goBack(),
    });
  };

  const handleMessageLongPress = (item) => {
    openModerationMenu({
      targetType: 'message',
      targetId: item.id,
      userId: item.sender?.id || item.sender_id,
      userName: item.sender?.name || item.sender_name,
      currentUserId: user?.id,
      onBlocked: () => navigation.goBack(),
    });
  };

  const renderMessage = ({ item }) => {
    const mine = String(item.sender?.id || item.sender_id || '') === String(user?.id || '');
    return (
      <Pressable
        style={[styles.messageRow, mine && styles.messageRowMine]}
        onLongPress={mine ? undefined : () => handleMessageLongPress(item)}
        delayLongPress={350}
      >
        {!mine && <MessageAvatar name={item.sender?.name || item.sender_name || screenTitle} uri={item.sender?.avatar_url || item.sender_avatar_url} />}
        <View style={[styles.messageBubble, themed.bubble, mine && styles.messageBubbleMine, mine && themed.mineBubble]}>
          <Text style={[styles.senderName, mine && styles.senderNameMine]}>
            {mine ? 'Sən' : item.sender?.name || item.sender_name || screenTitle}
          </Text>
          <Text style={[styles.messageText, themed.text, mine && styles.messageTextMine]}>{item.text}</Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatTime(item.createdAt || item.created_at)}</Text>
          </View>
        </View>
      </Pressable>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <View style={[styles.header, themed.header]}>
        <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerPerson}>
          <MessageAvatar name={screenTitle} uri={otherUser?.avatar_url} />
          <View style={styles.headerText}>
            <Text style={[styles.title, themed.title]} numberOfLines={1}>{screenTitle}</Text>
            <Text style={[styles.subtitle, themed.subtitle]}>Şəxsi mesaj</Text>
          </View>
        </View>
        {!!otherUser?.id && (
          <TouchableOpacity style={[styles.iconButton, themed.iconButton]} onPress={handleConversationMore} accessibilityLabel="Seçimlər">
            <MaterialIcons name="more-vert" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
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
    backgroundColor: '#06080F',
  },
  keyboard: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06080F',
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomColor: '#1F2433',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#F1F4FA',
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8790A6',
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
    minWidth: 104,
    maxWidth: '88%',
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  messageBubbleMine: {
    backgroundColor: '#312e81',
    borderColor: '#E8590C',
    borderBottomRightRadius: 4,
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1F2433',
    marginRight: 8,
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  senderName: {
    color: '#8790A6',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  senderNameMine: {
    color: 'rgba(26,10,2,0.7)',
  },
  messageText: {
    color: '#F1F4FA',
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#1A0A02',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  messageTime: {
    color: '#6b7280',
    fontSize: 10,
    textAlign: 'right',
  },
  messageTimeMine: {
    color: 'rgba(26,10,2,0.6)',
  },
  emptyText: {
    color: '#8790A6',
    textAlign: 'center',
    marginTop: 24,
  },
  composer: {
    borderTopColor: '#1F2433',
    borderTopWidth: 1,
    padding: 12,
    backgroundColor: '#06080F',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#10131D',
    borderColor: '#2A3040',
    borderWidth: 1,
    borderRadius: 12,
    color: '#F1F4FA',
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#1F2433',
  },
  headerPerson: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 10,
  },
});
