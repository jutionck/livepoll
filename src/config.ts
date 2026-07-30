export const API_BASE_URL = './api';

// Generate join URL for participants
export const getJoinUrl = (code: string) => {
  if (typeof window === 'undefined') return '';
  const base = window.location.origin + window.location.pathname;
  return `${base}#/join/${code}`;
};
