'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Link2, Check, ArrowLeft, Trophy, HelpCircle, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiFetch, getResultsUrl } from '../config';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

interface Props {
  code: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ResultsPage: React.FC<Props> = ({ code, navigate, theme, toggleTheme }) => {
  const t = useTranslations('results');
  const [copied, setCopied] = useState(false);
  const query = useQuery({
    queryKey: ['public-results', code],
    queryFn: async () => {
      const res = await apiFetch(`/quiz-scores-public?code=${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('errorTitle'));
      return data;
    },
    refetchInterval: 3000,
  });

  const copyLink = () => {
    navigator.clipboard.writeText(getResultsUrl(code)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = async () => {
    try {
      const res = await apiFetch(`/export-results?code=${code}`);
      if (!res.ok) throw new Error('Gagal mengunduh');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hasil-poll-${code}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (query.error) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={28} />
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">{(query.error as Error).message}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full py-2.5 rounded-lg text-xs">
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center text-xs text-slate-400">{t('loading')}</div>
    );
  }

  const data = query.data;
  const leaderboard: any[] = data.leaderboard || [];
  const stats: any[] = data.question_stats || [];

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate('/')} className="p-1 text-slate-400" aria-label={t('back')}>
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 dark:text-white truncate">{data.title || code}</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {t('title')} · {code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
            title={t('exportResults')}
          >
            <Download size={12} /> {t('exportResults')}
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-bold"
          >
            {copied ? <Check size={12} /> : <Link2 size={12} />} {copied ? t('copied') : t('shareLink')}
          </button>
          <LanguageToggle />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5 animate-fade-in">
        {data.is_quiz && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" /> {t('scoreboard')}
            </h2>
            {leaderboard.length === 0 ? (
              <Empty text={t('noData')} />
            ) : (
              <div className="space-y-2">
                {leaderboard.map((p, i) => (
                  <div
                    key={p.participant_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs ${i === 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800'}`}
                  >
                    <b className="w-7">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</b>
                    <span className="flex-1 font-bold text-slate-800 dark:text-slate-200 truncate">
                      {p.name}
                      <small className="block text-[9px] font-normal text-slate-400">
                        {t('correctLabel')}: {p.correct}/{p.total}
                      </small>
                    </span>
                    <b className="text-slate-900 dark:text-white">{Number(p.points || 0).toLocaleString()}</b>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <HelpCircle size={14} className="text-slate-400" /> {t('questionBreakdown')}
          </h2>
          {stats.length === 0 ? (
            <Empty text={t('noData')} />
          ) : (
            <div className="space-y-5">
              {stats.map((q, qi) => (
                <QuestionStat key={q.question_id} q={q} index={qi} t={t} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const Empty = ({ text }: { text: string }) => (
  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">{text}</p>
);

const QuestionStat = ({ q, index, t }: { q: any; index: number; t: any }) => {
  const max = Math.max(1, ...q.options.map((o: any) => o.count || 0));
  return (
    <div>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
        <span className="text-slate-400 mr-1.5">Q{index + 1}</span>
        {q.title}
        <small className="ml-2 text-[9px] text-slate-400 uppercase">
          {q.total_answers} {t('responses')} {q.has_answer && `· ✓ ${q.correct_count}`}
        </small>
      </p>
      <div className="space-y-1.5">
        {q.options.map((o: any) => {
          const correct = q.correct_answer?.includes(o.label);
          return (
            <div key={o.key} className="flex items-center gap-2">
              <span className="w-5 text-[9px] font-black uppercase">{o.key}</span>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span
                    className={
                      correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                    }
                  >
                    {o.label} {correct && '✓'}
                  </span>
                  <span>{o.count}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${correct ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                    style={{ width: `${Math.round((o.count / max) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
