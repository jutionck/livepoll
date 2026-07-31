'use client';

import React, { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Globe } from 'lucide-react';

export const LanguageToggle: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: 'id' | 'en') => {
    if (next === locale || isPending) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className="flex items-center gap-1 p-1 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-800">
      <Globe size={14} className="text-slate-400 ml-1.5 hidden sm:block" />
      <button
        type="button"
        onClick={() => switchLocale('id')}
        className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
          locale === 'id'
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
          locale === 'en'
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
};
