import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthBackdrop, BrandMark, authStyles as styles } from '../components/AuthChrome';

export default function RegisterScreen({ navigation }) {
  const { signUp, verifyEmailRegistration, socialSignIn } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Xəta', 'Bütün sahələri doldurun');
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({ name, email, password });
      if (result?.verificationRequired) {
        setPendingEmail(result.email || email.trim().toLowerCase());
        Alert.alert(
          'Email təsdiqi',
          result.devCode
            ? `Test kodu: ${result.devCode}`
            : 'Email ünvanına 6 rəqəmli təsdiq kodu göndərildi.'
        );
      }
    } catch (error) {
      Alert.alert('Qeydiyyat xətası', error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!pendingEmail || !code.trim()) {
      Alert.alert('Kod lazımdır', 'Emailə gələn 6 rəqəmli kodu daxil et.');
      return;
    }
    setVerifying(true);
    try {
      await verifyEmailRegistration({ email: pendingEmail, code: code.trim() });
    } catch (error) {
      Alert.alert('Email təsdiqi alınmadı', error.response?.data?.message || error.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSocialRegister = async (provider) => {
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
      onPress={() => handleSocialRegister(provider)}
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
      <Text style={styles.title}>Yeni hesab aç</Text>
      <Text style={styles.subtitle}>Bir neçə saniyədə qeydiyyatdan keç və feed-ə başla.</Text>
      <View style={styles.formCard}>
        {pendingEmail ? (
          <>
            <Text style={styles.pendingText}>{pendingEmail} ünvanına gələn təsdiq kodunu daxil et.</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="6 rəqəmli kod"
              placeholderTextColor="#7C859A"
              keyboardType="number-pad"
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={verifying}>
              {verifying ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Emaili təsdiqlə</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPendingEmail('')}>
              <Text style={styles.switchText}>Məlumatları dəyiş</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ad Soyad"
              placeholderTextColor="#7C859A"
              style={styles.input}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-poçt"
              placeholderTextColor="#7C859A"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Şifrə"
              placeholderTextColor="#7C859A"
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#1A0A02" /> : <Text style={styles.buttonText}>Qeydiyyat</Text>}
            </TouchableOpacity>
          </>
        )}

        {!pendingEmail && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>və ya</Text>
              <View style={styles.divider} />
            </View>

            {renderSocialButton('github', 'GitHub ilə davam et', 'github')}
            {renderSocialButton('google', 'Google ilə davam et', 'google')}

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.switchText}>Artıq hesabın var? <Text style={styles.switchAccent}>Daxil ol</Text></Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
