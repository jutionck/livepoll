export const API_BASE_URL = '/api';

// Generate join URL for participants (path-based with locale)
export const getJoinUrl = (code: string, locale: string = 'id') => {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  return `${base}/${locale}/join/${code}`;
};
