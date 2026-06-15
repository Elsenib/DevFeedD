import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { AuthContext } from '../context/AuthContext';
import * as api from '../api';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function RoomModal({ visible, creating, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    await onCreate({ name: cleanName, description: description.trim() });
    setName('');
    setDescription('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.roomSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni public chat</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#8b949e" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>OTAQ ADI</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="React Native"
            placeholderTextColor="#4b5563"
            style={styles.modalInput}
          />
          <Text style={styles.fieldLabel}>QISA IZAH</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mövzu, qayda və ya istiqamət"
            placeholderTextColor="#4b5563"
            style={styles.modalInput}
          />
          <TouchableOpacity
            style={[styles.createButton, !name.trim() && styles.disabledButton]}
            onPress={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.createButtonText}>Otaq yarat</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PublicChatScreen() {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const selectedRoomId = selectedRoom?.id;
  const selectedRoomTitle = useMemo(() => selectedRoom?.name || 'Public chat', [selectedRoom?.name]);

  const loadRooms = useCallback(async () => {
    try {
      const data = await api.fetchChatRooms();
      const nextRooms = Array.isArray(data) ? data : [];
      setRooms(nextRooms);
      setSelectedRoom((current) => current || nextRooms[0] || null);
    } catch (error) {
      Alert.alert('Chat xetasi', error.response?.data?.message || error.message);
    } finally {
      setLoadingRooms(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedRoomId) return;
    setLoadingMessages(true);
    try {
      const data = await api.fetchChatMessages(selectedRoomId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Mesaj xetasi', error.response?.data?.message || error.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    if (!room.joined) {
      try {
        await api.joinChatRoom(room.id);
        setRooms((prev) => prev.map((item) => (item.id === room.id ? { ...item, joined: true } : item)));
      } catch (error) {
        Alert.alert('Otaq xetasi', error.response?.data?.message || error.message);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRooms();
    loadMessages();
  };

  const handleCreateRoom = async (payload) => {
    setCreatingRoom(true);
    try {
      const room = await api.createChatRoom(payload);
      setRooms((prev) => [...prev, room]);
      setSelectedRoom(room);
      setRoomModalOpen(false);
    } catch (error) {
      Alert.alert('Otaq xetasi', error.response?.data?.message || error.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleSend = async () => {
    const value = text.trim();
    if (!selectedRoomId || !value || sending) return;
    setSending(true);
    try {
      const sent = await api.sendChatMessage(selectedRoomId, value);
      setMessages((prev) => [...prev, sent]);
      setRooms((prev) =>
        prev.map((room) =>
          room.id === selectedRoomId
            ? { ...room, joined: true, last_message: value }
            : room
        )
      );
      setText('');
    } catch (error) {
      Alert.alert('Mesaj xetasi', error.response?.data?.message || error.message);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const mine = String(item.user_id || item.userId || '') === String(user?.id || '');
    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        <View style={[styles.messageBubble, mine && styles.messageBubbleMine]}>
          <Text style={[styles.senderName, mine && styles.senderNameMine]}>
            {mine ? 'Sən' : item.name || 'İstifadəçi'}
          </Text>
          <Text style={[styles.messageText, mine && styles.messageTextMine]}>{item.text}</Text>
          <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{formatTime(item.created_at || item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (loadingRooms) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}
      >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Public Chat</Text>
          <Text style={styles.subtitle}>{selectedRoomTitle}</Text>
        </View>
        <TouchableOpacity style={styles.plusButton} onPress={() => setRoomModalOpen(true)}>
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.roomsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {rooms.map((room) => {
            const active = room.id === selectedRoomId;
            return (
              <TouchableOpacity
                key={room.id}
                style={[styles.roomChip, active && styles.roomChipActive]}
                onPress={() => handleSelectRoom(room)}
              >
                <Text style={[styles.roomName, active && styles.roomNameActive]}>{room.name}</Text>
                <Text style={[styles.roomMeta, active && styles.roomMetaActive]}>{room.member_count || 0}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loadingMessages ? (
        <View style={styles.messageLoader}>
          <ActivityIndicator color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
          ListEmptyComponent={<Text style={styles.emptyText}>Bu otaqda hələ mesaj yoxdur.</Text>}
        />
      )}

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Mesaj, kod və ya link yaz..."
          placeholderTextColor="#4b5563"
          style={styles.input}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.disabledButton]}
          onPress={handleSend}
          disabled={sending || !text.trim() || !selectedRoomId}
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <MaterialIcons name="send" size={19} color="#ffffff" />}
        </TouchableOpacity>
      </View>

      <RoomModal
        visible={roomModalOpen}
        creating={creatingRoom}
        onClose={() => setRoomModalOpen(false)}
        onCreate={handleCreateRoom}
      />
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
  roomsBar: {
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roomChip: {
    minWidth: 112,
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
    backgroundColor: '#161b22',
  },
  roomChipActive: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  roomName: {
    color: '#8b949e',
    fontWeight: '800',
    fontSize: 12,
  },
  roomNameActive: {
    color: '#e0e7ff',
  },
  roomMeta: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 3,
  },
  roomMetaActive: {
    color: '#a5b4fc',
  },
  messageLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 18,
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
    maxWidth: '84%',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  roomSheet: {
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
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    color: '#e6edf3',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  createButton: {
    marginTop: 8,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
});
