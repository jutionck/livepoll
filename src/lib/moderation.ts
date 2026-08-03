// Content moderation utility to prevent SARA/hate speech abuse

// Curated list of unambiguous hate slurs & strong profanity (Indonesian & English)
// Note: words with legitimate meanings (e.g. "anjing" = dog) are intentionally excluded
// to minimize false positives. Matches are whole-word only.
const OFFENSIVE_TERMS = [
  // Strong ethnic/racial slurs
  'nigga',
  'nigger',
  'chink',
  'spic',
  'kike',
  'keling',
  // Strong Indonesian profanity
  'jancok',
  'asu',
  'kontol',
  'memek',
  'ngentot',
  'bangsat',
  'keparat',
  'kampang',
  'bajingan',
  'goblog',
  'goblok',
  'tolol',
  // Religious hate slurs (contextual, high-confidence)
  'kafirun',
  // Extreme hate phrases (whole phrase)
  'bunuh orang',
  'membunuh orang',
  'bakar rumah',
];

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

export function hasOffensiveContent(...texts: (string | undefined | null)[]): boolean {
  const combined = texts.filter(Boolean).join(' ').toLowerCase();
  if (!combined.trim()) return false;

  const normalized = normalize(combined);
  const words = new Set(normalized.split(/\s+/).filter(Boolean));

  for (const term of OFFENSIVE_TERMS) {
    if (term.includes(' ')) {
      // Phrase match
      if (normalized.includes(term)) return true;
    } else if (words.has(term)) {
      return true;
    }
  }

  return false;
}

export function getModerationError(): string {
  return 'Konten mengandung kata yang dilarang (SARA/kebencian). Mohon gunakan bahasa yang sopan.';
}
