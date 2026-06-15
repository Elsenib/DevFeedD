import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as api from '../api';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route, navigation }) {
  const { user } = useContext(AuthContext);
  const { conversationId, title } = route.params || {};
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const screenTitle = useMemo(() => conversation?.title || title || 'Sohbet', [conversation?.title, title]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await api.fetchConversation(conversationId);
      setConversation(data);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      Alert.alert('Sohbet xetasi', error.response?.data?.message || error.message);
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
      Alert.alert('Mesaj xetasi', error.response?.data?.message || error.message);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const mine = String(item.sender?.id || item.sender_id || '') === String(user?.id || '');
    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
          <Text style={[styles.senderName, mine && styles.senderNameMine]}>
            {mine ? 'Sen' : item.sender?.name || item.sender_name || screenTitle}
          </Text>
          <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text>
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatTime(item.createdAt || item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color="#e6edf3" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{screenTitle}</Text>
          <Text style={styles.subtitle}>Direct message</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={loadConversation}>
          <MaterialIcons name="refresh" size={20} color="#8b949e" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={<Text style={styles.emptyText}>Hele mesaj yoxdur. Ilk mesaji yaz.</Text>}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj yaz..."
          placeholderTextColor="#4b5563"
          style={styles.input}
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
