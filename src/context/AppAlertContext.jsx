import { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/Text';
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
    icon: button?.icon,
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
  return { name: 'info-outline', color: '#FF7A2F' };
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
        // { sheet: true } shows the buttons as an action sheet (icon + label rows).
        sheet: !!options?.sheet,
      });
    };

    return () => {
      Alert.alert = nativeAlert;
    };
  }, []);

  const close = () => setAlertState(null);
  const choose = (button) => {
    close();
    button.onPress?.();
  };

  if (alertState?.sheet) {
    const actions = alertState.buttons.filter((button) => button.style !== 'cancel');
    const cancel = alertState.buttons.find((button) => button.style === 'cancel');
    return (
      <>
        {children}
        <Modal visible transparent animationType="slide" onRequestClose={close}>
          <View style={styles.sheetOverlay}>
            <Pressable style={styles.backdrop} onPress={close} />
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              {!!alertState.title && <Text style={styles.sheetTitle}>{alertState.title}</Text>}
              {!!alertState.message && <Text style={styles.sheetMessage}>{alertState.message}</Text>}
              {actions.map((button, index) => {
                const destructive = button.style === 'destructive';
                const tint = destructive ? colors.danger : colors.text;
                return (
                  <TouchableOpacity key={`${button.text}-${index}`} style={styles.sheetRow} onPress={() => choose(button)}>
                    {!!button.icon && (
                      <View style={[styles.sheetIcon, { backgroundColor: destructive ? `${colors.danger}1F` : colors.surfaceStrong }]}>
                        <MaterialIcons name={button.icon} size={20} color={tint} />
                      </View>
                    )}
                    <Text style={[styles.sheetRowText, { color: tint }]}>{button.text}</Text>
                  </TouchableOpacity>
                );
              })}
              {!!cancel && (
                <TouchableOpacity style={styles.sheetCancel} onPress={() => choose(cancel)}>
                  <Text style={styles.sheetCancelText}>{cancel.text}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      </>
    );
  }
  const icon = alertState ? iconFor(alertState.title, alertState.buttons) : null;
  const stacked = (alertState?.buttons.length || 0) > 2;

  return (
    <>
      {children}
      <Modal visible={!!alertState} transparent animationType="fade" onRequestClose={alertState?.cancelable ? close : undefined}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={alertState?.cancelable ? close : undefined} />
          <View style={styles.card}>
            <View style={[styles.headerRow, !alertState?.message && styles.headerRowCentered]}>
              <View style={[styles.iconWrap, { backgroundColor: `${icon?.color || colors.primary}22` }]}>
                <MaterialIcons name={icon?.name || 'info-outline'} size={26} color={icon?.color || colors.primary} />
              </View>
              <View style={styles.titleBlock}>
                <Text style={[styles.title, !alertState?.message && styles.titleOnly]}>{alertState?.title || 'DevFeed'}</Text>
                {!!alertState?.message && <Text style={styles.message}>{alertState.message}</Text>}
              </View>
            </View>

            <View style={stacked ? styles.buttonColumn : styles.buttonRow}>
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
                      index > 0 && (stacked ? styles.buttonStackSpacing : styles.buttonSpacing),
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
    headerRowCentered: {
      alignItems: 'center',
    },
    titleOnly: {
      marginBottom: 0,
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 30,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    sheetMessage: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 6,
      paddingHorizontal: 4,
    },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: 4,
    },
    sheetIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    sheetRowText: {
      fontSize: 16,
      fontWeight: '700',
    },
    sheetCancel: {
      marginTop: 10,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetCancelText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
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
    buttonColumn: {
      marginTop: 18,
    },
    buttonStackSpacing: {
      marginTop: 8,
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
