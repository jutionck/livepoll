'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, Plus, Trash2, Star, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL, apiFetch } from '../config';
import { LanguageToggle } from './LanguageToggle';

interface AdminProps {
  navigate: (path: string) => void;
}

interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  message: string;
  rating: number;
  isActive: boolean;
  createdAt: string;
}

export const Admin: React.FC<AdminProps> = ({ navigate }) => {
  const t = useTranslations('admin');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState('');
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [form, setForm] = useState({ name: '', role: '', message: '', rating: 5, isActive: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_token');
    if (saved) {
      setToken(saved);
      setIsAuthed(true);
      loadTestimonials(saved);
    }
  }, []);

  const loadTestimonials = async (tkn: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonials`);
      const data = await res.json();
      if (res.ok) setTestimonials(data.testimonials || []);
    } catch {
      // ignore
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': password,
        },
        body: JSON.stringify({ name: '', message: '' }),
      });
      // If 401, password wrong; else auth ok (or validation error but token valid)
      if (res.status === 401) {
        setError(t('loginError'));
        return;
      }
      setToken(password);
      sessionStorage.setItem('admin_token', password);
      setIsAuthed(true);
      setError('');
      loadTestimonials(password);
    } catch {
      setError(t('genericError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('saveError'));
      setForm({ name: '', role: '', message: '', rating: 5, isActive: true });
      loadTestimonials(token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonials/${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Token': token },
      });
      if (!res.ok) throw new Error(t('deleteError'));
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setToken('');
    setIsAuthed(false);
    setPassword('');
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-dots flex flex-col">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-colors"
            >
              <ArrowLeft size={16} /> {t('back')}
            </button>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white">{t('title')}</h1>
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 max-w-sm w-full mx-auto px-6 flex flex-col justify-center py-12">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-slate-900 dark:text-white">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-slate-500 dark:text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-center mb-2">{t('loginTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">{t('loginDesc')}</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                required
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm py-3 rounded-lg transition-colors"
              >
                Masuk
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dots flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-colors"
          >
            <ArrowLeft size={16} /> {t('backHome')}
          </button>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">{t('manage')}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-semibold transition-colors"
            >
              <LogOut size={14} /> {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Add form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{t('addTitle')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {t('nameLabel')}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Peran/Instansi
                </label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t('messageLabel')}
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 resize-none"
                required
              />
            </div>
            <div className="flex items-center gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, rating: n })}
                      className="p-0.5"
                      aria-label={`${n} star`}
                    >
                      <Star
                        size={20}
                        className={`${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-slate-900"
                />
                Aktif
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={16} /> {saving ? t('saving') : t('saveButton')}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('listTitle', { count: testimonials.length })}
          </h2>
          {testimonials.length === 0 ? (
            <p className="text-xs text-slate-400">{t('empty')}</p>
          ) : (
            testimonials.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.role}</span>
                    <span className="flex gap-0.5 text-amber-400">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-slate-300 hover:text-red-500 p-1.5 shrink-0 transition-colors"
                  aria-label={t('delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
