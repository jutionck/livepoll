'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface JoinProps {
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Join: React.FC<JoinProps> = ({ navigate, theme, toggleTheme }) => {
  const [code, setCode] = useState('');
  const t = useTranslations('join');
  const tn = useTranslations('nav');
  const tl = useTranslations('landing');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/join/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-dots flex flex-col justify-between font-sans">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-colors"
          >
            <ArrowLeft size={16} /> {tn('back')}
          </button>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-slate-900 dark:text-white" />
            <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{tn('brand')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-sm w-full mx-auto px-6 flex flex-col justify-center py-12 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm text-slate-900 dark:text-white">
          <h1 className="text-xl font-bold mb-2 text-center">{t('title')}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6 leading-relaxed">{t('subtitle')}</p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder={t('placeholder')}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xl uppercase font-bold text-center tracking-widest focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                maxLength={8}
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {t('button')} <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-center gap-3 px-6 text-[10px] font-semibold text-slate-400">
        <span>
          &copy; {new Date().getFullYear()} {tn('brand')}
        </span>
        <a
          href="https://saweria.co/jutionck"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
        >
          <Heart size={12} />
          <span>{tl('footerSupport')}</span>
        </a>
      </footer>
    </div>
  );
};
