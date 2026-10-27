import { Alert } from 'react-native';
import * as api from '../api';
import { errorText } from './errors';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam', icon: 'report-gmailerrorred' },
  { key: 'harassment', label: 'Təhqir və ya təqib', icon: 'sentiment-very-dissatisfied' },
  { key: 'hate', label: 'Nifrət nitqi', icon: 'record-voice-over' },
  { key: 'sexual', label: 'Uyğunsuz / cinsi məzmun', icon: 'no-adult-content' },
  { key: 'scam', label: 'Fırıldaqçılıq', icon: 'money-off' },
  { key: 'other', label: 'Digər', icon: 'more-horiz' },
];

const errorMessage = (error) => errorText(error);

export function reportContent({ targetType, targetId }) {
  Alert.alert('Şikayət səbəbi', 'Bu məzmunda nə problem var?', [
    ...REPORT_REASONS.map((reason) => ({
      text: reason.label,
      icon: reason.icon,
      onPress: async () => {
        try {
          const data = await api.reportContent({ targetType, targetId, reason: reason.key });
          Alert.alert('Şikayət qeydə alındı', data?.message || 'Komandamız tezliklə baxacaq.');
        } catch (error) {
          Alert.alert('Şikayət alınmadı', errorMessage(error));
        }
      },
    })),
    { text: 'Ləğv et', style: 'cancel' },
  ], { sheet: true });
}

export function blockUser({ userId, userName, onBlocked }) {
  Alert.alert(
    'İstifadəçini blokla',
    `${userName || 'Bu istifadəçi'} sənə yaza bilməyəcək, sən də onun paylaşımlarını, şərhlərini və mesajlarını görməyəcəksən. Tənzimləmələrdən blokdan çıxara bilərsən.`,
    [
      { text: 'Ləğv et', style: 'cancel' },
      {
        text: 'Blokla',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.blockUser(userId);
            onBlocked?.();
          } catch (error) {
            Alert.alert('Bloklama alınmadı', errorMessage(error));
          }
        },
      },
    ]
  );
}

// Options menu: report the content and/or block its author.
// Pass currentUserId so the menu is not offered for the user's own content.
export function openModerationMenu({ targetType, targetId, userId, userName, currentUserId, onBlocked }) {
  if (userId && currentUserId && String(userId) === String(currentUserId)) return;

  const buttons = [{ text: 'Şikayət et', icon: 'outlined-flag', onPress: () => reportContent({ targetType, targetId }) }];
  if (userId) {
    buttons.push({ text: 'İstifadəçini blokla', icon: 'block', style: 'destructive', onPress: () => blockUser({ userId, userName, onBlocked }) });
  }
  buttons.push({ text: 'Ləğv et', style: 'cancel' });

  Alert.alert('', '', buttons, { sheet: true });
}
