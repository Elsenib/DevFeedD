import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as api from '../api';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function ConversationAvatar({ title }) {
  const letter = String(title || 'S').slice(0, 1).toUpperCase();
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
            <Text style={styles.modalTitle}>Yeni sohbet</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#8b949e" />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>ISTIFADECI EMAILI</Text>
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
            {creating ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.createButtonText}>Sohbet ac</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MessagesScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.fetchConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Mesaj xetasi', error.response?.data?.message || error.message);
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
      Alert.alert('Sohbet xetasi', error.response?.data?.message || error.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mesajlar</Text>
          <Text style={styles.subtitle}>DM sohbetleri ve is muracietleri</Text>
        </View>
        <TouchableOpacity style={styles.plusButton} onPress={() => setModalOpen(true)}>
          <MaterialIcons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.title })}
          >
            <ConversationAvatar title={item.title} />
            <View style={styles.chatBody}>
              <View style={styles.chatTopRow}>
                <Text style={styles.chatTitle}>{item.title || 'Sohbet'}</Text>
                <Text style={styles.chatTime}>{formatTime(item.updatedAt || item.time)}</Text>
              </View>
              <Text style={styles.chatLast} numberOfLines={1}>
                {item.lastMessage || 'Hec mesaj yoxdur'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#8b949e" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Hele sohbet yoxdur. Email ile ilk sohbeti ac.</Text>}
      />

      <NewConversationModal
        visible={modalOpen}
        creating={creating}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </View>
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
