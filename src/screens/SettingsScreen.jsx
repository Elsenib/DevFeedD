import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { LANGUAGES, PreferencesContext, THEME_MODES } from '../context/PreferencesContext';
import { API_BASE_URL } from '../constants/config';
import * as api from '../api';
import appConfig from '../../app.json';
import { AuroraGlow, ScreenHeader } from '../components/ScreenChrome';

export default function SettingsScreen({ navigation }) {
  const { user, signOut, updateCurrentUser } = useContext(AuthContext);
  const { theme, themeMode, language, setThemeMode, setLanguage, t } = useContext(PreferencesContext);
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activityVisible, setActivityVisible] = useState(user?.activity_visible !== false);

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setActivityVisible(user?.activity_visible !== false);
  }, [user?.activity_visible]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      api.fetchBlockedUsers().then(setBlockedUsers).catch(() => {});
    });
    return unsubscribe;
  }, [navigation]);

  const handleUnblock = async (blockedUser) => {
    try {
      await api.unblockUser(blockedUser.id);
      setBlockedUsers((current) => current.filter((item) => item.id !== blockedUser.id));
    } catch (error) {
      Alert.alert('Xəta', error.response?.data?.message || error.message);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteAccount();
      await signOut();
    } catch (error) {
      setDeleting(false);
      Alert.alert('Hesab silinmədi', error.response?.data?.message || error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı sil',
      'Profiliniz, postlarınız, şərhləriniz, mesajlarınız və müraciətləriniz birdəfəlik silinəcək. Bu əməliyyatı geri qaytarmaq olmaz.',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Davam et',
          style: 'destructive',
          onPress: () => setTimeout(() => {
            Alert.alert('Əminsiniz?', 'Hesabınız indi silinəcək.', [
              { text: 'Xeyr', style: 'cancel' },
              { text: 'Bəli, sil', style: 'destructive', onPress: deleteAccount },
            ]);
          }, 300),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Çıxış', 'Hesabdan çıxmaq istəyirsiniz?', [
      { text: 'Xeyr', style: 'cancel' },
      { text: 'Bəli', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleActivityVisible = async (nextValue) => {
    setActivityVisible(nextValue);
    try {
      await updateCurrentUser({ activityVisible: nextValue });
    } catch (error) {
      setActivityVisible(!nextValue);
      Alert.alert('Tənzimləmə xətası', error.response?.data?.message || error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <AuroraGlow />
    <ScreenHeader title={t.settings} subtitle="Profil, görünüş və tətbiq ayarları" onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={styles.content}>

      <Text style={styles.sectionTitle}>{t.account}</Text>
      <TouchableOpacity style={styles.cardRow} onPress={() => navigation.navigate('Main', { screen: 'Profile', params: { openEdit: true } })}>
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

      <Text style={styles.sectionTitle}>Məxfilik</Text>
      <View style={styles.cardRow}>
        <View style={[styles.cardIcon, styles.privacyIcon]}>
          <MaterialIcons name="visibility" size={20} color="#ffffff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Fəaliyyət görünürlüğü</Text>
          <Text style={styles.cardSubtitle}>Profilində paylaşımlarını başqalarına göstər və ya gizlət</Text>
        </View>
        <Switch
          value={activityVisible}
          onValueChange={handleActivityVisible}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#ffffff"
        />
      </View>

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

      <Text style={styles.sectionTitle}>Bloklanmış istifadəçilər</Text>
      <View style={styles.card}>
        {blockedUsers.length === 0 ? (
          <Text style={styles.cardSubtitle}>Bloklanmış istifadəçi yoxdur. Profil, post və ya mesajdakı menyudan istifadəçini bloklaya bilərsiniz.</Text>
        ) : (
          blockedUsers.map((item) => (
            <View key={item.id} style={styles.blockedRow}>
              <Text style={styles.blockedName} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity style={styles.unblockButton} onPress={() => handleUnblock(item)}>
                <Text style={styles.unblockText}>Blokdan çıxar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Hüquqi</Text>
      <TouchableOpacity style={styles.cardRow} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
        <View style={[styles.cardIcon, styles.privacyIcon]}>
          <MaterialIcons name="policy" size={20} color="#ffffff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Məxfilik siyasəti və qaydalar</Text>
          <Text style={styles.cardSubtitle}>Hansı məlumatları topladığımız və məzmun qaydaları</Text>
        </View>
        <MaterialIcons name="open-in-new" size={20} color={colors.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.cardRow} onPress={handleDeleteAccount} disabled={deleting}>
        <View style={[styles.cardIcon, styles.dangerIcon]}>
          <MaterialIcons name="delete-forever" size={20} color="#ffffff" />
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, styles.dangerText]}>{deleting ? 'Silinir...' : 'Hesabı sil'}</Text>
          <Text style={styles.cardSubtitle}>Hesabınızı və bütün məlumatlarınızı birdəfəlik silin</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.footerText}>DevFeed {appConfig.expo.version} ({appConfig.expo.android.versionCode})</Text>
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
      borderRadius: 18,
      padding: 14,
      marginBottom: 12,
      borderColor: colors.border,
      borderWidth: 1,
    },
    cardRow: {
      backgroundColor: colors.surface,
      borderRadius: 18,
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
    dangerText: {
      color: colors.danger,
    },
    blockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    blockedName: {
      color: colors.text,
      fontWeight: '800',
      flex: 1,
      marginRight: 10,
    },
    unblockButton: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    unblockText: {
      color: colors.primary,
      fontWeight: '800',
      fontSize: 12,
    },
    privacyIcon: {
      backgroundColor: colors.success,
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
