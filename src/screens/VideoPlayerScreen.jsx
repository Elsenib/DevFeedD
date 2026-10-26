import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEEK_STEP_MS = 10000;

function formatClock(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function VideoPlayerScreen({ route, navigation }) {
  const { uri, authorName, authorAvatar, caption } = route.params || {};
  const videoRef = useRef(null);
  const [status, setStatus] = useState({ isLoaded: false });
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);
  const [scrubMs, setScrubMs] = useState(null);
  const hideTimer = useRef(null);

  const duration = status.isLoaded ? status.durationMillis || 0 : 0;
  const position = scrubMs ?? (status.isLoaded ? status.positionMillis || 0 : 0);
  const progress = duration ? Math.min(1, position / duration) : 0;

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2600);
  }, []);

  useEffect(() => {
    scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [scheduleHide]);

  const showControls = () => {
    setControlsVisible(true);
    if (playing) scheduleHide();
  };

  const togglePlay = async () => {
    const next = !playing;
    setPlaying(next);
    setControlsVisible(true);
    if (next) scheduleHide();
    else clearTimeout(hideTimer.current);
    try {
      if (next) await videoRef.current?.playAsync();
      else await videoRef.current?.pauseAsync();
    } catch (error) {
      // The native view may still be attaching; shouldPlay keeps state in sync.
    }
  };

  const seekTo = async (ms) => {
    const target = Math.max(0, Math.min(duration || 0, ms));
    try {
      await videoRef.current?.setPositionAsync(target);
    } catch (error) {
      // Seeking before the video loads is a no-op.
    }
  };

  const seekBy = (delta) => {
    showControls();
    seekTo(position + delta);
  };

  const msFromTouch = (x) => (trackWidth ? Math.max(0, Math.min(1, x / trackWidth)) * duration : 0);

  return (
    <View style={styles.container}>
      <Pressable style={StyleSheet.absoluteFill} onPress={controlsVisible ? togglePlay : showControls} accessibilityLabel={playing ? 'Dayandır' : 'Oynat'}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          videoStyle={styles.videoFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={playing}
          isMuted={muted}
          isLooping
          onPlaybackStatusUpdate={setStatus}
        />
      </Pressable>

      {!status.isLoaded && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#FF7A2F" />
        </View>
      )}

      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="playerScrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.5" />
            <Stop offset="0.18" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.62" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.75" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#playerScrim)" />
      </Svg>

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.roundButton} onPress={() => navigation.goBack()} accessibilityLabel="Geri">
            <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.roundButton} onPress={() => { setMuted((value) => !value); showControls(); }} accessibilityLabel={muted ? 'Səsi aç' : 'Səsi bağla'}>
            <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={21} color="#ffffff" />
          </Pressable>
        </View>

        {(controlsVisible || !playing) && (
          <View style={styles.centerControls} pointerEvents="box-none">
            <Pressable style={styles.seekButton} onPress={() => seekBy(-SEEK_STEP_MS)} accessibilityLabel="10 saniyə geri">
              <MaterialIcons name="replay-10" size={28} color="#ffffff" />
            </Pressable>
            <Pressable style={styles.playButton} onPress={togglePlay} accessibilityLabel={playing ? 'Dayandır' : 'Oynat'}>
              <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={40} color="#1A0A02" />
            </Pressable>
            <Pressable style={styles.seekButton} onPress={() => seekBy(SEEK_STEP_MS)} accessibilityLabel="10 saniyə irəli">
              <MaterialIcons name="forward-10" size={28} color="#ffffff" />
            </Pressable>
          </View>
        )}

        <View style={styles.bottom} pointerEvents="box-none">
          {!!authorName && (
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(authorName).slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
            </View>
          )}
          {!!caption && <Text style={styles.caption} numberOfLines={3}>{caption}</Text>}

          <View
            style={styles.trackHit}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => { showControls(); setScrubMs(msFromTouch(event.nativeEvent.locationX)); }}
            onResponderMove={(event) => setScrubMs(msFromTouch(event.nativeEvent.locationX))}
            onResponderRelease={async () => {
              if (scrubMs !== null) await seekTo(scrubMs);
              setScrubMs(null);
            }}
            accessibilityRole="adjustable"
            accessibilityLabel="Videonun vaxtı"
            accessibilityValue={{ text: `${formatClock(position)} / ${formatClock(duration)}` }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => seekBy(event.nativeEvent.actionName === 'increment' ? SEEK_STEP_MS : -SEEK_STEP_MS)}
          >
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
            </View>
            <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatClock(position)}</Text>
            <Text style={styles.time}>{formatClock(duration)}</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  seekButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF7A2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A2F',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF7A2F',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#1A0A02',
    fontWeight: '800',
  },
  authorName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  caption: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  trackHit: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    backgroundColor: '#FF7A2F',
  },
  thumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    backgroundColor: '#FF9A5C',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
});
