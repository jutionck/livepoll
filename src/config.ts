export const API_BASE_URL = '/api';

// Locale of the current page, derived from the URL path (e.g. /en/join/ABC)
export const getClientLang = (): 'id' | 'en' => {
  if (typeof window === 'undefined') return 'id';
  const m = window.location.pathname.match(/^\/(en|id)(?:\/|$)/);
  return m && m[1] === 'en' ? 'en' : 'id';
};

// Fetch wrapper that tells the API which language to use for error messages
export const apiFetch = (path: string, init?: RequestInit) => {
  const clean = path.replace(/^\/api/, '');
  const sep = clean.includes('?') ? '&' : '?';
  return fetch(`${API_BASE_URL}${clean}${sep}lang=${getClientLang()}`, init);
};

// Generate join URL for participants (path-based with locale)
export const getJoinUrl = (code: string, locale: string = 'id') => {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin;
  return `${base}/${locale}/join/${code}`;
};

// Persistent browser identity for hosts (used to list "my sessions" from the DB)
export const getHostId = (): string => {
  if (typeof window === 'undefined') return '';
  let hostId = localStorage.getItem('host_id');
  if (!hostId) {
    hostId = `h-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('host_id', hostId);
  }
  return hostId;
};

// Optional host account (saves sessions across browsers/devices)
export const getAuthToken = (): string =>
  typeof window === 'undefined' ? '' : localStorage.getItem('host_auth_token') || '';
export const setAuthToken = (token: string) => {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('host_auth_token', token);
  else localStorage.removeItem('host_auth_token');
};
export const getAuthEmail = (): string =>
  typeof window === 'undefined' ? '' : localStorage.getItem('host_auth_email') || '';
export const setAuthEmail = (email: string) => {
  if (typeof window === 'undefined') return;
  if (email) localStorage.setItem('host_auth_email', email);
  else {
    localStorage.removeItem('host_auth_email');
    localStorage.removeItem('host_auth_token');
  }
};
