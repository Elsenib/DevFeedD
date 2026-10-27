import { useContext } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { PreferencesContext } from '../context/PreferencesContext';
import { MAX_ACCOUNTS } from '../utils/accounts';
import Avatar from './Avatar';
import { Text } from './Text';

// Bottom sheet listing the accounts signed in on this device.
export default function AccountSwitcher({ visible, onClose }) {
  const { user, accounts, switchAccount, removeAccount, startAddAccount } = useContext(AuthContext);
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;

  const confirmRemove = (account) => {
    const active = String(account.id) === String(user?.id);
    Alert.alert(
      'Bu cihazdan sil',
      `${account.user?.name || 'Hesab'} bu telefondakı siyahıdan silinsin?${active ? ' Hesabdan çıxış ediləcək.' : ''} Hesabın özü silinmir.`,
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => removeAccount(account.id) },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Bağla" />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.text }]}>Hesablar</Text>

        {accounts.map((account) => {
          const active = String(account.id) === String(user?.id);
          return (
            <TouchableOpacity
              key={account.id}
              style={styles.row}
              onPress={() => (active ? onClose() : switchAccount(account.id))}
              accessibilityLabel={active ? `${account.user?.name}, aktiv hesab` : `${account.user?.name} hesabına keç`}
            >
              <View style={[styles.avatarRing, active && { borderColor: colors.primary }]}>
                <Avatar name={account.user?.name || account.user?.email} uri={account.user?.avatar_url} size={44} />
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{account.user?.name || 'İstifadəçi'}</Text>
                <Text style={[styles.email, { color: colors.muted }]} numberOfLines={1}>{account.user?.email}</Text>
              </View>
              {active && <MaterialIcons name="check-circle" size={22} color={colors.primary} />}
              <TouchableOpacity hitSlop={10} style={styles.more} onPress={() => confirmRemove(account)} accessibilityLabel={`${account.user?.name} hesabını bu cihazdan sil`}>
                <MaterialIcons name="more-vert" size={20} color={colors.muted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.row} onPress={startAddAccount} accessibilityLabel="Hesab əlavə et">
          <View style={[styles.addIcon, { borderColor: colors.border }]}>
            <MaterialIcons name="add" size={24} color={colors.text} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.name, { color: colors.text }]}>Hesab əlavə et</Text>
            <Text style={[styles.email, { color: colors.muted }]}>
              {accounts.length >= MAX_ACCOUNTS ? `Limit: ${MAX_ACCOUNTS} hesab` : 'Başqa hesabla daxil ol'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarRing: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 26,
    padding: 2,
  },
  rowBody: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
  },
  email: {
    fontSize: 12,
    marginTop: 2,
  },
  more: {
    width: 32,
    alignItems: 'center',
    marginLeft: 6,
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
