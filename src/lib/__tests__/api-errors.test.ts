import { describe, expect, it } from 'vitest';
import { getLang, msg, err } from '../api-errors';

describe('getLang', () => {
  it('returns "en" when ?lang=en is present', () => {
    const request = new Request('https://example.com/api/foo?lang=en');
    expect(getLang(request)).toBe('en');
  });

  it('defaults to "id" when lang param is absent', () => {
    const request = new Request('https://example.com/api/foo');
    expect(getLang(request)).toBe('id');
  });

  it('defaults to "id" for any value other than "en"', () => {
    const request = new Request('https://example.com/api/foo?lang=fr');
    expect(getLang(request)).toBe('id');
  });
});

describe('msg', () => {
  it('returns the Indonesian message for a known key', () => {
    expect(msg('SESSION_NOT_FOUND', 'id')).toBe('Sesi tidak ditemukan.');
  });

  it('returns the English message for a known key', () => {
    expect(msg('SESSION_NOT_FOUND', 'en')).toBe('Session not found.');
  });

  it('falls back to the key itself for an unknown key', () => {
    expect(msg('SOME_UNKNOWN_KEY', 'en')).toBe('SOME_UNKNOWN_KEY');
  });
});

describe('err', () => {
  it('builds a NextResponse with the right status and error_code', async () => {
    const response = err('VOTING_CLOSED', 400, 'en');
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: 'Voting is closed.', error_code: 'VOTING_CLOSED' });
  });
});
