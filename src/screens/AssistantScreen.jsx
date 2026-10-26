import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import * as api from '../api';

const AI_ICON = require('../../assets/ai-assistant.png');
const MAX_SAVED = 40;
const SUGGESTIONS = [
  'React-də useEffect nə vaxt işləyir?',
  'Junior developer CV-mə nə yazım?',
  'Layihəm üçün DevFeed paylaşımı yaz',
  'Bu xətanı izah et: undefined is not a function',
];

// Splits a reply into prose and ``` fenced code so code keeps its layout.
function splitCode(text) {
  return String(text).split(/```[\w-]*\n?/).map((part, index) => ({ code: index % 2 === 1, text: part.replace(/\n+$/, '') })).filter((part) => part.text);
}

export default function AssistantScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const storageKey = `devfeed.ai.${user?.id || 'guest'}`;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((saved) => saved && setMessages(JSON.parse(saved)))
      .catch(() => {});
    api.fetchAiStatus().then((status) => setRemaining(status.remaining)).catch(() => {});
  }, [storageKey]);

  const save = (next) => {
    setMessages(next);
    AsyncStorage.setItem(storageKey, JSON.stringify(next.slice(-MAX_SAVED))).catch(() => {});
  };

  const send = async (value = text) => {
    const question = value.trim();
    if (!question || sending) return;
    const history = [...messages, { role: 'user', content: question }];
    save(history);
    setText('');
    setSending(true);
    try {
      const result = await api.askAi(history.slice(-20));
      save([...history, { role: 'assistant', content: result.reply }]);
      if (typeof result.remaining === 'number') setRemaining(result.remaining);
    } catch (error) {
      const message = error.response?.data?.message || 'AI cavab vermədi. İnterneti yoxla və yenidən yaz.';
      if (typeof error.response?.data?.remaining === 'number') setRemaining(error.response.data.remaining);
      save([...history, { role: 'assistant', content: message, failed: true }]);
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    Alert.alert('Söhbəti təmizlə', 'Bütün AI mesajları silinsin?', [
      { text: 'Ləğv et', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => save([]) },
    ]);
  };

  const renderMessage = ({ item }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.row, mine && styles.rowMine]}>
        {!mine && <Image source={AI_ICON} style={styles.rowIcon} />}
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: item.failed ? colors.danger || '#f87171' : colors.border },
          ]}
        >
          {mine ? (
            <Text selectable style={[styles.text, { color: colors.onPrimary }]}>{item.content}</Text>
          ) : (
            splitCode(item.content).map((part, index) =>
              part.code ? (
                <View key={index} style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text selectable style={[styles.codeText, { color: colors.text }]}>{part.text}</Text>
                </View>
              ) : (
                <Text key={index} selectable style={[styles.text, { color: colors.text }]}>{part.text.trim()}</Text>
              )
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 72 : 0}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.goBack()} accessibilityLabel="Geri">
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Image source={AI_ICON} style={styles.headerIcon} />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>DevFeed AI</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {remaining === null ? 'Developer köməkçin' : `Bu gün ${remaining} sual qalıb`}
            </Text>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={clear} accessibilityLabel="Söhbəti təmizlə">
              <MaterialIcons name="delete-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.welcome}>
              <Image source={AI_ICON} style={styles.welcomeIcon} />
              <Text style={[styles.welcomeTitle, { color: colors.text }]}>Salam! Mən DevFeed AI-yam.</Text>
              <Text style={[styles.welcomeText, { color: colors.muted }]}>Kod, xəta, CV və ya paylaşım mətni — nə lazımdırsa soruş.</Text>
              {SUGGESTIONS.map((item) => (
                <Pressable key={item} style={[styles.suggestion, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => send(item)}>
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          }
          ListFooterComponent={
            sending ? (
              <View style={styles.row}>
                <Image source={AI_ICON} style={styles.rowIcon} />
                <View style={[styles.bubble, styles.typing, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.typingText, { color: colors.muted }]}>Düşünür…</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Sualını yaz..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            multiline
            maxLength={4000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: text.trim() && !sending ? colors.primary : colors.border }]}
            onPress={() => send()}
            disabled={sending || !text.trim()}
            accessibilityLabel="Göndər"
          >
            <MaterialIcons name="send" size={19} color={text.trim() && !sending ? colors.onPrimary : colors.muted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    width: 42,
    height: 42,
    marginLeft: 10,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  messages: {
    padding: 14,
    paddingBottom: 20,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowIcon: {
    width: 30,
    height: 30,
    marginRight: 6,
  },
  bubble: {
    maxWidth: '86%',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  codeBlock: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12.5,
    lineHeight: 18,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    fontSize: 13,
  },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  welcomeIcon: {
    width: 120,
    height: 120,
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  suggestion: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    padding: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
