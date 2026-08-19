'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize, Minimize, Users, AlertCircle, Layers, ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { API_BASE_URL, apiFetch, getJoinUrl } from '../config';
import type { Session } from '../types';

import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { Fireworks } from './Fireworks';
import { WordCloudVisualizer } from './WordCloudVisualizer';

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
    const res = await apiFetch(`${API_BASE_URL}/get-session?code=${code}`);
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

  const [browsingQId, setBrowsingQId] = useState<string | null>(null);

  const questionsList: any[] = session ? Object.values(session.questions || {}) : [];
  const currentViewQId = browsingQId || session?.active_question_id || questionsList[0]?.id || '';
  const isViewingActive = !browsingQId || browsingQId === session?.active_question_id;
  const currentIdx = questionsList.findIndex((q) => q.id === currentViewQId);

  // Results query with 1s polling
  const fetchResults = async (qId: string) => {
    const res = await apiFetch(`${API_BASE_URL}/results?code=${code}&q=${qId}&t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const resultsQuery = useQuery({
    queryKey: ['results', code, currentViewQId],
    queryFn: () => fetchResults(currentViewQId),
    refetchInterval: 1000,
    enabled: !!currentViewQId,
  });

  const resultsData = resultsQuery.data ?? null;

  // Public quiz leaderboard query (shown after voting closes for quiz questions)
  const showQuizRanking = session?.status === 'closed' && !!session.active_question?.has_answer;

  const fetchRanking = async () => {
    const res = await apiFetch(`${API_BASE_URL}/quiz-scores-public?code=${code}&v=${Math.floor(Date.now() / 5000)}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const rankingQuery = useQuery({
    queryKey: ['quiz-ranking', code],
    queryFn: fetchRanking,
    refetchInterval: 3000,
    enabled: showQuizRanking,
  });

  const ranking = rankingQuery.data?.leaderboard || [];
  const formatPoints = (n: unknown) => Number(n || 0).toLocaleString();

  // Quiz participants who joined (name cards like Kahoot)
  const fetchJoined = async () => {
    const res = await apiFetch(`${API_BASE_URL}/joined-participants?code=${code}`, {
      headers: { 'Cache-Control': 'no-store' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const joinedQuery = useQuery({
    queryKey: ['joined', code],
    queryFn: fetchJoined,
    refetchInterval: 2000,
    enabled: !!session?.is_quiz,
  });

  const joined: { participant_id: string; name: string }[] = joinedQuery.data?.participants || [];

  // Sequential podium reveal: 3rd → 2nd → 1st
  const [revealed, setRevealed] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; size: number }[]>([]);
  const burstIdRef = useRef(0);

  const fireBurst = (size: number) => {
    const id = ++burstIdRef.current;
    setBursts((prev) => [...prev, { id, size }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 2500);
  };

  useEffect(() => {
    if (!showQuizRanking || ranking.length === 0) return;
    setRevealed(0);
    setShowAll(false);
    const t1 = setTimeout(() => setRevealed(1), 300);
    const t2 = setTimeout(() => setRevealed(2), 1300);
    const t3 = setTimeout(() => setRevealed(3), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [showQuizRanking, ranking.length]);

  // Fireworks per winner reveal
  useEffect(() => {
    if (revealed === 0) return;
    fireBurst(revealed === 1 ? 1 : revealed === 2 ? 2 : 3);
  }, [revealed]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.active_question_id, session?.active_question_activated_at, session?.status]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  const queryError = sessionQuery.error as Error | null;
  if (queryError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center animate-scale-in">
          <AlertCircle className="text-red-400 mx-auto mb-4" size={48} />
          <h2 className="text-base font-bold mb-2">{t('error')}</h2>
          <p className="text-xs text-slate-500 mb-6">{queryError.message}</p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary px-6 py-2.5 rounded-lg font-semibold text-xs transition-colors"
          >
            {t('back')}
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

  const activeQuestion = session?.questions?.[currentViewQId] || session?.active_question || null;
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
          {session.pace_mode === 'self_paced' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              📝 Self-Paced
            </span>
          )}
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Users size={14} className="text-slate-400 shrink-0" />
            <span>
              {totalVotes} <span className="hidden sm:inline">{t('responses')}</span>
            </span>
          </div>
          <LanguageToggle />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-4 sm:p-6 md:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center max-w-7xl mx-auto w-full">
        {/* Left Area (Question + Chart) */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 h-full flex flex-col justify-center">
          {showQuizRanking ? (
            <div className="space-y-5 sm:space-y-6">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-center tracking-tight text-slate-900 dark:text-white">
                {t('finalResult')}
              </h2>

              <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl">
                {ranking.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-10">
                    {t('leaderboardEmpty')}
                  </p>
                ) : (
                  <>
                    {/* Podium top 3 */}
                    <div className="flex items-end justify-center gap-2 sm:gap-5 mb-6 sm:mb-8 min-h-[150px] sm:min-h-[200px]">
                      {ranking[1] && (
                        <div
                          className={`flex-1 max-w-[130px] sm:max-w-[170px] ${revealed >= 2 ? 'animate-podium-pop' : 'opacity-0'}`}
                        >
                          <div className="text-center mb-2">
                            <span className="text-2xl sm:text-3xl block mb-1">🥈</span>
                            <p className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              {ranking[1].name}
                            </p>
                            <p className="text-sm sm:text-lg font-black text-slate-700 dark:text-slate-300">
                              {formatPoints(ranking[1].points)}
                            </p>
                          </div>
                          <div className="h-20 sm:h-28 bg-slate-300 dark:bg-slate-700 rounded-t-xl flex items-start justify-center pt-3 sm:pt-4">
                            <span className="text-3xl sm:text-5xl font-black text-slate-600 dark:text-slate-200">
                              2
                            </span>
                          </div>
                        </div>
                      )}
                      {ranking[0] && (
                        <div
                          className={`flex-1 max-w-[150px] sm:max-w-[200px] ${revealed >= 3 ? 'animate-podium-pop' : 'opacity-0'}`}
                        >
                          <div className="text-center mb-2">
                            <span className="text-3xl sm:text-4xl block mb-1">🥇</span>
                            <p className="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">
                              {ranking[0].name}
                            </p>
                            <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400">
                              {formatPoints(ranking[0].points)}
                            </p>
                          </div>
                          <div className="h-28 sm:h-40 bg-amber-400 dark:bg-amber-600 rounded-t-2xl flex items-start justify-center pt-3 sm:pt-5">
                            <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">1</span>
                          </div>
                        </div>
                      )}
                      {ranking[2] && (
                        <div
                          className={`flex-1 max-w-[130px] sm:max-w-[170px] ${revealed >= 1 ? 'animate-podium-pop' : 'opacity-0'}`}
                        >
                          <div className="text-center mb-2">
                            <span className="text-2xl sm:text-3xl block mb-1">🥉</span>
                            <p className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                              {ranking[2].name}
                            </p>
                            <p className="text-sm sm:text-lg font-black text-slate-700 dark:text-slate-300">
                              {formatPoints(ranking[2].points)}
                            </p>
                          </div>
                          <div className="h-16 sm:h-24 bg-orange-400 dark:bg-orange-600 rounded-t-xl flex items-start justify-center pt-3 sm:text-4xl">
                            <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">3</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* See all button */}
                    {revealed >= 3 && ranking.length > 3 && (
                      <button
                        onClick={() => setShowAll((s) => !s)}
                        className="mx-auto flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                      >
                        {t('seeAll')}
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}

                    {/* Rest as table */}
                    {showAll && ranking.length > 3 && (
                      <div className="space-y-2 animate-fade-in mt-4">
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span className="w-10">{t('rank')}</span>
                          <span className="flex-1 ml-3">{t('participant')}</span>
                          <span className="w-20 text-right">{t('score')}</span>
                        </div>
                        {ranking.slice(3).map((item: any, idx: number) => (
                          <div
                            key={item.participant_id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-white/60 dark:bg-slate-900/20 border-slate-200 dark:border-slate-900"
                          >
                            <span className="w-10 text-base font-black text-slate-700 dark:text-slate-300">
                              {idx + 4}
                            </span>
                            <span className="flex-1 ml-3 font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.name}
                              <span className="block text-[10px] sm:text-xs font-normal text-slate-400">
                                {t('correctLabel')}: {item.correct}/{item.total}
                              </span>
                            </span>
                            <span className="w-20 text-right font-black text-xl sm:text-2xl text-slate-900 dark:text-white">
                              {formatPoints(item.points)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : activeQuestion ? (
            <>
              {/* Question Stepper / Browsing bar for presenter */}
              {questionsList.length > 1 && (
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (currentIdx > 0) {
                          setBrowsingQId(questionsList[currentIdx - 1].id);
                        }
                      }}
                      disabled={currentIdx <= 0}
                      className="px-2 py-1 text-xs font-bold rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={t('prevQuestion')}
                    >
                      ← {t('prevQuestion')}
                    </button>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1.5 uppercase tracking-wider">
                      {t('questionNav', { current: currentIdx + 1, total: questionsList.length })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentIdx < questionsList.length - 1) {
                          setBrowsingQId(questionsList[currentIdx + 1].id);
                        }
                      }}
                      disabled={currentIdx >= questionsList.length - 1}
                      className="px-2 py-1 text-xs font-bold rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title={t('nextQuestion')}
                    >
                      {t('nextQuestion')} →
                    </button>
                  </div>

                  {!isViewingActive && (
                    <button
                      type="button"
                      onClick={() => setBrowsingQId(null)}
                      className="text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors animate-pulse flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      {t('backToActive')}
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="inline-block text-[9px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider mb-3">
                  {activeQuestion.type === 'rating'
                    ? t('typeRating')
                    : activeQuestion.type === 'multiple_selection'
                      ? t('typeMultiple')
                      : activeQuestion.type === 'open_text'
                        ? t('typeOpenText')
                        : t('typeSingle')}
                </span>
                {timeLeft !== null && isViewingActive && (
                  <span
                    className={`inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider mb-3 ${timeLeft > 0 ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 animate-pulse' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'}`}
                  >
                    {timeLeft > 0 ? t('timeLeft', { time: timeLeft }) : t('timeUp')}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-2xl md:text-4xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
                {activeQuestion.title}
              </h2>

              <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl">
                <div className="space-y-4 sm:space-y-6">
                  {activeQuestion.type === 'open_text' ? (
                    <WordCloudVisualizer
                      words={resultsData?.words || []}
                      responses={resultsData?.responses || []}
                      totalVotes={totalVotes}
                      isPresentation={true}
                    />
                  ) : activeQuestion.type === 'rating' ? (
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
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                          {t('average')}
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
                              <span className="w-6 sm:w-8 text-right text-xs sm:text-sm font-black text-slate-700 dark:text-slate-400">
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
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-500">
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
              <h2 className="text-base sm:text-xl font-bold text-slate-500 dark:text-slate-500">{t('waiting')}</h2>
            </div>
          )}

          {/* Quiz joined participants (name cards) */}
          {session.is_quiz && joined.length > 0 && (
            <div className="mt-8 sm:mt-10">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                {t('joinedTitle')} · {joined.length}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {joined.map((p) => (
                  <span
                    key={p.participant_id}
                    className="inline-flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-full pl-1.5 pr-2.5 py-1 text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm animate-fade-in"
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-300 font-black shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[120px] sm:max-w-[160px] truncate">{p.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Area (Join instructions) */}
        <div className="lg:col-span-4 h-full flex flex-col justify-center items-center lg:border-l border-slate-200 dark:border-slate-900 lg:pl-8">
          <div className="bg-white/85 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-900 p-6 rounded-2xl text-center max-w-sm w-full flex flex-col items-center">
            <h3 className="font-bold text-sm mb-4 tracking-tight text-slate-700 dark:text-slate-300">
              {t('joinTitle')}
            </h3>
            <div className="bg-white p-4 rounded-xl mb-5 flex items-center justify-center border border-slate-100">
              <QRCodeSVG value={joinUrl} size={150} />
            </div>
            <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
              {t('joinLink')}
            </p>
            <p className="font-mono text-slate-800 dark:text-white text-[11px] font-medium break-all select-all mb-4 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-lg w-full">
              {joinUrl
                ? joinUrl.replace(/^https?:\/\//, '')
                : `${typeof window !== 'undefined' ? window.location.host : ''}/${locale}/join/${code}`}
            </p>
            <div className="w-full border-t border-slate-200 dark:border-slate-900 pt-4">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{t('sessionCode')}</p>
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 rounded-lg w-full">
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

      {/* Winner fireworks */}
      {bursts.map((b) => (
        <Fireworks key={b.id} size={b.size} />
      ))}
    </div>
  );
};
