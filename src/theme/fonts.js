import { StyleSheet } from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

export const FONT_ASSETS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
};

const FAMILY_BY_WEIGHT = {
  normal: 'Inter_400Regular',
  100: 'Inter_400Regular',
  200: 'Inter_400Regular',
  300: 'Inter_400Regular',
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
  900: 'Inter_900Black',
};

// React Native has no global font setting, and each Inter weight is its own
// family. Picks the family that matches the style's fontWeight and resets the
// weight so platforms don't fake-bold an already bold face.
export function withInter(style) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style;
  const family = FAMILY_BY_WEIGHT[String(flat.fontWeight || 'normal')] || FAMILY_BY_WEIGHT.normal;
  return [style, { fontFamily: family, fontWeight: 'normal' }];
}
