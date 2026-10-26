// "indi", "12 dəq", "3 saat", "2 gün", then a plain date.
export function timeAgo(value) {
  if (!value) return 'indi';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'indi';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'indi';
  if (minutes < 60) return `${minutes} dəq`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} saat`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / 1440)} gün`;
  return date.toLocaleDateString();
}
