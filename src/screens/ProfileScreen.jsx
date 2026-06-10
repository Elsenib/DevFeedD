import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import * as api from '../api';

export default function ProfileScreen() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.fetchProfile();
        setProfile(data);
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

  const displayName = profile?.name || user?.name || user?.email || 'İstifadəçi';
  const bio = profile?.bio || 'Qısa bio əlavə et.';
  const stack = profile?.stack || ['React Native', 'Node.js', 'PostgreSQL'];

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.email || 'example@domain.com'}</Text>
        </View>
      </View>
      <View style={styles.bioCard}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.bioText}>{bio}</Text>
      </View>
      <View style={styles.bioCard}>
        <Text style={styles.sectionTitle}>Stack</Text>
        <View style={styles.tagRow}>
          {stack.map((item) => (
            <View key={item} style={styles.tagItem}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#111827',
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  email: {
    color: '#94a3b8',
    fontSize: 13,
  },
  bioCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderColor: '#111827',
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '700',
  },
  bioText: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagItem: {
    backgroundColor: '#111827',
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
