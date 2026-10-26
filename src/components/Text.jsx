import { Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import { withInter } from '../theme/fonts';

// Drop-in Text and TextInput that render in Inter. Screens import these instead
// of the React Native ones; refs pass through as ordinary props in React 19.
export function Text({ style, ...props }) {
  return <NativeText {...props} style={withInter(style)} />;
}

export function TextInput({ style, ...props }) {
  return <NativeTextInput {...props} style={withInter(style)} />;
}
