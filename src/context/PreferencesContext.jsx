import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'devfeed.preferences';

export const LANGUAGES = {
  az: {
    label: 'Azərbaycanca',
    settings: 'Tənzimləmələr',
    account: 'Hesab',
    appearance: 'Görünüş',
    language: 'Dil',
    editProfile: 'Profili düzəlt',
    signOut: 'Çıxış',
    feed: 'Feed',
    feedSubtitle: 'Kod, deploy, media və iş elanları',
    explore: 'Kəşf',
    exploreSubtitle: 'İstifadəçiləri və paylaşımları tap',
    notifications: 'Bildirişlər',
    notificationsSubtitle: 'Paylaşım, follow və mesaj xəbərləri',
    messages: 'Mesajlar',
    messagesSubtitle: 'DM söhbətləri və iş müraciətləri',
    chats: 'Söhbətlər',
    applications: 'Müraciətlər',
    publicChat: 'Public Chat',
    profile: 'Profil',
    post: 'Paylaşım',
    comments: 'Şərhlər',
    searchPlaceholder: 'Ad, email, texnologiya və ya hashtag',
    noResults: 'Nəticə tapılmadı.',
  },
  en: {
    label: 'English',
    settings: 'Settings',
    account: 'Account',
    appearance: 'Appearance',
    language: 'Language',
    editProfile: 'Edit profile',
    signOut: 'Sign out',
    feed: 'Feed',
    feedSubtitle: 'Code, deploys, media, and jobs',
    explore: 'Explore',
    exploreSubtitle: 'Find users and posts',
    notifications: 'Notifications',
    notificationsSubtitle: 'Post, follow, and message updates',
    messages: 'Messages',
    messagesSubtitle: 'DM chats and job applications',
    chats: 'Chats',
    applications: 'Applications',
    publicChat: 'Public Chat',
    profile: 'Profile',
    post: 'Post',
    comments: 'Comments',
    searchPlaceholder: 'Name, email, technology, or hashtag',
    noResults: 'No results found.',
  },
  tr: {
    label: 'Türkcə',
    settings: 'Ayarlar',
    account: 'Hesap',
    appearance: 'Görünüm',
    language: 'Dil',
    editProfile: 'Profili düzenle',
    signOut: 'Çıkış',
    feed: 'Akış',
    feedSubtitle: 'Kod, deploy, medya ve iş ilanları',
    explore: 'Keşfet',
    exploreSubtitle: 'Kullanıcıları ve paylaşımları bul',
    notifications: 'Bildirimler',
    notificationsSubtitle: 'Paylaşım, takip ve mesaj haberleri',
    messages: 'Mesajlar',
    messagesSubtitle: 'DM sohbetleri ve iş başvuruları',
    chats: 'Sohbetler',
    applications: 'Başvurular',
    publicChat: 'Public Chat',
    profile: 'Profil',
    post: 'Paylaşım',
    comments: 'Yorumlar',
    searchPlaceholder: 'Ad, email, teknoloji veya hashtag',
    noResults: 'Sonuç bulunamadı.',
  },
};

export const THEME_MODES = {
  dark: {
    label: 'Dark',
    colors: {
      background: '#06080F',
      surface: '#10131D',
      surfaceStrong: '#161A27',
      border: '#1F2433',
      text: '#F1F4FA',
      muted: '#8790A6',
      primary: '#FF7A2F',
      primarySoft: '#2A160C',
      accentText: '#FF9A5C',
      onPrimary: '#1A0A02',
      danger: '#FF5A5F',
      warning: '#F5B83D',
      success: '#4ADE80',
      input: '#0B0E17',
    },
  },
  light: {
    label: 'Light',
    colors: {
      background: '#FAF8F5',
      surface: '#FFFFFF',
      surfaceStrong: '#F3EFE9',
      border: '#E7E1D8',
      text: '#14110F',
      muted: '#6B635B',
      primary: '#E8590C',
      primarySoft: '#FFE8D9',
      accentText: '#C2410C',
      onPrimary: '#FFFFFF',
      danger: '#D92D20',
      warning: '#B45309',
      success: '#15803D',
      input: '#FFFFFF',
    },
  },
};

async function loadPreferences() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

async function savePreferences(preferences) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    // Preferences are nice-to-have; app should keep working without storage.
  }
}

export const PreferencesContext = createContext({
  themeMode: 'dark',
  language: 'az',
  theme: THEME_MODES.dark,
  t: LANGUAGES.az,
  setThemeMode: async () => {},
  setLanguage: async () => {},
});

export function PreferencesProvider({ children }) {
  const [themeMode, setThemeModeState] = useState('dark');
  const [language, setLanguageState] = useState('az');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      const saved = await loadPreferences();
      if (saved.themeMode && THEME_MODES[saved.themeMode]) setThemeModeState(saved.themeMode);
      if (saved.language && LANGUAGES[saved.language]) setLanguageState(saved.language);
      setReady(true);
    };
    restore();
  }, []);

  const persist = useCallback(async (next) => {
    await savePreferences({
      themeMode,
      language,
      ...next,
    });
  }, [language, themeMode]);

  const setThemeMode = useCallback(async (nextMode) => {
    if (!THEME_MODES[nextMode]) return;
    setThemeModeState(nextMode);
    await persist({ themeMode: nextMode });
  }, [persist]);

  const setLanguage = useCallback(async (nextLanguage) => {
    if (!LANGUAGES[nextLanguage]) return;
    setLanguageState(nextLanguage);
    await persist({ language: nextLanguage });
  }, [persist]);

  const value = useMemo(() => ({
    themeMode,
    language,
    theme: THEME_MODES[themeMode] || THEME_MODES.dark,
    t: LANGUAGES[language] || LANGUAGES.az,
    ready,
    setThemeMode,
    setLanguage,
  }), [language, ready, setLanguage, setThemeMode, themeMode]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}
