import { NextResponse } from 'next/server';

export type Lang = 'id' | 'en';

export const getLang = (request: Request): Lang => {
  try {
    const l = new URL(request.url).searchParams.get('lang');
    return l === 'en' ? 'en' : 'id';
  } catch {
    return 'id';
  }
};

const DICT: Record<string, { id: string; en: string }> = {
  RATE_LIMIT: { id: 'Terlalu banyak permintaan. Coba lagi nanti.', en: 'Too many requests. Try again later.' },
  DATA_INCOMPLETE: { id: 'Data tidak lengkap.', en: 'Incomplete data.' },
  CODE_REQUIRED: { id: 'Kode sesi wajib diisi.', en: 'Session code is required.' },
  SESSION_NOT_FOUND: { id: 'Sesi tidak ditemukan.', en: 'Session not found.' },
  SESSION_NOT_FOUND_OR_EXPIRED: {
    id: 'Sesi tidak ditemukan atau telah kedaluwarsa.',
    en: 'Session not found or has expired.',
  },
  ACCESS_DENIED: { id: 'Akses ditolak. Token host tidak valid.', en: 'Access denied. Invalid host token.' },
  QUESTION_NOT_FOUND: { id: 'Pertanyaan tidak ditemukan.', en: 'Question not found.' },
  VOTING_CLOSED: { id: 'Voting sudah ditutup.', en: 'Voting is closed.' },
  QUESTION_INACTIVE: { id: 'Pertanyaan ini sedang tidak aktif.', en: 'This question is not active.' },
  TIME_EXPIRED: { id: 'Waktu voting telah habis.', en: 'Voting time has ended.' },
  INVALID_ANSWER: { id: 'Jawaban tidak valid.', en: 'Invalid answer.' },
  INVALID_SINGLE_CHOICE: {
    id: 'Jawaban harus berupa pilihan ganda.',
    en: 'The answer must be a single choice.',
  },
  SERVER_ERROR: { id: 'Terjadi kesalahan server.', en: 'Something went wrong.' },
  NAME_MESSAGE_REQUIRED: { id: 'Nama dan pesan wajib diisi.', en: 'Name and message are required.' },
  UNAUTHORIZED: { id: 'Tidak diizinkan.', en: 'Unauthorized.' },
  TESTIMONIAL_NOT_FOUND: { id: 'Testimonial tidak ditemukan.', en: 'Testimonial not found.' },
  MODERATION: {
    id: 'Konten mengandung kata yang dilarang (SARA/kebencian). Mohon gunakan bahasa yang sopan.',
    en: 'Content contains prohibited words (hate speech). Please use polite language.',
  },
  UNIQUE_CODE_FAIL: { id: 'Gagal membuat kode sesi unik.', en: 'Failed to generate a unique session code.' },
  INVALID_EMAIL: { id: 'Format email tidak valid.', en: 'Invalid email format.' },
  PASSWORD_TOO_SHORT: { id: 'Password minimal 6 karakter.', en: 'Password must be at least 6 characters.' },
  EMAIL_EXISTS: { id: 'Email sudah terdaftar. Silakan masuk.', en: 'Email already registered. Please login.' },
  WRONG_CREDENTIALS: { id: 'Email atau password salah.', en: 'Invalid email or password.' },
  HOST_IDENTITY_MISSING: { id: 'Identitas host tidak ditemukan.', en: 'Host identity not found.' },
};

export const msg = (key: string, lang: Lang): string => {
  const entry = DICT[key];
  if (!entry) return key;
  return lang === 'en' ? entry.en : entry.id;
};

export const err = (key: string, status: number, lang: Lang) =>
  NextResponse.json({ error: msg(key, lang), error_code: key }, { status });
