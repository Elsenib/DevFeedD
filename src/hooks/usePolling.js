import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

// Calls `callback` every `intervalMs` while the screen is focused and the app
// is in the foreground. There is no realtime channel yet, so chats poll.
export default function usePolling(callback, intervalMs, enabled = true) {
  const isFocused = useIsFocused();
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled || !isFocused) return undefined;
    let timer = null;
    const start = () => {
      if (!timer) timer = setInterval(() => saved.current(), intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        saved.current();
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [enabled, isFocused, intervalMs]);
}
