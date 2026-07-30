'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Play, RefreshCw, Users, AlertCircle, Copy, Check, ChevronRight, LogOut, Eye, Lock } from 'lucide-react';
import { API_BASE_URL, getJoinUrl } from '../config';
import type { Session } from '../types';

import { ThemeToggle } from './ThemeToggle';

interface HostControlProps {
  code: string;
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const HostControl: React.FC<HostControlProps> = ({ code, navigate, theme, toggleTheme }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [resultsData, setResultsData] = useState<any>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const hostToken = localStorage.getItem(`host_token_${code}`) || '';
  const pollIntervalRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!hostToken) {
      setError('Token Host tidak ditemukan.');
      return;
    }
    fetchSession();
  }, [code, hostToken]);

  useEffect(() => {
    if (!session || !selectedQuestionId) return;
    fetchResults(selectedQuestionId);
    pollIntervalRef.current = setInterval(() => fetchResults(selectedQuestionId), 1000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [session?.code, selectedQuestionId]);

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
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [session?.active_question_id, session?.active_question_activated_at, session?.status]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/get-session?code=${code}`, { headers: { 'X-Host-Token': hostToken } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat sesi.');

      // Update page title dynamically
      if (data.title) {
        document.title = `LivePoll Host | ${data.title} (${code})`;
      }

      setSession(data);
      if (data.active_question_id) setSelectedQuestionId(data.active_question_id);
      else if (data.questions && Object.keys(data.questions).length > 0)
        setSelectedQuestionId(Object.keys(data.questions)[0]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchResults = async (qId: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE_URL}/results?code=${code}&q=${qId}&t=${Date.now()}`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Cache-Control': 'no-store' },
      });
      const data = await res.json();
      if (res.ok) setResultsData(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
    }
  };

  const apiPost = async (endpoint: string, body: any) => {
    const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Host-Token': hostToken },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal.');
    return data;
  };

  const handleSetActive = async (qId: string) => {
    try {
      await apiPost('set-active-question', { code, question_id: qId });
      if (session) setSession({ ...session, active_question_id: qId });
      setSelectedQuestionId(qId);
      showNotification('Pertanyaan aktif berhasil diubah.', 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const handleToggleStatus = async (newStatus: 'active' | 'closed') => {
    try {
      await apiPost('close-session', { code, status: newStatus });
      if (session) setSession({ ...session, status: newStatus });
      showNotification(newStatus === 'active' ? 'Voting dibuka kembali.' : 'Voting ditutup.', 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const executeResetVotes = async () => {
    setShowResetModal(false);
    try {
      await apiPost('reset-votes', { code, question_id: selectedQuestionId });
      fetchResults(selectedQuestionId);
      showNotification('Semua jawaban berhasil direset.', 'success');
    } catch (err: any) {
      showNotification(err.message);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(getJoinUrl(code)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-xl p-6 text-center shadow-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500 mb-5">{error}</p>
          <button
            onClick={() => navigate('#/')}
            className="w-full bg-slate-900 text-white font-semibold text-xs py-2 rounded-lg"
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
        <div className="text-center animate-fade-in">
          <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-semibold">Memuat panel...</p>
        </div>
      </div>
    );
  }

  const activeQuestion = session.questions[selectedQuestionId];
  const joinUrl = getJoinUrl(code);
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
                className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' ? 'bg-green-500 shrink-0' : 'bg-slate-350 dark:bg-slate-700'} shrink-0`}
              ></span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:inline">
                {session.status === 'active' ? 'Voting Dibuka' : 'Voting Ditutup'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button
            onClick={() => window.open(`#/present/${code}`, '_blank')}
            className="flex items-center gap-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 sm:px-3 py-1.5 rounded-lg font-semibold text-xs border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Eye size={14} /> <span className="hidden sm:inline">Layar Presentasi</span>
          </button>
          <button
            onClick={() => setShowExitModal(true)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded transition-colors"
            title="Keluar"
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
              Informasi Sesi
            </h3>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
              <QRCodeSVG value={joinUrl} size={130} />
            </div>
            <div className="w-full">
              <div className="bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between gap-2 mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono truncate">{joinUrl}</span>
                <button
                  onClick={copyUrl}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-250 p-1 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Daftar Pertanyaan
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
                        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`text-[9px] font-bold uppercase ${isSelected ? 'text-slate-400 dark:text-slate-500' : 'text-slate-350 dark:text-slate-600'}`}
                        >
                          Q{idx + 1}
                        </span>
                        {isActive && (
                          <span
                            className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${isSelected ? 'bg-white/10 dark:bg-slate-800 text-white dark:text-slate-200 border border-white/20 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-750'}`}
                          >
                            AKTIF
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
          {/* Action Control Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 mb-2">
                  {activeQuestion?.type.replace('_', ' ')}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeQuestion?.title}</h2>
              </div>
              {selectedQuestionId === session.active_question_id && timeLeft !== null && (
                <div
                  className={`px-2.5 py-1 rounded border text-xs font-bold shrink-0 ${timeLeft > 0 ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-450 border border-slate-200 dark:border-slate-705'}`}
                >
                  {timeLeft > 0 ? `Waktu: ${timeLeft}s` : 'Waktu Habis'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              {session.active_question_id !== selectedQuestionId ? (
                <button
                  onClick={() => handleSetActive(selectedQuestionId)}
                  className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Play size={12} /> Aktifkan Pertanyaan
                </button>
              ) : session.status === 'active' ? (
                <button
                  onClick={() => handleToggleStatus('closed')}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Lock size={12} /> Tutup Voting
                </button>
              ) : (
                <button
                  onClick={() => handleToggleStatus('active')}
                  className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Play size={12} /> Buka Voting
                </button>
              )}

              <button
                onClick={() => setShowResetModal(true)}
                className="ml-auto bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} /> Reset Data
              </button>
            </div>
          </div>

          {/* Results Visualizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Hasil Polling
              </h3>
              <div className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                <Users size={12} /> {totalVotes} Respon
              </div>
            </div>

            <div className="space-y-4">
              {activeQuestion?.type === 'rating' ? (
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
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Rata-rata
                    </p>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const count = resultsData?.results?.[r] || 0;
                      const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                      return (
                        <div key={r} className="flex items-center gap-3">
                          <span className="w-8 text-[11px] font-bold text-slate-400 dark:text-slate-550 text-right">
                            {r} ★
                          </span>
                          <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-450 dark:bg-slate-500 rounded-full"
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
                        <div className="flex justify-between text-xs font-bold text-slate-750 dark:text-slate-300 mb-1.5">
                          <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-700">
                              {key}
                            </span>
                            {label}
                          </span>
                          <span className="text-slate-500 dark:text-slate-450 font-bold">
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
            <h3 className="text-sm font-bold mb-1.5">Keluar Panel Presenter</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Sesi polling akan tetap berjalan di server. Anda dapat kembali menggunakan kode sesi dan token host Anda.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  navigate('#/');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 rounded-md bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-xs w-full shadow-lg text-slate-900 dark:text-white">
            <h3 className="text-sm font-bold mb-1.5">Reset Jawaban</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Hapus semua jawaban masuk untuk pertanyaan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={executeResetVotes}
                className="px-3 py-1.5 text-xs font-semibold text-white rounded-md bg-red-650 hover:bg-red-700 transition-colors"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
