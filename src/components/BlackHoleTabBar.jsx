import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from './Text';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const BAR_TOP = 26;
const BAR_HEIGHT = 74;
const NAV_HEIGHT = BAR_TOP + BAR_HEIGHT;
const RADIUS = 30;
const EDGE = 1.5;
const BUMP_HEIGHT = 17;
const BUMP_SIGMA = 19;
const SIDE_GAP = 12;

const ACCENT = '#FF9A5C';
const MUTED = '#A9AFBF';

// Slots across the bar; index 2 is the black hole (create action).
const SLOT_FRACTIONS = [0.135, 0.315, 0.5, 0.685, 0.865];
const TABS = [
  { slot: 0, route: 'Feed', label: 'DevFeed', icon: 'home' },
  { slot: 1, route: 'Explore', label: 'Kəşf', icon: 'search' },
  { slot: 3, route: 'Notifications', label: 'Bildirişlər', icon: 'bell' },
  { slot: 4, route: 'Profile', label: 'Profil', icon: 'user' },
];

// Bar outline whose top edge is lifted by a Gaussian bump centred on `cx`,
// so only the part of the rim above the active tab bends upward.
function buildBarPath(width, cx, amplitude) {
  // Keep the outline EDGE px inside the SVG so its stroke is not clipped at the sides.
  const left = EDGE;
  const right = width - EDGE;
  const base = BAR_TOP;
  const bottom = NAV_HEIGHT - EDGE;
  const r = RADIUS;
  const lift = (x) => amplitude * Math.exp(-((x - cx) * (x - cx)) / (2 * BUMP_SIGMA * BUMP_SIGMA));
  const points = [];
  for (let a = 180; a <= 270; a += 10) {
    const t = (a * Math.PI) / 180;
    points.push([left + r + r * Math.cos(t), base + r + r * Math.sin(t)]);
  }
  for (let x = left + r + 4; x < right - r; x += 4) points.push([x, base]);
  for (let a = 270; a <= 360; a += 10) {
    const t = (a * Math.PI) / 180;
    points.push([right - r + r * Math.cos(t), base + r + r * Math.sin(t)]);
  }
  const top = points.map(([x, y]) => `${x.toFixed(1)} ${(y - lift(x)).toFixed(1)}`).join(' L');
  return `M${top} L${right} ${bottom - r} A${r} ${r} 0 0 1 ${right - r} ${bottom} H${left + r} A${r} ${r} 0 0 1 ${left} ${bottom - r} Z`;
}

const easeOutBack = (p) => {
  const c1 = 1.1;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduce);
    return () => sub?.remove?.();
  }, []);
  return reduce;
}

// Animates the bump's position and height towards the active slot.
function useWarp(targetX, targetAmp, reduceMotion) {
  const [warp, setWarp] = useState({ x: targetX, amp: targetAmp });
  const current = useRef(warp);
  current.current = warp;

  useEffect(() => {
    const from = current.current;
    if (reduceMotion || (from.x === targetX && from.amp === targetAmp)) {
      setWarp({ x: targetX, amp: targetAmp });
      return undefined;
    }
    let frame;
    const start = Date.now();
    const duration = 520;
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const e = easeOutBack(p);
      setWarp({ x: from.x + (targetX - from.x) * e, amp: from.amp + (targetAmp - from.amp) * Math.min(e, 1.15) });
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targetX, targetAmp, reduceMotion]);

  return warp;
}

function BlackHoleButton({ active, onPress, reduceMotion }) {
  const spin = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    spin.stopAnimation();
    if (reduceMotion) return undefined;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: active ? 2400 : 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, spin]);

  useEffect(() => {
    Animated.spring(lift, { toValue: active ? 1 : 0, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [active, lift]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Yeni paylaşım"
      style={styles.blackHoleHit}
      hitSlop={8}
    >
      <Animated.View pointerEvents="none" style={[styles.blackHole, { transform: [{ translateY }, { scale }] }]}>
        <Svg width={180} height={120} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bhGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#FF7828" stopOpacity={active ? 0.8 : 0.45} />
              <Stop offset="1" stopColor="#FF7828" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={90} cy={60} rx={72} ry={50} fill="url(#bhGlow)" />
        </Svg>

        <View style={styles.swirlFrame} pointerEvents="none">
          <Animated.View style={[styles.swirl, { transform: [{ rotate }] }]}>
            <Svg width={140} height={140}>
              <Defs>
                <LinearGradient id="swirlGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFB46E" stopOpacity="0.7" />
                  <Stop offset="0.5" stopColor="#FF5A1E" stopOpacity="0.05" />
                  <Stop offset="1" stopColor="#FFC88C" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Circle cx={70} cy={70} r={48} stroke="url(#swirlGrad)" strokeWidth={20} fill="none" strokeDasharray="60 34 42 50" />
            </Svg>
          </Animated.View>
        </View>

        <Svg width={180} height={120} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="diskGrad" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0.3" stopColor="#FFF0D7" stopOpacity="0.98" />
              <Stop offset="0.46" stopColor="#FFAF64" stopOpacity="0.85" />
              <Stop offset="0.68" stopColor="#FF6923" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#FF5A1E" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="diskLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFC88C" stopOpacity="0" />
              <Stop offset="0.3" stopColor="#FFF0DC" stopOpacity="0.95" />
              <Stop offset="0.7" stopColor="#FFF0DC" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#FFC88C" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <G rotation={-8} origin="90, 60">
            <Ellipse cx={90} cy={60} rx={72} ry={21} fill="url(#diskGrad)" />
            <Ellipse cx={90} cy={60} rx={64} ry={1.5} fill="url(#diskLine)" />
            <Path d="M59.5 54.6 A31 31 0 0 1 120.5 54.6" stroke="#FFE4C3" strokeOpacity={0.95} strokeWidth={2.5} fill="none" />
            <Path d="M61 66 A30 30 0 0 0 119 66" stroke="#FFBE82" strokeOpacity={0.45} strokeWidth={1.5} fill="none" />
          </G>
          <Circle cx={90} cy={60} r={30} stroke="#FF6E28" strokeOpacity={0.35} strokeWidth={6} fill="none" />
          <Circle cx={90} cy={60} r={28} stroke="#FFD2A0" strokeOpacity={0.9} strokeWidth={1.5} fill="none" />
          <Circle cx={90} cy={60} r={27} fill="#000000" />
        </Svg>

        <MaterialIcons name="add" size={22} color="rgba(255,236,214,0.92)" />
      </Animated.View>
    </Pressable>
  );
}

export default function BlackHoleTabBar({ state, navigation, unreadCount = 0 }) {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const width = screenWidth - SIDE_GAP * 2;
  const centers = SLOT_FRACTIONS.map((f) => f * width);

  const [createActive, setCreateActive] = useState(false);
  const currentRoute = state.routes[state.index]?.name;
  const activeTab = TABS.find((tab) => tab.route === currentRoute);
  const activeSlot = createActive ? 2 : activeTab ? activeTab.slot : null;

  useEffect(() => {
    setCreateActive(false);
  }, [currentRoute]);

  const warp = useWarp(activeSlot === null ? width / 2 : centers[activeSlot], activeSlot === null ? 0 : BUMP_HEIGHT, reduceMotion);
  const barPath = buildBarPath(width, warp.x, warp.amp);
  const rimStop = (offset) => Math.min(0.99, Math.max(0.01, offset / width));

  // Messages and the public chat have their own composer at the bottom;
  // the floating bar would cover it, so it is hidden there.
  if (!activeTab && !createActive) return null;

  const openCreate = () => {
    setCreateActive(true);
    navigation.navigate('Feed', { compose: Date.now() });
    // Let the warp settle on the black hole, then fall back to the current tab.
    setTimeout(() => setCreateActive(false), 900);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6, width }]}>
      <Svg width={width} height={NAV_HEIGHT} style={styles.svg} pointerEvents="none">
        <Defs>
          <RadialGradient id="bumpGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FF7828" stopOpacity={0.42 * (warp.amp / BUMP_HEIGHT || 0)} />
            <Stop offset="1" stopColor="#FF7828" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="well" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FF6E28" stopOpacity="0.24" />
            <Stop offset="1" stopColor="#FF6E28" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="rim" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FF9650" stopOpacity="0.15" />
            <Stop offset={rimStop(warp.x - 70)} stopColor="#FF9650" stopOpacity="0.25" />
            <Stop offset={rimStop(warp.x)} stopColor="#FFD7AA" stopOpacity={0.25 + 0.75 * (warp.amp / BUMP_HEIGHT || 0)} />
            <Stop offset={rimStop(warp.x + 70)} stopColor="#FF9650" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#FF9650" stopOpacity="0.15" />
          </LinearGradient>
          <ClipPath id="barBase">
            <Rect x={0} y={BAR_TOP} width={width} height={BAR_HEIGHT} rx={RADIUS} />
          </ClipPath>
        </Defs>
        <Ellipse cx={warp.x} cy={BAR_TOP + 8} rx={65} ry={40} fill="url(#bumpGlow)" />
        <Path d={barPath} fill="#07080C" stroke="#FF8C46" strokeOpacity={0.28} strokeWidth={1} />
        <G clipPath="url(#barBase)">
          <Ellipse cx={width / 2} cy={BAR_TOP + 37} rx={width / 2} ry={60} fill="url(#well)" />
          <Ellipse cx={width / 2} cy={BAR_TOP + 37} rx={110} ry={32} fill="none" stroke="#FF8C46" strokeOpacity={0.22} />
          <Ellipse cx={width / 2} cy={BAR_TOP + 37} rx={150} ry={46} fill="none" stroke="#FF8C46" strokeOpacity={0.13} />
          <Ellipse cx={width / 2} cy={BAR_TOP + 37} rx={200} ry={65} fill="none" stroke="#FF8C46" strokeOpacity={0.07} />
        </G>
        <Path d={barPath} fill="none" stroke="url(#rim)" strokeWidth={1.4} />
      </Svg>

      <View pointerEvents="box-none" style={[styles.blackHoleSlot, { left: centers[2] - 90 }]}>
        <BlackHoleButton active={activeSlot === 2} onPress={openCreate} reduceMotion={reduceMotion} />
      </View>

      {TABS.map((tab) => {
        const focused = activeSlot === tab.slot;
        const color = focused ? ACCENT : MUTED;
        return (
          <Pressable
            key={tab.route}
            onPress={() => {
              setCreateActive(false);
              if (currentRoute !== tab.route) navigation.navigate(tab.route);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.route === 'Notifications' && unreadCount ? `${tab.label}, ${unreadCount} yeni` : tab.label}
            style={[styles.tab, { left: centers[tab.slot] - 30, transform: [{ translateY: focused ? -7 : 0 }] }]}
          >
            <View>
              <Feather name={tab.icon} size={22} color={color} style={focused ? styles.iconGlow : null} />
              {tab.route === 'Notifications' && unreadCount > 0 && <View style={styles.dot} />}
            </View>
            <Text style={[styles.label, { color, fontWeight: focused ? '800' : '600' }]} numberOfLines={1}>{tab.label}</Text>
          </Pressable>
        );
      })}

    </View>
  );
}

export const TAB_BAR_SPACE = NAV_HEIGHT + 24;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SIDE_GAP,
    height: NAV_HEIGHT,
  },
  svg: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  tab: {
    position: 'absolute',
    top: BAR_TOP + 9,
    width: 60,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 3,
    fontSize: 10.5,
  },
  iconGlow: {
    textShadowColor: 'rgba(255,122,47,0.85)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF5A2A',
  },
  blackHoleSlot: {
    position: 'absolute',
    top: BAR_TOP + 37 - 60,
    width: 180,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackHoleHit: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blackHole: {
    width: 180,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swirlFrame: {
    position: 'absolute',
    left: 20,
    top: -10,
    width: 140,
    height: 140,
    transform: [{ rotate: '-8deg' }, { scaleY: 0.3 }],
  },
  swirl: {
    width: 140,
    height: 140,
  },
});
