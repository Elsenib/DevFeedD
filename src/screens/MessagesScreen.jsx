import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import * as api from '../api';

export default function MessagesScreen() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.fetchConversations();
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.chatCard}>
            <Text style={styles.chatTitle}>{item.title || item.user?.name || 'Söhbət'}</Text>
            <Text style={styles.chatLast}>{item.lastMessage || item.lastMsg || 'Son mesaj burada göstəriləcək'}</Text>
            <Text style={styles.chatTime}>{item.updatedAt || item.time || ''}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Heç bir söhbət yoxdur.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  chatCard: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderColor: '#111827',
    borderWidth: 1,
  },
  chatTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 6,
  },
  chatLast: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  chatTime: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 10,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
});
