import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PreferencesContext } from './PreferencesContext';

function normalizeButtons(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return [{ text: 'Oldu', style: 'default' }];
  }
  return buttons.map((button) => ({
    text: button?.text || 'Oldu',
    style: button?.style || 'default',
    onPress: button?.onPress,
  }));
}

function iconFor(title, buttons) {
  const text = String(title || '').toLowerCase();
  if (buttons?.some((button) => button.style === 'destructive') || text.includes('sil')) {
    return { name: 'warning', color: '#f85149' };
  }
  if (text.includes('xəta') || text.includes('xeta') || text.includes('alınmadı')) {
    return { name: 'error-outline', color: '#f85149' };
  }
  if (text.includes('yeniləndi') || text.includes('qeydə') || text.includes('uğur')) {
    return { name: 'check-circle', color: '#3fb950' };
  }
  return { name: 'info-outline', color: '#6366f1' };
}

export function AppAlertProvider({ children }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [alertState, setAlertState] = useState(null);

  useEffect(() => {
    const nativeAlert = Alert.alert;
    Alert.alert = (title, message, buttons, options) => {
      setAlertState({
        title: String(title || ''),
        message: typeof message === 'string' ? message : '',
        buttons: normalizeButtons(buttons),
        cancelable: options?.cancelable !== false,
      });
    };

    return () => {
      Alert.alert = nativeAlert;
    };
  }, []);

  const close = () => setAlertState(null);
  const icon = alertState ? iconFor(alertState.title, alertState.buttons) : null;

  return (
    <>
      {children}
      <Modal visible={!!alertState} transparent animationType="fade" onRequestClose={alertState?.cancelable ? close : undefined}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={alertState?.cancelable ? close : undefined} />
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${icon?.color || colors.primary}22` }]}>
                <MaterialIcons name={icon?.name || 'info-outline'} size={26} color={icon?.color || colors.primary} />
              </View>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{alertState?.title || 'DevFeed'}</Text>
                {!!alertState?.message && <Text style={styles.message}>{alertState.message}</Text>}
              </View>
            </View>

            <View style={styles.buttonRow}>
              {alertState?.buttons.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      cancel && styles.cancelButton,
                      destructive && styles.destructiveButton,
                      index > 0 && styles.buttonSpacing,
                    ]}
                    onPress={() => {
                      close();
                      button.onPress?.();
                    }}
                  >
                    <Text style={[
                      styles.buttonText,
                      cancel && styles.cancelButtonText,
                      destructive && styles.destructiveButtonText,
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 22,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    card: {
      width: '100%',
      maxWidth: 430,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    titleBlock: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 6,
    },
    message: {
      color: colors.muted,
      lineHeight: 20,
      fontSize: 13,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 18,
    },
    button: {
      minWidth: 92,
      borderRadius: 10,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 11,
      alignItems: 'center',
    },
    buttonSpacing: {
      marginLeft: 8,
    },
    cancelButton: {
      backgroundColor: colors.surfaceStrong,
      borderColor: colors.border,
      borderWidth: 1,
    },
    destructiveButton: {
      backgroundColor: colors.danger,
    },
    buttonText: {
      color: '#ffffff',
      fontWeight: '900',
    },
    cancelButtonText: {
      color: colors.text,
    },
    destructiveButtonText: {
      color: '#ffffff',
    },
  });
}
