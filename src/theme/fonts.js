import { StyleSheet, Text, TextInput } from 'react-native';
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

let applied = false;

// React Native has no global font setting, and each Inter weight is its own
// family. Wrap Text/TextInput so the family follows the style's fontWeight;
// the weight itself is reset so platforms don't fake-bold an already bold face.
export function applyGlobalFont() {
  if (applied) return;
  applied = true;

  [Text, TextInput].forEach((Component) => {
    const originalRender = Component.render;
    if (typeof originalRender !== 'function') return;

    Component.render = function renderWithFont(props, ref) {
      const flat = StyleSheet.flatten(props.style) || {};
      if (flat.fontFamily) return originalRender.call(this, props, ref);
      const family = FAMILY_BY_WEIGHT[String(flat.fontWeight || 'normal')] || FAMILY_BY_WEIGHT.normal;
      return originalRender.call(
        this,
        { ...props, style: [props.style, { fontFamily: family, fontWeight: 'normal' }] },
        ref
      );
    };
  });
}
