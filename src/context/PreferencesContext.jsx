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
  },
  en: {
    label: 'English',
    settings: 'Settings',
    account: 'Account',
    appearance: 'Appearance',
    language: 'Language',
    editProfile: 'Edit profile',
    signOut: 'Sign out',
  },
  tr: {
    label: 'Türkcə',
    settings: 'Ayarlar',
    account: 'Hesap',
    appearance: 'Gorunum',
    language: 'Dil',
    editProfile: 'Profili duzenle',
    signOut: 'Cikis',
  },
};

export const THEME_MODES = {
  dark: {
    label: 'Dark',
    colors: {
      background: '#0d1117',
      surface: '#161b22',
      surfaceStrong: '#0f172a',
      border: '#21262d',
      text: '#e6edf3',
      muted: '#8b949e',
      primary: '#6366f1',
      primarySoft: '#1e1b4b',
      danger: '#f85149',
      warning: '#f59e0b',
      success: '#3fb950',
      input: '#0d1117',
    },
  },
  light: {
    label: 'Light',
    colors: {
      background: '#f8fafc',
      surface: '#ffffff',
      surfaceStrong: '#eef2ff',
      border: '#dbe3ef',
      text: '#0f172a',
      muted: '#64748b',
      primary: '#4f46e5',
      primarySoft: '#e0e7ff',
      danger: '#dc2626',
      warning: '#d97706',
      success: '#15803d',
      input: '#ffffff',
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
