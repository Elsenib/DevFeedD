import { Alert } from 'react-native';
import * as api from '../api';

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Təhqir və ya təqib' },
  { key: 'hate', label: 'Nifrət nitqi' },
  { key: 'sexual', label: 'Uyğunsuz / cinsi məzmun' },
  { key: 'scam', label: 'Fırıldaqçılıq' },
  { key: 'other', label: 'Digər' },
];

const errorMessage = (error) => error.response?.data?.message || error.message;

export function reportContent({ targetType, targetId }) {
  Alert.alert('Şikayət səbəbi', 'Bu məzmunda nə problem var?', [
    ...REPORT_REASONS.map((reason) => ({
      text: reason.label,
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
  ]);
}

export function blockUser({ userId, userName, onBlocked }) {
  Alert.alert(
    'İstifadəçini blokla',
    `${userName || 'Bu istifadəçi'} sizə yaza bilməyəcək, siz də onun postlarını, şərhlərini və mesajlarını görməyəcəksiniz. Parametrlərdən blokdan çıxara bilərsiniz.`,
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

  const buttons = [{ text: 'Şikayət et', onPress: () => reportContent({ targetType, targetId }) }];
  if (userId) {
    buttons.push({ text: 'İstifadəçini blokla', style: 'destructive', onPress: () => blockUser({ userId, userName, onBlocked }) });
  }
  buttons.push({ text: 'Ləğv et', style: 'cancel' });

  Alert.alert('Seçimlər', '', buttons);
}
