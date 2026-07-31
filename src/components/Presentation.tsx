'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize, Minimize, Users, AlertCircle, Layers } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { API_BASE_URL, getJoinUrl } from '../config';
import type { Session } from '../types';

import { ThemeToggle } from './ThemeToggle';

interface PresentationProps {
  code: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Presentation: React.FC<PresentationProps> = ({ code, navigate, theme, toggleTheme }) => {
  const locale = useLocale();
  const t = useTranslations('presentation');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Session query with 2s polling
  const fetchSession = async (): Promise<Session> => {
    const res = await fetch(`${API_BASE_URL}/get-session?code=${code}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyambung.');
    if (data.title) {
      document.title = `LivePoll Presentasi | ${data.title} (${code})`;
    }
    return data;
  };

  const sessionQuery = useQuery({
    queryKey: ['session', code],
    queryFn: fetchSession,
    refetchInterval: 2000,
  });

  const session = sessionQuery.data ?? null;

  // Results query with 1s polling
  const fetchResults = async (qId: string) => {
    const res = await fetch(`${API_BASE_URL}/results?code=${code}&q=${qId}&t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const resultsQuery = useQuery({
    queryKey: ['results', code, session?.active_question_id],
    queryFn: () => fetchResults(session!.active_question_id),
    refetchInterval: 1000,
    enabled: !!session?.active_question_id,
  });

  const resultsData = resultsQuery.data ?? null;

  // Fullscreen listener
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!session) {
      setTimeLeft(null);
      return;
    }
    const activeQ = session.active_question;
    const activatedAt = session.active_question_activated_at;
    if (!activeQ || !activeQ.timer || !activatedAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const passed = now - activatedAt;
      return Math.max(0, activeQ.timer! - passed);
    };

    setTimeLeft(calculateTimeLeft());

    const timerInterval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session?.active_question_id, session?.active_question_activated_at, session?.status]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const queryError = sessionQuery.error as Error | null;
  if (queryError) {
    return (
      <div className="min-h-screen bg-slate-955 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center animate-scale-in">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-base font-bold mb-2">{t('error')}</h2>
          <p className="text-xs text-slate-450 mb-6">{queryError.message}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-6 py-2.5 rounded-lg font-semibold text-xs transition-colors"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dots dark:bg-dots-dark text-slate-900 dark:text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-slate-400 dark:border-slate-700 border-t-slate-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-500 font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const activeQuestion = session.active_question;
  const joinUrl = getJoinUrl(code, locale);
  const totalVotes = resultsData?.total_votes || 0;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-dots dark:bg-dots-dark text-slate-900 dark:text-white flex flex-col justify-between font-sans select-none"
    >
      {/* Top Header */}
      <header className="bg-white/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Layers size={18} className="text-slate-900 dark:text-white shrink-0" />
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {session.title}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Users size={14} className="text-slate-400 shrink-0" />
            <span>
              {totalVotes} <span className="hidden sm:inline">{t('responses')}</span>
            </span>
          </div>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-4 sm:p-6 md:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center max-w-7xl mx-auto w-full">
        {/* Left Area (Question + Chart) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 h-full flex flex-col justify-center">
          {activeQuestion ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider mb-3">
                  {activeQuestion.type === 'rating'
                    ? 'Rating 1-5'
                    : activeQuestion.type === 'multiple_selection'
                      ? 'Pilihan Ganda'
                      : 'Pilihan Tunggal'}
                </span>
                {timeLeft !== null && (
                  <span
                    className={`inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider mb-3 ${timeLeft > 0 ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}
                  >
                    {timeLeft > 0 ? `${timeLeft}s` : 'Waktu Habis'}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
                {activeQuestion.title}
              </h2>

              <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl">
                <div className="space-y-4 sm:space-y-6">
                  {activeQuestion.type === 'rating' ? (
                    <div className="flex flex-col md:flex-row items-center justify-around gap-6 sm:gap-8">
                      <div className="text-center md:border-r border-slate-200 dark:border-slate-800 md:pr-12 py-3">
                        <p className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white">
                          {resultsData?.average_rating || 0}
                        </p>
                        <div className="flex justify-center gap-0.5 my-2 text-slate-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-xl sm:text-2xl ${s <= Math.round(resultsData?.average_rating || 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-800'}`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                          Rata-rata
                        </p>
                      </div>

                      <div className="flex-1 w-full space-y-2 sm:space-y-2.5">
                        {[5, 4, 3, 2, 1].map((r) => {
                          const count = resultsData?.results?.[r] || 0;
                          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                          return (
                            <div key={r} className="flex items-center gap-2 sm:gap-4">
                              <span className="w-10 sm:w-12 text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 text-right flex items-center justify-end gap-1">
                                {r} ★
                              </span>
                              <div className="flex-1 h-3 sm:h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-400 dark:bg-slate-500 rounded-full bar-animate"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                              <span className="w-6 sm:w-8 text-right text-xs sm:text-sm font-black text-slate-700 dark:text-slate-350">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-5">
                      {Object.entries(activeQuestion.options || {}).map(([key, label]) => {
                        const count = resultsData?.results?.[key] || 0;
                        const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                        return (
                          <div key={key} className="space-y-1 sm:space-y-1.5">
                            <div className="flex justify-between items-end gap-2">
                              <span className="text-sm sm:text-base font-bold flex items-center text-slate-800 dark:text-slate-200 truncate">
                                <span className="inline-flex w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white text-[9px] sm:text-[10px] font-black items-center justify-center mr-2 uppercase shrink-0 border border-slate-300 dark:border-slate-700">
                                  {key}
                                </span>
                                <span className="truncate">{label as string}</span>
                              </span>
                              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white ml-2 shrink-0">
                                {count}{' '}
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-450 dark:text-slate-500">
                                  ({Math.round(pct)}%)
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-3 sm:h-4 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-900 dark:bg-white rounded-full bar-animate"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <h2 className="text-base sm:text-xl font-bold text-slate-450 dark:text-slate-500">{t('waiting')}</h2>
            </div>
          )}
        </div>

        {/* Right Area (Join instructions) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center lg:border-l border-slate-200 dark:border-slate-900 lg:pl-8">
          <div className="bg-white/85 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-6 rounded-2xl text-center max-w-sm w-full flex flex-col items-center">
            <h3 className="font-bold text-sm mb-4 tracking-tight text-slate-700 dark:text-slate-300">
              Bergabung Polling
            </h3>
            <div className="bg-white p-4 rounded-xl mb-5 flex items-center justify-center border border-slate-100">
              <QRCodeSVG value={joinUrl} size={150} />
            </div>
            <p className="text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              Link Bergabung
            </p>
            <p className="font-mono text-slate-800 dark:text-white text-[11px] font-medium break-all select-all mb-4 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-lg w-full">
              {window.location.host + window.location.pathname}
            </p>
            <div className="w-full border-t border-slate-200 dark:border-slate-900 pt-4">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('sessionCode')}</p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 py-2 rounded-lg w-full">
                <p className="text-2xl font-bold tracking-widest text-slate-800 dark:text-white select-all">{code}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[9px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-wider border-t border-slate-200 dark:border-slate-900">
        LivePoll Presenter
      </footer>
    </div>
  );
};
