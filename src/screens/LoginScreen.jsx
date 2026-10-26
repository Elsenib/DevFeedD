import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { AuthContext } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthBackdrop, BrandMark, authStyles as styles, PasswordInput } from '../components/AuthChrome';

export default function LoginScreen({ navigation }) {
  const { signIn, socialSignIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Xəta', 'E-poçt və şifrəni daxil edin');
      return;
    }
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('Daxil olmaq alınmadı', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider) => {
    setSocialLoading(provider);
    try {
      await socialSignIn(provider);
    } catch (error) {
      Alert.alert(`${provider} ilə davam et`, error.response?.data?.message || error.message);
    } finally {
      setSocialLoading(null);
    }
  };

  const renderSocialButton = (provider, label, icon) => (
    <TouchableOpacity
      style={styles.socialButton}
      onPress={() => handleSocialSignIn(provider)}
      disabled={!!socialLoading}
    >
      {socialLoading === provider ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <MaterialCommunityIcons name={icon} size={20} color="#F1F4FA" style={styles.socialIcon} />
          <Text style={styles.socialButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AuthBackdrop />
      <BrandMark />
      <Text style={styles.title}>Xoş gəldin</Text>
      <Text style={styles.subtitle}>Developerlər üçün sosial platforma.</Text>
      <View style={styles.formCard}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-poçt"
          placeholderTextColor="#7C859A"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        <PasswordInput
          value={password}
          onChangeText={setPassword}
          placeholder="Şifrə"
          placeholderTextColor="#7C859A"
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#1A0A02" /> : <Text style={styles.buttonText}>Daxil ol</Text>}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>və ya</Text>
          <View style={styles.divider} />
        </View>

        {renderSocialButton('github', 'GitHub ilə davam et', 'github')}
        {renderSocialButton('google', 'Google ilə davam et', 'google')}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.switchText}>Hesabın yoxdur? <Text style={styles.switchAccent}>Qeydiyyatdan keç</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
