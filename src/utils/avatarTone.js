const TONES = [
  { bg: '#2A2340', fg: '#C4BAFF' },
  { bg: '#12313A', fg: '#7DE8D8' },
  { bg: '#3A2412', fg: '#FDBA74' },
  { bg: '#1E2A3A', fg: '#8EC5FF' },
  { bg: '#3A1A22', fg: '#FDA4AF' },
  { bg: '#1F3320', fg: '#86EFAC' },
  { bg: '#33301A', fg: '#FDE68A' },
];

// Stable per-name colour so people are easy to tell apart in lists.
export function avatarTone(name) {
  const value = String(name || '?');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}
