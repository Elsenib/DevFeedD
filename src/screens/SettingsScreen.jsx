import { useContext } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function SettingsScreen() {
  const { signOut } = useContext(AuthContext);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Hesab</Text>
      <Pressable style={styles.card} onPress={() => Alert.alert('Çıxış', 'Hesabdan çıxmaq istəyirsinizmi?', [{ text: 'Xeyr' }, { text: 'Bəli', onPress: signOut }])}>
        <Text style={styles.cardTitle}>Çıxış</Text>
        <Text style={styles.cardSubtitle}>Hesabınızı bağlayın</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Ümumi</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tema</Text>
        <Text style={styles.cardSubtitle}>Tünd mövzu hazırdır</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Məlumat</Text>
        <Text style={styles.cardSubtitle}>Tətbiq və backend konfiqurasiyası</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 10,
    marginTop: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderColor: '#111827',
    borderWidth: 1,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontWeight: '700',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#94a3b8',
    lineHeight: 20,
  },
});
