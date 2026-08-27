'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Star,
  ArrowLeft,
  Share2,
  MessageCircle,
  Send,
  Link2,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { API_BASE_URL, apiFetch } from '../config';

import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';

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
  const [participantName, setParticipantName] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nameDone, setNameDone] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`name_done_${code}`) === '1' : false,
  );
  const [nameError, setNameError] = useState(false);

  const [selfPacedIndex, setSelfPacedIndex] = useState(0);
  const [isSelfPacedCompleted, setIsSelfPacedCompleted] = useState(false);

  const [testimonialDone, setTestimonialDone] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`participant_testimonial_done_${code}`) === '1' : false,
  );
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialMsg, setTestimonialMsg] = useState('');
  const [testimonialSending, setTestimonialSending] = useState(false);
  const [testimonialSent, setTestimonialSent] = useState(false);

  const notifyJoin = async (name?: string) => {
    try {
      await apiFetch(`${API_BASE_URL}/join-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          participant_id: participantId || localStorage.getItem('participant_id'),
          participant_name: name,
        }),
      });
    } catch {
      // silent
    }
  };

  useEffect(() => {
    let pId = localStorage.getItem('participant_id');
    if (!pId) {
      pId = `p-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`;
      localStorage.setItem('participant_id', pId);
    }
    setParticipantId(pId);
    const savedName = localStorage.getItem('participant_name') || '';
    if (savedName) setParticipantName(savedName);
    notifyJoin(savedName || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitName = () => {
    const trimmed = participantName.trim();
    if (trimmed) {
      localStorage.setItem('participant_name', trimmed);
    }
    localStorage.setItem(`name_done_${code}`, '1');
    setNameDone(true);
    notifyJoin(trimmed || undefined);
  };

  const handleSkipName = () => {
    localStorage.setItem(`name_done_${code}`, '1');
    setNameDone(true);
    notifyJoin(undefined);
  };

  // Session query with 2s polling
  const fetchSession = async () => {
    const response = await apiFetch(`${API_BASE_URL}/get-session?code=${code}`);
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

  const isSelfPaced = session?.pace_mode === 'self_paced';
  const questionsList: any[] = isSelfPaced ? Object.values(session?.questions || {}) : [];
  const activeQuestion = isSelfPaced ? questionsList[selfPacedIndex] || null : session?.active_question || null;

  // Check self-paced completion state
  useEffect(() => {
    if (isSelfPaced && typeof window !== 'undefined' && session) {
      const done = localStorage.getItem(`self_paced_done_${code}_${session.version}`) === '1';
      setIsSelfPacedCompleted(done);
    }
  }, [isSelfPaced, code, session]);

  // Countdown timer effect (only in presenter mode)
  useEffect(() => {
    if (
      isSelfPaced ||
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfPaced, session?.active_question_id, session?.active_question_activated_at, session?.status]);

  useEffect(() => {
    if (!session || !activeQuestion) return;
    const qId = activeQuestion.id;
    const savedVote = localStorage.getItem(`vote_${code}_${qId}`);
    if (savedVote) {
      try {
        const parsed = JSON.parse(savedVote);
        const fresh = parsed.version !== session.version;
        if (!fresh) {
          setSelectedVote(parsed.vote);
          setHasVoted(parsed.submitted);
        } else {
          setSelectedVote(activeQuestion.type === 'multiple_selection' ? [] : null);
          setHasVoted(false);
        }
      } catch {
        setSelectedVote(null);
        setHasVoted(false);
      }
    } else {
      setSelectedVote(activeQuestion.type === 'multiple_selection' ? [] : null);
      setHasVoted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion?.id, isSelfPaced, selfPacedIndex, session?.version]);

  const handleSelectionToggle = (optKey: string) => {
    if (!isSelfPaced && hasVoted) return;
    if (!activeQuestion) return;

    if (activeQuestion.type === 'multiple_choice') {
      setSelectedVote(optKey);
    } else if (activeQuestion.type === 'multiple_selection') {
      const current = Array.isArray(selectedVote) ? [...selectedVote] : [];
      const idx = current.indexOf(optKey);
      if (idx > -1) current.splice(idx, 1);
      else current.push(optKey);
      setSelectedVote(current);
    }
  };

  const handleRatingChange = (rating: number) => {
    if (!isSelfPaced && hasVoted) return;
    setSelectedVote(rating);
  };

  const handleOpenTextChange = (text: string) => {
    if (!isSelfPaced && hasVoted) return;
    setSelectedVote(text);
  };

  const handleSubmitVote = async () => {
    if (
      !activeQuestion ||
      selectedVote === null ||
      (typeof selectedVote === 'string' && !selectedVote.trim()) ||
      (Array.isArray(selectedVote) && selectedVote.length === 0)
    )
      return;
    setSubmitting(true);
    const activeQId = activeQuestion.id;
    try {
      const response = await apiFetch(`${API_BASE_URL}/submit-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          question_id: activeQId,
          participant_id: participantId,
          participant_name: participantName.trim() || undefined,
          vote: selectedVote,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal.');
      localStorage.setItem(
        `vote_${code}_${activeQId}`,
        JSON.stringify({ vote: selectedVote, submitted: true, version: session?.version }),
      );
      setHasVoted(true);
    } catch (err: any) {
      alert(err.message || t('sendError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfPacedNext = async () => {
    if (submitting || !activeQuestion) return;

    if (selectedVote !== null && (!Array.isArray(selectedVote) || selectedVote.length > 0)) {
      setSubmitting(true);
      try {
        await apiFetch(`${API_BASE_URL}/submit-vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            question_id: activeQuestion.id,
            participant_id: participantId,
            participant_name: participantName.trim() || undefined,
            vote: selectedVote,
          }),
        });
        localStorage.setItem(
          `vote_${code}_${activeQuestion.id}`,
          JSON.stringify({ vote: selectedVote, submitted: true, version: session?.version }),
        );
        setHasVoted(true);
      } catch (err: any) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }

    if (selfPacedIndex >= questionsList.length - 1) {
      if (session) {
        localStorage.setItem(`self_paced_done_${code}_${session.version}`, '1');
      }
      setIsSelfPacedCompleted(true);
    } else {
      setSelfPacedIndex((prev) => prev + 1);
    }
  };

  const handleSelfPacedPrev = () => {
    if (selfPacedIndex > 0) {
      setSelfPacedIndex((prev) => prev - 1);
    }
  };

  const handleSkipTestimonial = () => {
    localStorage.setItem(`participant_testimonial_done_${code}`, '1');
    setTestimonialDone(true);
  };

  const handleSubmitTestimonial = async () => {
    if (!testimonialMsg.trim()) return;
    setTestimonialSending(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/testimonial-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: participantName.trim() || t('badge'),
          role: session?.title || '',
          message: testimonialMsg.trim(),
          rating: testimonialRating,
          code,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal.');
      localStorage.setItem(`participant_testimonial_done_${code}`, '1');
      setTestimonialDone(true);
      setTestimonialSent(true);
    } catch (err: any) {
      alert(err.message || t('sendError'));
    } finally {
      setTestimonialSending(false);
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
            {t('back')}
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

  const isSessionClosed = session.status === 'closed';
  // "Closed" only counts when a question was actually shown; a session created
  // with "start later" (closed, no active question) should show the waiting state.
  const isClosed = isSessionClosed ? !!activeQuestion : timeLeft !== null && timeLeft <= 0;
  const needsName = !nameDone && !hasVoted;
  // Self-paced sessions created with "start later" are also "closed" but never activated yet;
  // that's "not started", not "closed after voting" — same distinction as isClosed above.
  const selfPacedNotStarted = isSelfPaced && isSessionClosed && !session.active_question_activated_at;

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExitModal(true)}
            className="text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors p-1"
            aria-label={tn('back')}
            title={tn('back')}
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
          <LanguageToggle />
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isClosed ? 'bg-amber-400' : session.status === 'closed' ? 'bg-slate-400' : 'bg-green-500'}`}
            ></span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {isClosed ? t('closed') : session.status === 'closed' ? t('waitingShort') : t('votingOpen')}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-sm w-full mx-auto p-4 flex flex-col justify-center animate-fade-in">
        {needsName ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm animate-fade-in">
            {session.is_quiz && (
              <span className="inline-block text-[9px] font-bold bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider mb-3">
                QUIZ
              </span>
            )}
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('nameTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {session.is_quiz ? t('nameDescQuiz') : t('nameDesc')}
            </p>

            <input
              type="text"
              value={participantName}
              onChange={(e) => {
                setParticipantName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitName();
              }}
              placeholder={t('namePlaceholder')}
              maxLength={80}
              autoFocus
              className="w-full px-3.5 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors"
            />

            <button
              onClick={handleSubmitName}
              className="w-full mt-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm py-3 rounded-lg transition-colors"
            >
              {session.is_quiz ? t('nameStartQuiz') : t('nameStart')}
            </button>
            <button
              onClick={handleSkipName}
              className="w-full mt-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors"
            >
              {t('nameSkip')}
            </button>
          </div>
        ) : isSelfPaced ? (
          isSelfPacedCompleted ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm animate-fade-in text-slate-900 dark:text-white">
              <CheckCircle className="text-emerald-500 mx-auto mb-3" size={36} />
              <h2 className="text-base font-bold mb-1">{t('completionTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{t('completionDesc')}</p>
              <button
                type="button"
                onClick={() => {
                  setIsSelfPacedCompleted(false);
                  setSelfPacedIndex(0);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-3 rounded-lg transition-colors mb-3"
              >
                {t('reviewAnswers')}
              </button>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 size={14} />
                  <span>{t('share')}</span>
                </button>
              </div>

              {!testimonialDone && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{t('testimonialPrompt')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{t('testimonialDesc')}</p>

                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTestimonialRating(n)}
                        className="p-0.5"
                        aria-label={`${n} star`}
                      >
                        <Star
                          size={22}
                          className={`${n <= testimonialRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={testimonialMsg}
                    onChange={(e) => setTestimonialMsg(e.target.value)}
                    rows={3}
                    placeholder={t('testimonialPlaceholder')}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 resize-none mb-3"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSkipTestimonial}
                      className="flex-1 px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t('skip')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitTestimonial}
                      disabled={testimonialSending || !testimonialMsg.trim()}
                      className="flex-1 px-3 py-2 text-xs font-semibold text-white dark:text-slate-900 rounded-lg bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      {testimonialSending ? t('sending') : t('testimonialSend')}
                    </button>
                  </div>
                </div>
              )}

              {testimonialDone && testimonialSent && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold text-center border-t border-slate-100 dark:border-slate-800 pt-4">
                  {t('testimonialSent')}
                </p>
              )}
            </div>
          ) : isSessionClosed && !selfPacedNotStarted ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
              <Clock className="text-slate-400 dark:text-slate-500 mx-auto mb-3" size={28} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('votingClosedTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasVoted ? t('votingClosedInfo') : t('votingClosedWait')}
              </p>
            </div>
          ) : !activeQuestion || selfPacedNotStarted ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center shadow-sm">
              <Users className="text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-pulse" size={28} />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{t('waitingTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('waitingDesc')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              {/* Stepper Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  <span>{t('questionProgress', { current: selfPacedIndex + 1, total: questionsList.length })}</span>
                  <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 px-1.5 py-0.5 rounded text-[9px]">
                    {activeQuestion.type === 'rating'
                      ? t('typeRating')
                      : activeQuestion.type === 'multiple_selection'
                        ? t('typeMultiple')
                        : activeQuestion.type === 'open_text'
                          ? t('typeOpenText')
                          : t('typeSingle')}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 dark:bg-slate-100 rounded-full transition-all duration-300"
                    style={{ width: `${((selfPacedIndex + 1) / questionsList.length) * 100}%` }}
                  />
                </div>
              </div>

              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-5">
                {activeQuestion.title}
              </h2>

              <div className="space-y-2 mb-6">
                {activeQuestion.type === 'open_text' ? (
                  <div className="space-y-2 py-1">
                    <textarea
                      value={typeof selectedVote === 'string' ? selectedVote : ''}
                      onChange={(e) => handleOpenTextChange(e.target.value)}
                      placeholder={t('openTextPlaceholder')}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors resize-none"
                    />
                  </div>
                ) : activeQuestion.type === 'rating' ? (
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
                              star <= activeStar
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-200 dark:text-slate-800'
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
                        className={`w-full text-left p-3.5 rounded-lg border text-xs font-medium transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-slate-800 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center uppercase shrink-0 border mt-0.5 ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-white dark:border-slate-800'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {key}
                        </span>
                        <span className="flex-1 break-words leading-relaxed">{label}</span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex gap-2">
                {selfPacedIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleSelfPacedPrev}
                    disabled={submitting}
                    className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-3 rounded-lg transition-colors"
                  >
                    {t('prevQuestion')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSelfPacedNext}
                  disabled={submitting}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-xs py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
                  ) : selfPacedIndex >= questionsList.length - 1 ? (
                    t('finishPoll')
                  ) : (
                    t('nextQuestion')
                  )}
                </button>
              </div>
            </div>
          )
        ) : isClosed && !hasVoted ? (
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
                {activeQuestion.type === 'open_text' ? (
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 rounded-lg text-xs font-semibold break-words">
                    &ldquo;{selectedVote}&rdquo;
                  </div>
                ) : activeQuestion.type === 'rating' ? (
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: selectedVote }).map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" aria-hidden="true" />
                    ))}
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">({selectedVote}/5)</span>
                  </div>
                ) : activeQuestion.type === 'multiple_selection' ? (
                  <div className="flex flex-col gap-1.5">
                    {(selectedVote as string[]).map((v) => (
                      <div
                        key={v}
                        className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-start gap-2 break-words"
                      >
                        <span className="uppercase font-bold shrink-0">{v}:</span>
                        <span>{activeQuestion.options[v]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-start gap-2 break-words">
                    <span className="uppercase font-bold shrink-0">{selectedVote}:</span>
                    <span>{activeQuestion.options[selectedVote]}</span>
                  </div>
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
                onClick={() => setShowShareModal(true)}
                className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 size={14} />
                <span>{t('share')}</span>
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
                    : activeQuestion.type === 'open_text'
                      ? t('typeOpenText')
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
              {activeQuestion.type === 'open_text' ? (
                <div className="space-y-2 py-1">
                  <textarea
                    value={typeof selectedVote === 'string' ? selectedVote : ''}
                    onChange={(e) => handleOpenTextChange(e.target.value)}
                    placeholder={t('openTextPlaceholder')}
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 transition-colors resize-none"
                  />
                </div>
              ) : activeQuestion.type === 'rating' ? (
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
                      className={`w-full text-left p-3.5 rounded-lg border text-xs font-medium transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-slate-800 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center uppercase shrink-0 border mt-0.5 ${
                          isSelected
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-white dark:border-slate-800'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="flex-1 break-words leading-relaxed">{label}</span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleSubmitVote}
              disabled={
                submitting ||
                selectedVote === null ||
                (typeof selectedVote === 'string' && !selectedVote.trim()) ||
                (Array.isArray(selectedVote) && selectedVote.length === 0)
              }
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-semibold text-sm py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? t('sending') : t('submit')}
            </button>
          </div>
        )}
      </main>

      {/* Custom Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-45 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-xs w-full shadow-lg text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">{t('shareTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t('shareDesc')}</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <Link2 size={16} className="text-slate-400" />
                  {copied ? t('shareCopied') : t('shareCopy')}
                </span>
                {copied && <Check size={16} className="text-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  window.open(`https://wa.me/?text=${encodeURIComponent('LivePoll — ' + url)}`, '_blank');
                }}
                className="w-full flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-3 text-xs font-bold transition-colors"
              >
                <MessageCircle size={16} />
                {t('shareWhatsapp')}
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=LivePoll`, '_blank');
                }}
                className="w-full flex items-center gap-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg px-4 py-3 text-xs font-bold transition-colors"
              >
                <Send size={16} />
                {t('shareTelegram')}
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin : '';
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent('LivePoll — Real-time interactive polling')}&url=${encodeURIComponent(url)}`,
                    '_blank',
                  );
                }}
                className="w-full flex items-center gap-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg px-4 py-3 text-xs font-bold transition-colors"
              >
                <Share2 size={16} />
                {t('shareX')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t('shareClose')}
            </button>
          </div>
        </div>
      )}

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
