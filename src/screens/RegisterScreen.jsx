import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Xəta', 'Bütün sahələri doldurun');
      return;
    }
    setLoading(true);
    try {
      await signUp({ name, email, password });
    } catch (error) {
      Alert.alert('Qeydiyyat xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni hesab aç</Text>
      <Text style={styles.subtitle}>Bir neçə saniyədə qeydiyyatdan keç və feed-ə başla.</Text>
      <View style={styles.formCard}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ad Soyad"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Şifrə"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Qeydiyyat</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.switchText}>Artıq hesabın varsa, daxil ol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: '#0b1120',
    borderRadius: 20,
    padding: 22,
    borderColor: '#111827',
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#121827',
    color: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderColor: '#1e293b',
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  switchText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
});
