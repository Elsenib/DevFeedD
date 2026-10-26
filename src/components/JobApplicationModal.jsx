import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

export default function JobApplicationModal({ visible, post, submitting, onClose, onSubmit }) {
  const [coverLetter, setCoverLetter] = useState('');
  const [phone, setPhone] = useState('');
  const [resume, setResume] = useState(null);

  const title = useMemo(() => post?.caption || post?.title || 'İş elanı', [post]);

  useEffect(() => {
    if (visible) {
      setCoverLetter('');
      setPhone('');
      setResume(null);
    }
  }, [visible]);

  const handlePickResume = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    const name = asset.name || 'cv.pdf';
    if (!name.toLowerCase().endsWith('.pdf')) {
      Alert.alert('CV formatı', 'Zəhmət olmasa PDF faylı seç.');
      return;
    }
    setResume(asset);
  };

  const handleSubmit = () => {
    if (!phone.trim()) {
      Alert.alert('Telefon lazımdır', 'Elan sahibi səninlə əlaqə saxlaya bilsin deyə nömrəni yaz.');
      return;
    }
    if (!resume) {
      Alert.alert('CV lazımdır', 'Müraciət üçün PDF CV faylını seç.');
      return;
    }
    onSubmit({
      coverLetter: coverLetter.trim(),
      phone: phone.trim(),
      resume,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title}>Müraciət et</Text>
                <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityLabel="Bağla">
                <MaterialIcons name="close" size={22} color="#8790A6" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>QISA MƏKTUB</Text>
            <TextInput
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="Özünü qısa təqdim et, uyğun təcrübəni yaz..."
              placeholderTextColor="#7C859A"
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>ƏLAQƏ NÖMRƏSİ *</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+994..."
              placeholderTextColor="#7C859A"
              style={styles.input}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>CV PDF *</Text>
            <TouchableOpacity style={styles.resumeButton} onPress={handlePickResume}>
              <MaterialIcons name={resume ? 'picture-as-pdf' : 'upload-file'} size={20} color={resume ? '#f87171' : '#FF9A5C'} />
              <View style={styles.resumeTextBlock}>
                <Text style={styles.resumeTitle}>{resume?.name || 'PDF CV seç'}</Text>
                <Text style={styles.resumeMeta}>Maksimum 8 MB, yalnız PDF</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#1A0A02" /> : <Text style={styles.submitText}>Müraciəti göndər</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#10131D',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderColor: '#1F2433',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3040',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#F1F4FA',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#8790A6',
    fontSize: 13,
    marginTop: 3,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  label: {
    color: '#8790A6',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0B0E17',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 14,
    color: '#F1F4FA',
    paddingHorizontal: 14,
    minHeight: 48,
    marginBottom: 14,
    fontSize: 14,
  },
  textarea: {
    minHeight: 104,
    paddingTop: 12,
  },
  resumeButton: {
    backgroundColor: '#0B0E17',
    borderColor: '#2A3040',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  resumeTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  resumeTitle: {
    color: '#F1F4FA',
    fontWeight: '700',
  },
  resumeMeta: {
    color: '#8790A6',
    fontSize: 12,
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: '#FF7A2F',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitText: {
    color: '#1A0A02',
    fontWeight: '800',
    fontSize: 15,
  },
});
