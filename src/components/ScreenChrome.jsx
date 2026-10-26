import { useContext } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { PreferencesContext } from '../context/PreferencesContext';

// Soft ember glow behind the top of a screen. Render it as the first child.
export function AuroraGlow({ height = 320 }) {
  const { themeMode } = useContext(PreferencesContext);
  const light = themeMode === 'light';
  return (
    <View pointerEvents="none" style={[styles.glow, { height }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="auroraA" cx="20%" cy="0%" rx="70%" ry="60%">
            <Stop offset="0" stopColor="#FF7A2F" stopOpacity={light ? 0.14 : 0.22} />
            <Stop offset="1" stopColor="#FF7A2F" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="auroraB" cx="95%" cy="0%" rx="55%" ry="50%">
            <Stop offset="0" stopColor="#FF3D5A" stopOpacity={light ? 0.1 : 0.18} />
            <Stop offset="1" stopColor="#FF3D5A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#auroraA)" />
        <Rect width="100%" height="100%" fill="url(#auroraB)" />
      </Svg>
    </View>
  );
}

export function HeaderIconButton({ icon, onPress, label, badge, disabled }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialIcons name={icon} size={21} color={colors.text} />
      {!!badge && <View style={[styles.badge, { borderColor: colors.surface }]} />}
    </Pressable>
  );
}

export function ScreenHeader({ title, subtitle, onBack, children }) {
  const { theme } = useContext(PreferencesContext);
  const colors = theme.colors;
  return (
    <View style={styles.header}>
      {!!onBack && <HeaderIconButton icon="arrow-back" onPress={onBack} label="Geri" />}
      <View style={[styles.titleBlock, onBack && styles.titleWithBack]}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.muted }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {!!children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleWithBack: {
    marginLeft: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: '#FF5A2A',
  },
});
