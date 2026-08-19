'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  Play,
  RefreshCw,
  SkipForward,
  Users,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  LogOut,
  Eye,
  Lock,
  Star,
  Trophy,
  Download,
  Link2,
  Key,
  FileText,
  Mic2,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { API_BASE_URL, apiFetch, getJoinUrl, getHostId, getAuthToken, getResultsUrl } from '../config';
import type { Session } from '../types';

import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { HostAuth } from './HostAuth';
import { WordCloudVisualizer } from './WordCloudVisualizer';

interface HostControlProps {
  code: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const HostControl: React.FC<HostControlProps> = ({ code, navigate, theme, toggleTheme }) => {
  const locale = useLocale();
  const t = useTranslations('host');
  const tp = useTranslations('presentation');
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [autoNext, setAutoNext] = useState<{ qId: string; title: string; count: number } | null>(null);
  const autoNextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [testimonialDone, setTestimonialDone] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(`testimonial_done_${code}`) === '1' : false,
  );
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [testimonialMsg, setTestimonialMsg] = useState('');
  const [testimonialSending, setTestimonialSending] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

  const [hostToken, setHostToken] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || params.get('host_token');
    if (urlToken) {
      localStorage.setItem(`host_token_${code}`, urlToken);
      setHostToken(urlToken);
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    } else {
      setHostToken(localStorage.getItem(`host_token_${code}`) || '');
    }
  }, [code]);

  const hostTokenSafe = hostToken || '';

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Session query with 2s polling
  const fetchSession = async (): Promise<Session> => {
    const headers: Record<string, string> = {
      'X-Require-Host': '1',
    };
    if (hostTokenSafe) headers['X-Host-Token'] = hostTokenSafe;
    const accountToken = getAuthToken();
    if (accountToken) headers['X-Host-Account-Token'] = accountToken;

    const res = await apiFetch(`${API_BASE_URL}/get-session?code=${code}`, { headers });
    const data = await res.json();
    if (!res.ok || !data.is_host) throw new Error(data.error || t('errorToken'));
    if (data.title) {
      document.title = `LivePoll Host | ${data.title} (${code})`;
    }
    return data;
  };

  const sessionQuery = useQuery({
    queryKey: ['session', code, hostTokenSafe],
    queryFn: fetchSession,
    refetchInterval: 2000,
    enabled: !!hostTokenSafe || !!getAuthToken(),
    retry: false,
  });

  const session = sessionQuery.data ?? null;

  // Sync selected question when session loads
  useEffect(() => {
    if (!session) return;
    if (session.active_question_id) {
      setSelectedQuestionId((prev) => prev || session.active_question_id);
    } else {
      const first = Object.values(session.questions || {})[0];
      if (first) setSelectedQuestionId(first.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.active_question_id]);

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
    queryKey: ['results', code, selectedQuestionId],
    queryFn: () => fetchResults(selectedQuestionId),
    refetchInterval: 1000,
    enabled: !!session && !!selectedQuestionId,
  });

  const resultsData = resultsQuery.data ?? null;

  // Track whether the session has ever been active (voting opened)
  const everActiveRef = useRef(false);
  useEffect(() => {
    if (session?.status === 'active') everActiveRef.current = true;
  }, [session?.status]);

  // Testimonial modal: only after the session was actually used (was active, then closed)
  useEffect(() => {
    if (session?.status === 'closed' && everActiveRef.current && !testimonialDone && !showTestimonial) {
      setShowTestimonial(true);
    }
  }, [session?.status, testimonialDone, showTestimonial]);

  useEffect(() => {
    if (!session || !session.active_question_id) {
      setTimeLeft(null);
      return;
    }

    const activeQ = session.questions[session.active_question_id];
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
      const left = calculateTimeLeft();
      setTimeLeft(left);
      if (left === 0 && session.status === 'active') {
        handleToggleStatus('closed');
        const questions = Object.values(session.questions || {});
        const idx = questions.findIndex((q) => q.id === session.active_question_id);
        const next = idx !== -1 ? questions[idx + 1] : undefined;
        if (next) scheduleAutoNext(next);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.active_question_id, session?.active_question_activated_at, session?.status]);

  // Clear pending auto-next on unmount
  useEffect(
    () => () => {
      if (autoNextRef.current) clearTimeout(autoNextRef.current);
    },
    [],
  );

  // 3s loading countdown, then automatically start the next question
  const scheduleAutoNext = (next: { id: string; title: string }) => {
    if (autoNextRef.current) return;
    setAutoNext({ qId: next.id, title: next.title, count: 3 });
    const startedAt = Date.now();
    const scheduleTick = () => {
      autoNextRef.current = setTimeout(tick, 1000);
    };
    const tick = () => {
      const remaining = Math.max(0, 3 - Math.ceil((Date.now() - startedAt) / 1000));
      if (remaining <= 0) {
        autoNextRef.current = null;
        setAutoNext(null);
        setSelectedQuestionId(next.id);
        startVoteFor(next.id);
        return;
      }
      setAutoNext((prev) => (prev ? { ...prev, count: remaining } : prev));
      scheduleTick();
    };
    scheduleTick();
  };

  const cancelAutoNext = () => {
    if (autoNextRef.current) {
      clearTimeout(autoNextRef.current);
      autoNextRef.current = null;
    }
    setAutoNext(null);
  };

  const apiPost = async (endpoint: string, body: any) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (hostTokenSafe) headers['X-Host-Token'] = hostTokenSafe;
    const accountToken = getAuthToken();
    if (accountToken) headers['X-Host-Account-Token'] = accountToken;

    const res = await apiFetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const handleCopyHostLink = () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/${locale}/host/${code}?token=${hostTokenSafe}`;
    navigator.clipboard.writeText(link).then(() => {
      showNotification(t('notifHostLinkCopied'), 'success');
    });
  };

  const startVoteFor = async (qId: string) => {
    try {
      if (session?.active_question_id !== qId) {
        await apiPost('set-active-question', { code, question_id: qId });
      }
      await apiPost('close-session', { code, status: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['session', code] });
      showNotification(t('notifVotingOpen'), 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const handleStartVote = () => {
    cancelAutoNext();
    const qId = selectedQuestionId || Object.values(session?.questions || {})[0]?.id;
    if (!qId) return;
    startVoteFor(qId);
  };

  const handleNextQuestion = () => {
    if (session?.pace_mode === 'self_paced') return;
    cancelAutoNext();
    const questions = Object.values(session?.questions || {});
    const idx = questions.findIndex((q) => q.id === selectedQuestionId);
    const next = idx !== -1 ? questions[idx + 1] : undefined;
    if (!next) return;
    setSelectedQuestionId(next.id);
    startVoteFor(next.id);
  };

  const handleToggleStatus = async (newStatus: 'active' | 'closed') => {
    cancelAutoNext();
    try {
      await apiPost('close-session', { code, status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ['session', code] });
      showNotification(newStatus === 'active' ? t('notifVotingOpen') : t('notifVotingClosed'), 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const handleTogglePaceMode = async () => {
    const currentMode = session?.pace_mode || 'presenter';
    const newMode = currentMode === 'presenter' ? 'self_paced' : 'presenter';
    try {
      await apiPost('set-pace-mode', { code, pace_mode: newMode });
      await queryClient.invalidateQueries({ queryKey: ['session', code] });
      showNotification(t('notifPaceModeChanged'), 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const executeResetVotes = async () => {
    setShowResetModal(false);
    try {
      await apiPost('reset-votes', { code, question_id: selectedQuestionId });
      await queryClient.invalidateQueries({ queryKey: ['results', code, selectedQuestionId] });
      showNotification(t('notifReset'), 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const submitTestimonial = async () => {
    setTestimonialSending(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/testimonial-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: session?.host_name || '',
          role: session?.host_org || '',
          message: testimonialMsg,
          rating: testimonialRating,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal.');
      localStorage.setItem(`testimonial_done_${code}`, '1');
      setTestimonialDone(true);
      setShowTestimonial(false);
      showNotification(tp('testimonialSent'), 'success');
    } catch (err: any) {
      showNotification(err.message);
    } finally {
      setTestimonialSending(false);
    }
  };

  const getExportFilename = () => {
    const slug = (session?.title || code)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug || `session-${code.toLowerCase()}`}.xls`;
  };

  const exportAllResults = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/export-results?code=${code}`, {
        headers: { 'X-Host-Token': hostTokenSafe },
      });
      if (!res.ok) throw new Error(await dataError(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showNotification(err.message || t('loadSessionError'));
    }
  };

  const exportExcel = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/quiz-scores?code=${code}&format=xls`, {
        headers: { 'X-Host-Token': hostTokenSafe },
      });
      if (!res.ok) throw new Error(await dataError(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      showNotification(err.message || t('loadSessionError'));
    }
  };

  const dataError = async (res: Response) => {
    try {
      const d = await res.json();
      return d.error || 'Gagal export.';
    } catch {
      return 'Gagal export.';
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/quiz-scores?code=${code}`, {
        headers: { 'X-Host-Token': hostTokenSafe },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal.');
      setLeaderboard(data.leaderboard || []);
      setShowLeaderboard(true);
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const handleCloneSession = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/clone-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostTokenSafe },
        body: JSON.stringify({
          code,
          host_id: getHostId(),
          auth_token: getAuthToken() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal.');
      localStorage.setItem(`host_token_${data.code}`, data.host_token);
      const clonedHostLink = `${window.location.origin}/${locale}/host/${data.code}?token=${data.host_token}`;
      await navigator.clipboard.writeText(clonedHostLink);
      showNotification(t('cloneMessage', { code: data.code }), 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(getJoinUrl(code, locale)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const queryError = sessionQuery.error as Error | null;
  const accessError = hostToken === null ? '' : !hostToken ? t('errorToken') : queryError?.message || '';

  if (hostToken === null) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="min-h-screen bg-dots flex flex-col font-sans">
        {/* Top Navbar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors p-1"
              aria-label={t('back')}
              title={t('back')}
            >
              <LogOut size={16} />
            </button>
            <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold px-2 py-1 rounded text-xs tracking-wider shrink-0">
              {code}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">LivePoll Host</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <LanguageToggle />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center animate-fade-in text-slate-900 dark:text-white">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/50">
              <Key size={24} />
            </div>
            <h2 className="text-base font-bold mb-1.5">{t('enterTokenTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{t('enterTokenDesc')}</p>

            {queryError?.message && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs px-3.5 py-2.5 rounded-xl mb-4 text-center font-medium">
                {queryError.message}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = manualTokenInput.trim();
                if (!trimmed) return;
                localStorage.setItem(`host_token_${code}`, trimmed);
                setHostToken(trimmed);
              }}
              className="space-y-3 mb-6"
            >
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder={t('tokenPlaceholder')}
                autoFocus
                className="w-full px-3.5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
              />
              <button
                type="submit"
                disabled={!manualTokenInput.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs py-3 rounded-xl disabled:opacity-40 transition-colors"
              >
                {t('submitToken')}
              </button>
            </form>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mb-5 text-left">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 text-center">
                {t('loginToAccess')}
              </p>
              <HostAuth
                compact
                onAuthChange={() => {
                  queryClient.invalidateQueries({ queryKey: ['session', code] });
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t('back')}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const activeQuestion = session.questions[selectedQuestionId];
  const joinUrl = getJoinUrl(code, locale);
  const totalVotes = resultsData?.total_votes || 0;

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold px-2 py-1 rounded text-xs tracking-wider shrink-0">
            {code}
          </span>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[120px] sm:max-w-none">
              {session.title}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' ? 'bg-green-500 shrink-0' : 'bg-slate-400 dark:bg-slate-700'} shrink-0`}
              ></span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
                {session.status === 'active' ? t('votingOpen') : t('votingClosed')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowTokenModal(true)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
            title={t('tokenModalTitle')}
          >
            <Key size={12} />
            <span className="hidden sm:inline">{t('tokenModalTitle')}</span>
          </button>
          <button
            onClick={handleTogglePaceMode}
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              session.pace_mode === 'self_paced'
                ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={session.pace_mode === 'self_paced' ? t('switchToPresenter') : t('switchToSelfPaced')}
          >
            {session.pace_mode === 'self_paced' ? <FileText size={13} /> : <Mic2 size={13} />}
            <span>{session.pace_mode === 'self_paced' ? t('modeSelfPaced') : t('modePresenter')}</span>
          </button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <LanguageToggle />
          <button
            onClick={() => window.open(`/present/${code}`, '_blank')}
            aria-label={tp('title')}
            className="flex items-center gap-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 sm:px-3 py-1.5 rounded-lg font-semibold text-xs border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Eye size={14} /> <span className="hidden sm:inline">{tp('title')}</span>
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors"
            title={t('exit')}
            aria-label={t('exit')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
        {/* Left Column (Join info & Switcher) */}
        <div className="lg:col-span-4 space-y-5 order-2 lg:order-1">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col items-center text-center shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              {t('sessionInfo')}
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
              <QRCodeSVG value={joinUrl} size={130} />
            </div>
            <div className="w-full">
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono truncate">{joinUrl}</span>
                <button
                  onClick={copyUrl}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 p-1 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              {t('questionsList')}
            </h3>
            <div className="space-y-1">
              {Object.values(session.questions).map((q, idx) => {
                const isActive = session.active_question_id === q.id;
                const isSelected = selectedQuestionId === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQuestionId(q.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'border-slate-800 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[9px] font-bold uppercase ${isSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-600'}`}
                        >
                          Q{idx + 1}
                        </span>
                        {isActive && (
                          <span
                            className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${isSelected ? 'bg-white/10 dark:bg-slate-800 text-white dark:text-slate-200 border border-white/20 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                          >
                            {t('active')}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-semibold">{q.title}</p>
                    </div>
                    <ChevronRight
                      size={12}
                      className={`${isSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-300 dark:text-slate-600'} shrink-0`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Control Panel & Chart) */}
        <div className="lg:col-span-8 space-y-5 order-1 lg:order-2">
          {/* Question Card */}
          <div
            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm ${activeQuestion ? '' : 'border-dashed'}`}
          >
            {activeQuestion ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 mb-2">
                    {activeQuestion?.type === 'rating'
                      ? t('typeRating')
                      : activeQuestion?.type === 'multiple_selection'
                        ? t('typeMultiple')
                        : activeQuestion?.type === 'open_text'
                          ? t('typeOpenText')
                          : t('typeSingle')}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeQuestion?.title}</h2>
                </div>
                {selectedQuestionId === session.active_question_id && timeLeft !== null && (
                  <div
                    className={`px-2.5 py-1 rounded border text-xs font-bold shrink-0 ${timeLeft > 0 ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 border border-slate-200 dark:border-slate-700'}`}
                  >
                    {timeLeft > 0 ? t('timeLeft', { time: timeLeft }) : t('timeUp')}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium py-1">{t('noQuestion')}</p>
            )}
          </div>

          {/* Control Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {session.status === 'active' ? (
                <button
                  onClick={() => handleToggleStatus('closed')}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Lock size={12} /> {t('closeVoting')}
                </button>
              ) : (
                <button
                  onClick={handleStartVote}
                  className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Play size={12} /> {t('openVoting')}
                </button>
              )}

              {(() => {
                const questions = Object.values(session.questions || {});
                const idx = questions.findIndex((q) => q.id === selectedQuestionId);
                const hasNext = idx !== -1 && !!questions[idx + 1];
                if (!hasNext) return null;
                return (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    disabled={session.pace_mode === 'self_paced'}
                    className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900"
                  >
                    <SkipForward size={12} /> {t('next')}
                  </button>
                );
              })()}

              <button
                onClick={() => setShowResetModal(true)}
                className="ml-auto bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} /> {t('reset')}
              </button>
              {activeQuestion?.correct_answer && (
                <button
                  onClick={fetchLeaderboard}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trophy size={12} /> {t('leaderboard')}
                </button>
              )}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCopyMenu((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={showCopyMenu}
                  className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Copy size={12} /> {t('copyActions')}
                  <ChevronDown size={12} className={`transition-transform ${showCopyMenu ? 'rotate-180' : ''}`} />
                </button>
                {showCopyMenu && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-30 mt-1.5 min-w-52 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowCopyMenu(false);
                        handleCopyHostLink();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Key size={13} /> {t('copyHostLink')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowCopyMenu(false);
                        handleCloneSession();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Copy size={13} /> {t('cloneSession')}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={exportAllResults}
                className="bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title={t('exportResults')}
              >
                <Download size={12} /> {t('exportResults')}
              </button>
            </div>
          </div>

          {/* Results Visualizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                {t('resultsTitle')}
              </h3>
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                  <Users size={12} /> {totalVotes} {t('responses')}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {activeQuestion?.type === 'open_text' ? (
                <WordCloudVisualizer
                  words={resultsData?.words || []}
                  responses={resultsData?.responses || []}
                  totalVotes={totalVotes}
                />
              ) : activeQuestion?.type === 'rating' ? (
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="text-center md:border-r border-slate-100 dark:border-slate-800 md:pr-8 py-3 shrink-0">
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {resultsData?.average_rating || 0}
                    </p>
                    <div className="flex justify-center gap-0.5 my-1.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`text-xl ${s <= Math.round(resultsData?.average_rating || 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-800'}`}
                        >
                          <Star size={20} fill="currentColor" aria-hidden="true" />
                        </span>
                      ))}
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {t('average')}
                    </p>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = resultsData?.results?.[r] || 0;
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-3">
                          <span className="w-8 text-[11px] font-bold text-slate-400 dark:text-slate-500 text-right">
                            {r} <Star size={11} fill="currentColor" aria-hidden="true" />
                          </span>
                          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-500 dark:bg-slate-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="w-8 text-right text-xs font-bold text-slate-500 dark:text-slate-400">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {Object.entries(activeQuestion?.options || {}).map(([key, label]) => {
                    const count = resultsData?.results?.[key] || 0;
                    const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-700">
                              {key}
                            </span>
                            {label}
                          </span>
                          <span className="text-slate-500 dark:text-slate-500 font-bold">
                            {count} ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900 dark:bg-white rounded-full"
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
        </div>
      </div>

      {/* Auto-next countdown banner */}
      {autoNext && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-45 animate-fade-in px-4">
          <div className="flex items-center gap-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-full shadow-lg max-w-full">
            <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin shrink-0"></div>
            <span className="text-xs font-bold truncate">
              {t('autoNext', { n: autoNext.count, title: autoNext.title })}
            </span>
          </div>
        </div>
      )}

      {/* Custom Notification Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-35 animate-fade-in">
          <div
            className={`px-4 py-2.5 rounded-lg border text-xs font-semibold shadow-md flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-400'
            }`}
          >
            <AlertCircle size={14} />
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Custom Exit Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-lg text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">{t('exitTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{t('exitDesc')}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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

      {/* Custom Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-lg text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" /> {t('leaderboard')}
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getResultsUrl(code)).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Link2 size={12} /> {copied ? t('copied2') : t('shareResults')}
                </button>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-950/40"
                >
                  <Download size={12} /> {t('exportExcel')}
                </button>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold transition-colors"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6">{t('leaderboardEmpty')}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>{t('rank')}</span>
                  <span className="flex-1 ml-3">{t('participant')}</span>
                  <span className="w-16 text-center">{t('score')}</span>
                </div>
                {leaderboard.map((item, idx) => {
                  const expanded = expandedParticipant === item.participant_id;
                  return (
                    <div key={item.participant_id}>
                      <button
                        type="button"
                        onClick={() => setExpandedParticipant(expanded ? null : item.participant_id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs ${
                          idx === 0
                            ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40'
                            : 'bg-slate-50 dark:bg-slate-800'
                        }`}
                      >
                        <span className={`w-8 font-black ${idx === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {idx === 0 ? <Trophy size={16} aria-label={t('rank')} /> : idx + 1}
                        </span>
                        <span className="flex-1 ml-3 font-bold text-slate-800 dark:text-slate-200 truncate text-left">
                          {item.name}
                          <span className="block text-[9px] font-normal text-slate-400">
                            {t('correctLabel')}: {item.correct}/{item.total}
                          </span>
                        </span>
                        <span className="w-16 text-center font-black text-slate-900 dark:text-white">
                          {Number(item.points || 0).toLocaleString()}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`ml-1 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {expanded && item.answers && item.answers.length > 0 && (
                        <div className="mt-1.5 space-y-1.5 px-3 pb-2">
                          {item.answers.map((a: any, ai: number) => (
                            <div
                              key={ai}
                              className={`rounded-lg px-3 py-2 text-[11px] border ${
                                a.is_correct
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                              }`}
                            >
                              <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {a.question_title}
                                <span
                                  className={`ml-2 text-[9px] font-black uppercase ${a.is_correct ? 'text-emerald-500' : 'text-red-500'}`}
                                >
                                  {a.is_correct ? t('benar') : t('salah')}
                                </span>
                              </p>
                              <p className="text-slate-500 dark:text-slate-400">
                                {t('yourAnswer')}:{' '}
                                <span className="font-bold text-slate-700 dark:text-slate-300">{a.answer}</span>
                                {!a.is_correct && (
                                  <span className="block">
                                    {t('correctAns')}:{' '}
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {a.correct_answer}
                                    </span>
                                  </span>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Testimonial Modal */}
      {showTestimonial && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full shadow-lg text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">{tp('testimonialPrompt')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{tp('testimonialDesc')}</p>

            <div className="flex items-center justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTestimonialRating(n)}
                  className="p-0.5"
                  aria-label={`${n} star`}
                >
                  <Star
                    size={26}
                    className={`${n <= testimonialRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={testimonialMsg}
              onChange={(e) => setTestimonialMsg(e.target.value)}
              rows={3}
              placeholder={tp('testimonialPlaceholder')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400 resize-none mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  localStorage.setItem(`testimonial_done_${code}`, '1');
                  setShowTestimonial(false);
                  setTestimonialDone(true);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {tp('skip')}
              </button>
              <button
                onClick={submitTestimonial}
                disabled={testimonialSending || !testimonialMsg.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {testimonialSending ? tp('testimonialSending') : tp('testimonialSend')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-lg text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">{t('resetTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">{t('resetDesc')}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={executeResetVotes}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-red-600 hover:bg-red-700 transition-colors"
              >
                {t('resetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Token Info Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-45 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Key size={14} />
                </div>
                <h3 className="text-sm font-bold">{t('tokenModalTitle')}</h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{t('tokenModalDesc')}</p>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-3">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Token Host (24 Jam)
              </p>
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                  {hostTokenSafe}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(hostTokenSafe);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-bold shrink-0 transition-colors flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copied ? t('tokenCopied') : t('copyToken')}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyHostLink}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors mb-2"
            >
              <Link2 size={14} />
              <span>{t('copyHostLink')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTokenModal(false)}
              className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-2 transition-colors"
            >
              {t('back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
