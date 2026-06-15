import { useContext, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { LANGUAGES, PreferencesContext, THEME_MODES } from '../context/PreferencesContext';

export default function SettingsScreen({ navigation }) {
  const { signOut } = useContext(AuthContext);
  const { theme, themeMode, language, setThemeMode, setLanguage, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSignOut = () => {
    Alert.alert('Çıxış', 'Hesabdan çıxmaq istəyirsiniz?', [
      { text: 'Xeyr', style: 'cancel' },
      { text: 'Bəli', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.settings}</Text>
        <Text style={styles.subtitle}>Profil, görünüş və tətbiq ayarları</Text>
      </View>

      <Text style={styles.sectionTitle}>{t.account}</Text>
      <TouchableOpacity style={styles.cardRow} onPress={() => navigation.navigate('Profile', { openEdit: true })}>
        <View style={styles.cardIcon}>
          <MaterialIcons name="edit" size={20} color="#ffffff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{t.editProfile}</Text>
          <Text style={styles.cardSubtitle}>Ad, bio, stack, website və profil şəkli</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.cardRow} onPress={handleSignOut}>
        <View style={[styles.cardIcon, styles.dangerIcon]}>
          <MaterialIcons name="logout" size={20} color="#ffffff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{t.signOut}</Text>
          <Text style={styles.cardSubtitle}>Hesabdan çıx və tokeni təmizlə</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t.appearance}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tema</Text>
        <View style={styles.segmentRow}>
          {Object.entries(THEME_MODES).map(([key, item]) => {
            const active = key === themeMode;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setThemeMode(key)}
              >
                <MaterialIcons name={key === 'dark' ? 'dark-mode' : 'light-mode'} size={17} color={active ? '#ffffff' : colors.muted} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t.language}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App dili</Text>
        <View style={styles.languageList}>
          {Object.entries(LANGUAGES).map(([key, item]) => {
            const active = key === language;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.languageItem, active && styles.languageItemActive]}
                onPress={() => setLanguage(key)}
              >
                <Text style={[styles.languageText, active && styles.languageTextActive]}>{item.label}</Text>
                {active && <MaterialIcons name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Destek</Text>
      <TouchableOpacity style={styles.cardRow} onPress={() => navigation.navigate('Profile')}>
        <View style={[styles.cardIcon, styles.supportIcon]}>
          <MaterialIcons name="local-cafe" size={20} color="#111827" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Buy me a coffee</Text>
          <Text style={styles.cardSubtitle}>Profildə minimum 1 AZN dəstək axınını aç</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
      </TouchableOpacity>

      <Text style={styles.footerText}>DevFeed Mobile 1.0.0</Text>
    </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 100,
    },
    header: {
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 4,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 10,
      marginTop: 16,
      fontWeight: '900',
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderColor: colors.border,
      borderWidth: 1,
    },
    cardRow: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderColor: colors.border,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    dangerIcon: {
      backgroundColor: colors.danger,
    },
    supportIcon: {
      backgroundColor: colors.warning,
    },
    cardBody: {
      flex: 1,
    },
    cardTitle: {
      color: colors.text,
      fontWeight: '900',
      marginBottom: 5,
    },
    cardSubtitle: {
      color: colors.muted,
      lineHeight: 19,
      fontSize: 12,
    },
    segmentRow: {
      flexDirection: 'row',
      marginTop: 12,
    },
    segmentButton: {
      flex: 1,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginRight: 8,
    },
    segmentButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentText: {
      color: colors.muted,
      fontWeight: '800',
      marginLeft: 6,
    },
    segmentTextActive: {
      color: '#ffffff',
    },
    languageList: {
      marginTop: 10,
    },
    languageItem: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    languageItemActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    languageText: {
      color: colors.text,
      fontWeight: '800',
    },
    languageTextActive: {
      color: colors.primary,
    },
    footerText: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 18,
      fontSize: 12,
    },
  });
}
