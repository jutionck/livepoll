'use client';

import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, UserCheck, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL, apiFetch, getAuthToken, setAuthToken, getAuthEmail, setAuthEmail, getHostId } from '../config';

interface HostAuthProps {
  compact?: boolean;
  onAuthChange?: (account: { id: string; email: string } | null) => void;
}

export const HostAuth: React.FC<HostAuthProps> = ({ compact = false, onAuthChange }) => {
  const t = useTranslations('hostAuth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    apiFetch(`${API_BASE_URL}/host-auth/me`, { headers: { 'X-Host-Account-Token': token } })
      .then((r) => r.json())
      .then((d) => {
        if (d.account) {
          setAccount(d.account);
          setAuthEmail(d.account.email);
          claimGuestSessions(token).then(() => onAuthChange?.(d.account));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach guest sessions from this browser to the account
  const claimGuestSessions = async (token: string) => {
    try {
      await apiFetch(`${API_BASE_URL}/host-auth/claim`, {
        method: 'POST',
        headers: {
          'X-Host-Id': getHostId(),
          'X-Host-Account-Token': token,
        },
      });
    } catch {
      // silent
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/host-auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal.');
      setAuthToken(data.token);
      setAuthEmail(data.account.email);
      setAccount(data.account);
      setPassword('');
      await claimGuestSessions(data.token);
      onAuthChange?.(data.account);
    } catch (err: any) {
      setError(err.message || t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthEmail('');
    setAccount(null);
    onAuthChange?.(null);
  };

  if (account) {
    return (
      <div className="flex items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 min-w-0">
          <UserCheck size={14} className="shrink-0" />
          <span className="truncate">{account.email}</span>
        </span>
        <button
          onClick={logout}
          className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut size={12} /> {t('logout')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 ${compact ? '' : 'p-4'}`}
    >
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
        {t('title')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
        />
        <div className="flex gap-1.5">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
            {mode === 'login' ? t('login') : t('register')}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          {mode === 'login' ? t('noAccount') : t('hasAccount')}
        </button>
        {error && <span className="text-[10px] font-semibold text-red-500">{error}</span>}
      </div>
    </form>
  );
};
