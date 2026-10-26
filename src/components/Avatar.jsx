import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { avatarTone } from '../utils/avatarTone';
import { repairUploadUrl } from '../utils/media';

// Photo when it loads, otherwise the initial on a per-person tone. Uploaded
// files can disappear (ephemeral server disk), so a failed image falls back.
export default function Avatar({ name, uri, size = 42, style }) {
  const [failed, setFailed] = useState(false);
  const source = repairUploadUrl(uri);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  const dims = { width: size, height: size, borderRadius: size / 2 };
  if (source && !failed) {
    return <Image source={{ uri: source }} style={[styles.image, dims, style]} onError={() => setFailed(true)} />;
  }
  const tone = avatarTone(name);
  return (
    <View style={[styles.fallback, dims, { backgroundColor: tone.bg }, style]}>
      <Text style={[styles.letter, { color: tone.fg, fontSize: Math.round(size * 0.4) }]}>
        {String(name || '?').trim().slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1F2433',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontWeight: '800',
  },
});
