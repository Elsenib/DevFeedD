import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { signUp, socialSignIn } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Xeta', 'Butun saheleri doldurun');
      return;
    }
    setLoading(true);
    try {
      await signUp({ name, email, password });
    } catch (error) {
      Alert.alert('Qeydiyyat xetasi', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = async (provider) => {
    setSocialLoading(provider);
    try {
      await socialSignIn(provider);
    } catch (error) {
      Alert.alert(`${provider} ile davam et`, error.message);
    } finally {
      setSocialLoading(null);
    }
  };

  const renderSocialButton = (provider, label, icon) => (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={() => handleSocialRegister(provider)}
      disabled={!!socialLoading}
    >
      {socialLoading === provider ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text style={styles.socialIcon}>{icon}</Text>
          <Text style={styles.socialButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yeni hesab ac</Text>
      <Text style={styles.subtitle}>Bir nece saniyede qeydiyyatdan kec ve feed-e basla.</Text>
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
          placeholder="Sifre"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Qeydiyyat</Text>}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>ve ya</Text>
          <View style={styles.divider} />
        </View>

        {renderSocialButton('github', 'GitHub ile davam et', 'GH')}
        {renderSocialButton('google', 'Google ile davam et', 'G')}

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.switchText}>Artiq hesabin varsa, daxil ol</Text>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#64748b',
    fontSize: 13,
  },
  socialButton: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  socialIcon: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    marginRight: 8,
  },
  socialButtonText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  switchText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
});
