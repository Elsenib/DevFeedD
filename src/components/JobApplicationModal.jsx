import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Müraciət et</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{title}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#8b949e" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>QISA MƏKTUB</Text>
          <TextInput
            value={coverLetter}
            onChangeText={setCoverLetter}
            placeholder="Özünü qısa təqdim et, uyğun təcrübəni yaz..."
            placeholderTextColor="#6b7280"
            style={[styles.input, styles.textarea]}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>ƏLAQƏ NÖMRƏSİ *</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+994..."
            placeholderTextColor="#6b7280"
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>CV PDF *</Text>
          <TouchableOpacity style={styles.resumeButton} onPress={handlePickResume}>
            <MaterialIcons name={resume ? 'picture-as-pdf' : 'upload-file'} size={20} color={resume ? '#f87171' : '#58a6ff'} />
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
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitText}>Müraciəti göndər</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderColor: '#21262d',
    borderWidth: 1,
    padding: 18,
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
    color: '#e6edf3',
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#8b949e',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    color: '#e6edf3',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 100,
  },
  resumeButton: {
    backgroundColor: '#0d1117',
    borderColor: '#30363d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  resumeTextBlock: {
    flex: 1,
    marginLeft: 10,
  },
  resumeTitle: {
    color: '#e6edf3',
    fontWeight: '900',
  },
  resumeMeta: {
    color: '#8b949e',
    fontSize: 11,
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitText: {
    color: '#111827',
    fontWeight: '900',
  },
});
