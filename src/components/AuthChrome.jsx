import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

// Ember glow + small black-hole mark shared by the login and register screens.
export function AuthBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="authGlowA" cx="15%" cy="0%" rx="80%" ry="55%">
            <Stop offset="0" stopColor="#FF7A2F" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#FF7A2F" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="authGlowB" cx="100%" cy="100%" rx="70%" ry="45%">
            <Stop offset="0" stopColor="#FF3D5A" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FF3D5A" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#authGlowA)" />
        <Rect width="100%" height="100%" fill="url(#authGlowB)" />
      </Svg>
    </View>
  );
}

export function BrandMark() {
  return (
    <View style={authStyles.brandRow}>
      <Svg width={56} height={40} viewBox="0 0 56 40">
        <Defs>
          <RadialGradient id="markDisk" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0.3" stopColor="#FFF0D7" stopOpacity="0.95" />
            <Stop offset="0.55" stopColor="#FF9A50" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#FF5A1E" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={28} cy={20} rx={27} ry={8} fill="url(#markDisk)" rotation={-8} origin="28, 20" />
        <Circle cx={28} cy={20} r={11} stroke="#FFD2A0" strokeWidth={1.5} fill="#000" />
      </Svg>
      <Text style={authStyles.brandText}>devfeed</Text>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginLeft: -6,
  },
  brandText: {
    color: '#F1F4FA',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
    marginLeft: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#06080F',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  title: {
    color: '#F1F4FA',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    color: '#8790A6',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: 'rgba(16,19,29,0.85)',
    borderRadius: 26,
    padding: 18,
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
  },
  input: {
    backgroundColor: '#0B0E17',
    color: '#F1F4FA',
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    marginBottom: 12,
    borderColor: '#1F2433',
    borderWidth: 1,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#FF7A2F',
    borderRadius: 26,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  buttonText: {
    color: '#1A0A02',
    fontWeight: '800',
    fontSize: 15,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#1F2433',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#8790A6',
    fontSize: 13,
  },
  socialButton: {
    backgroundColor: '#10131D',
    borderColor: '#1F2433',
    borderWidth: 1,
    borderRadius: 26,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#F1F4FA',
    fontWeight: '700',
    fontSize: 14,
  },
  switchText: {
    color: '#8790A6',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  switchAccent: {
    color: '#FF9A5C',
    fontWeight: '800',
  },
  pendingText: {
    color: '#8790A6',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
});
