'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, Users, Star, ArrowLeft, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL } from '../config';

import { ThemeToggle } from './ThemeToggle';

interface JoinSessionProps {
  code: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const JoinSession: React.FC<JoinSessionProps> = ({ code, navigate, theme, toggleTheme }) => {
  const t = useTranslations('participant');
  const tn = useTranslations('nav');
  const [participantId, setParticipantId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    let pId = localStorage.getItem('participant_id');
    if (!pId) {
      pId = `p-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
      localStorage.setItem('participant_id', pId);
    }
    setParticipantId(pId);
  }, []);

  // Session query with 2s polling
  const fetchSession = async () => {
    const response = await fetch(`${API_BASE_URL}/get-session?code=${code}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sesi tidak ditemukan.');
    if (data.title) {
      document.title = `LivePoll | ${data.title} (${code})`;
    }
    return data;
  };

  const sessionQuery = useQuery({
    queryKey: ['session', code],
    queryFn: fetchSession,
    refetchInterval: 2000,
    enabled: !!participantId,
  });

  const session = sessionQuery.data ?? null;
  const error = sessionQuery.error as Error | null;

  // Countdown timer effect
  useEffect(() => {
    if (
      !session ||
      !session.active_question ||
      !session.active_question.timer ||
      !session.active_question_activated_at
    ) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const passed = now - session.active_question_activated_at!;
      return Math.max(0, session.active_question.timer! - passed);
    };

    setTimeLeft(calculateTimeLeft());

    const timerInterval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session?.active_question_id, session?.active_question_activated_at, session?.status]);

  useEffect(() => {
    if (!session || !session.active_question) return;
    const activeQId = session.active_question.id;
    const savedVote = localStorage.getItem(`vote_${code}_${activeQId}`);
    if (savedVote) {
      try {
        const parsed = JSON.parse(savedVote);
        setSelectedVote(parsed.vote);
        setHasVoted(parsed.submitted);
      } catch {
        setSelectedVote(null);
        setHasVoted(false);
      }
    } else {
      setSelectedVote(session.active_question.type === 'multiple_selection' ? [] : null);
      setHasVoted(false);
    }
  }, [session?.active_question_id]);

  const handleSelectionToggle = (optKey: string) => {
    if (hasVoted) return;
    if (session.active_question.type === 'multiple_choice') {
      setSelectedVote(optKey);
    } else if (session.active_question.type === 'multiple_selection') {
      const current = Array.isArray(selectedVote) ? [...selectedVote] : [];
      const idx = current.indexOf(optKey);
      if (idx > -1) current.splice(idx, 1);
      else current.push(optKey);
      setSelectedVote(current);
    }
  };

  const handleRatingChange = (rating: number) => {
    if (hasVoted) return;
    setSelectedVote(rating);
  };

  const handleSubmitVote = async () => {
    if (selectedVote === null || (Array.isArray(selectedVote) && selectedVote.length === 0)) return;
    setSubmitting(true);
    const activeQId = session.active_question.id;
    try {
      const response = await fetch(`${API_BASE_URL}/submit-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, question_id: activeQId, participant_id: participantId, vote: selectedVote }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal.');
      localStorage.setItem(`vote_${code}_${activeQId}`, JSON.stringify({ vote: selectedVote, submitted: true }));
      setHasVoted(true);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm text-slate-900 dark:text-white">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={28} />
          <h2 className="text-sm font-bold mb-1">{t('errorTitle')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{error?.message}</p>
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs py-2.5 rounded-lg"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const activeQuestion = session.active_question;
  const isSessionClosed = session.status === 'closed';
  const isClosed = isSessionClosed || (timeLeft !== null && timeLeft <= 0);

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitModal(true)}
            className="text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors p-1"
            aria-label={t('back')}
            title={t('back')}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[280px]">
              {session.title}
            </h1>
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('session')} {code}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-amber-400' : 'bg-green-500'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {isClosed ? t('closed') : t('votingOpen')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-sm w-full mx-auto p-4 flex flex-col justify-center animate-fade-in">
        {isClosed && !hasVoted ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
            <Clock className="text-slate-400 dark:text-slate-500 mx-auto mb-3" size={28} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('votingClosedTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {timeLeft !== null && timeLeft <= 0 ? t('votingClosedTime') : t('votingClosedWait')}
            </p>
          </div>
        ) : !activeQuestion ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
            <Users className="text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" size={28} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('waitingTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('waitingDesc')}</p>
          </div>
        ) : hasVoted ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
            <CheckCircle className="text-green-500 mx-auto mb-3" size={32} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('votedTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t('votedDesc')}</p>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-left mb-5 text-slate-800 dark:text-slate-200">
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                {t('yourAnswer')}
              </span>
              <div className="font-semibold text-xs">
                {activeQuestion.type === 'rating' ? (
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: selectedVote }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">({selectedVote}/5)</span>
                  </div>
                ) : activeQuestion.type === 'multiple_selection' ? (
                  <div className="flex flex-wrap gap-1">
                    {(selectedVote as string[]).map((v) => (
                      <span
                        key={v}
                        className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-slate-200 dark:border-slate-700"
                      >
                        {v}: {activeQuestion.options[v]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-[10px] uppercase font-bold border border-slate-200 dark:border-slate-700">
                    {selectedVote}: {activeQuestion.options[selectedVote]}
                  </span>
                )}
              </div>
            </div>

            {!isClosed && (
              <button
                onClick={() => setHasVoted(false)}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
              >
                {t('editAnswer')}
              </button>
            )}

            <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                {t('share')}
              </p>
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  const text = `${t('votedTitle')} — LivePoll`;
                  if (navigator.share) {
                    navigator.share({ title: 'LivePoll', text, url }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      const btn = document.getElementById('share-livepoll');
                      if (btn) {
                        btn.textContent = t('shareCopied');
                        setTimeout(() => {
                          btn.textContent = t('share');
                        }, 2000);
                      }
                    });
                  }
                }}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 size={14} />
                <span id="share-livepoll">{t('share')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                {activeQuestion.type === 'rating'
                  ? t('typeRating')
                  : activeQuestion.type === 'multiple_selection'
                    ? t('typeMultiple')
                    : t('typeSingle')}
              </span>
              {timeLeft !== null && timeLeft > 0 && (
                <span className="text-[9px] font-bold bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 px-2 py-0.5 rounded uppercase tracking-wider border border-red-200 dark:border-red-900/50 animate-pulse">
                  {t('timeLeft', { time: timeLeft })}
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-5">
              {activeQuestion.title}
            </h2>

            <div className="space-y-2 mb-5">
              {activeQuestion.type === 'rating' ? (
                <div className="flex items-center justify-center gap-2.5 py-4">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStar = hoverRating ?? selectedVote ?? 0;
                    return (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 transition-transform active:scale-90"
                      >
                        <Star
                          size={36}
                          className={`transition-colors duration-150 ${
                            star <= activeStar ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-800'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                Object.entries(activeQuestion.options).map(([key, label]: [string, any]) => {
                  const isSelected =
                    activeQuestion.type === 'multiple_selection'
                      ? Array.isArray(selectedVote) && selectedVote.includes(key)
                      : selectedVote === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectionToggle(key)}
                      className={`w-full text-left p-3.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-slate-800 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center uppercase shrink-0 border ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-white dark:border-slate-800'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="flex-1 truncate">{label}</span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleSubmitVote}
              disabled={
                submitting || selectedVote === null || (Array.isArray(selectedVote) && selectedVote.length === 0)
              }
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-sm py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? t('sending') : t('submit')}
            </button>
          </div>
        )}
      </main>

      {/* Custom Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-45 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-lg text-left text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">{t('exitTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{t('exitDesc')}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  navigate('/');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                {t('exit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
