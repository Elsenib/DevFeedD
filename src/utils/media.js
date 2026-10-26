// Older uploads were saved with the OAuth callback path baked into their URL
// (".../auth/oauth/callback/google/uploads/..."); the file itself lives at
// "/uploads/...". Strip that segment so those posts load again.
export function repairUploadUrl(url) {
  if (!url) return url;
  return String(url).replace(/\/auth\/oauth\/callback\/[^/]+(?=\/uploads\/)/i, '');
}
