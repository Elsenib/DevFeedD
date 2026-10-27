// Turns a failed API call into a sentence a person can act on. Server messages
// are already written for users; everything else (no connection, timeouts,
// crashes) gets a plain-language fallback instead of axios's English text.
export function errorText(error, fallback = 'Nəsə alınmadı. Bir az sonra yenidən cəhd et.') {
  // Errors the app throws itself (e.g. OAuth) already carry a user-facing message.
  if (error && !error.isAxiosError) return error.message || fallback;
  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
    return 'Server vaxtında cavab vermədi. İnterneti yoxla və yenidən cəhd et.';
  }
  if (!error?.response) return 'İnternet bağlantısı yoxdur. Bağlantını yoxla və yenidən cəhd et.';
  if (error.response.status === 401) return 'Sessiyanın vaxtı bitib. Yenidən daxil ol.';
  if (error.response.status >= 500) return 'Serverdə xəta baş verdi. Bir az sonra yenidən cəhd et.';
  return fallback;
}
