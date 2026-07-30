'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ArrowLeft, Play, AlertCircle, Plus, GripVertical, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../config';

import { ThemeToggle } from './ThemeToggle';

interface HostNewProps {
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface QuestionDraft {
  id: string;
  type: 'multiple_choice' | 'multiple_selection' | 'rating';
  title: string;
  options: string[];
  timer?: number | null;
}

const TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  multiple_choice: { label: 'Pilihan Tunggal', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  multiple_selection: { label: 'Pilihan Ganda', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  rating: { label: 'Rating 1-5', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const CustomSelect: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  label: string;
}> = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const activeOption = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg font-medium text-xs text-left bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition-colors flex items-center justify-between gap-1.5 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700"
      >
        <span className="truncate">{activeOption?.label || value}</span>
        <ChevronDown size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md z-35 py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                opt.value === value
                  ? 'bg-slate-55 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                  : 'text-slate-650 dark:text-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const HostNew: React.FC<HostNewProps> = ({ navigate, theme, toggleTheme }) => {
  const [title, setTitle] = useState('Sesi Polling Live');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem('host_session_draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.title) setTitle(parsed.title);
        if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);
      } catch {
        /* ignore */
      }
    } else {
      setQuestions([
        { id: 'temp-1', type: 'multiple_choice', title: '', options: ['', ''], timer: null },
      ]);
    }
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem('host_session_draft', JSON.stringify({ title, questions }));
    }
  }, [title, questions]);

  const addQuestion = (type: 'multiple_choice' | 'multiple_selection' | 'rating') => {
    setQuestions([...questions, {
      id: `temp-${Date.now()}`,
      type,
      title: '',
      options: type === 'rating' ? [] : ['', ''],
      timer: null
    }]);
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const updateQuestionTitle = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].title = text;
    setQuestions(updated);
  };

  const updateQuestionType = (index: number, type: 'multiple_choice' | 'multiple_selection' | 'rating') => {
    const updated = [...questions];
    updated[index].type = type;
    if (type === 'rating') updated[index].options = [];
    else if (updated[index].options.length === 0) updated[index].options = ['', ''];
    setQuestions(updated);
  };

  const updateQuestionTimer = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].timer = val === 'manual' ? null : parseInt(val, 10);
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };

  const handleLaunch = async () => {
    setError('');
    if (!title.trim()) { setError('Judul sesi tidak boleh kosong.'); return; }
    if (questions.length === 0) { setError('Tambahkan minimal satu pertanyaan.'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) { setError(`Pertanyaan #${i + 1} belum memiliki judul.`); return; }
      if (q.type !== 'rating' && q.options.filter(o => o.trim()).length < 2) {
        setError(`Pertanyaan #${i + 1} minimal harus memiliki 2 pilihan.`);
        return;
      }
    }
    setLoading(true);
    const formattedQuestions = questions.map((q) => {
      const qData: any = { type: q.type, title: q.title, timer: q.timer ?? null };
      if (q.type !== 'rating') qData.options = q.options.filter(o => o.trim());
      return qData;
    });
    try {
      const response = await fetch(`${API_BASE_URL}/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), questions: formattedQuestions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat sesi.');
      localStorage.setItem(`host_token_${data.code}`, data.host_token);
      localStorage.removeItem('host_session_draft');
      navigate(`#/host/${data.code}`);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('#/')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-colors">
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>
          <h1 className="text-sm font-bold text-slate-900 dark:text-white">Buat Sesi Baru</h1>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 w-full">
        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/50 p-4 mb-6 rounded-lg flex items-start gap-3 animate-fade-in">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <span className="text-red-700 dark:text-red-400 text-xs font-semibold">{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Title input */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Judul Sesi / Presentasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI Coding Workshop"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-base font-bold focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Pertanyaan Polling ({questions.length})
            </h2>
          </div>

          {/* Questions */}
          {questions.map((q, qIndex) => {
            const typeInfo = TYPE_LABELS[q.type];
            return (
              <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm animate-fade-in">
                {/* Header card */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <GripVertical size={14} className="text-slate-350 dark:text-slate-650" />
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Q{qIndex + 1}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${typeInfo.badge}`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="text-slate-400 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Pertanyaan</label>
                      <input
                        type="text"
                        value={q.title}
                        onChange={(e) => updateQuestionTitle(qIndex, e.target.value)}
                        placeholder="Apa pendapat Anda tentang...?"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-sm focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                      />
                    </div>
                    
                    <CustomSelect
                      label="Tipe"
                      value={q.type}
                      onChange={(val) => updateQuestionType(qIndex, val as any)}
                      options={[
                        { value: 'multiple_choice', label: 'Pilihan Tunggal' },
                        { value: 'multiple_selection', label: 'Pilihan Ganda' },
                        { value: 'rating', label: 'Rating 1-5' }
                      ]}
                    />
                    <CustomSelect
                      label="Timer"
                      value={q.timer === null || q.timer === undefined ? 'manual' : String(q.timer)}
                      onChange={(val) => updateQuestionTimer(qIndex, val)}
                      options={[
                        { value: 'manual', label: 'Manual (No Timer)' },
                        { value: '10', label: '10 Detik' },
                        { value: '20', label: '20 Detik' },
                        { value: '30', label: '30 Detik' },
                        { value: '45', label: '45 Detik' },
                        { value: '60', label: '1 Menit' },
                        { value: '120', label: '2 Menit' }
                      ]}
                    />
                  </div>

                  {q.type !== 'rating' && (
                    <div className="space-y-2 mt-4">
                      <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Pilihan Jawaban</label>
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-400 text-[10px] font-extrabold flex items-center justify-center shrink-0 uppercase border border-slate-200 dark:border-slate-700">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)}
                            placeholder={`Pilihan ${String.fromCharCode(65 + optIndex)}`}
                            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition-colors"
                          />
                          {q.options.length > 2 && (
                            <button
                              onClick={() => removeOption(qIndex, optIndex)}
                              className="text-slate-355 hover:text-red-500 p-1 hover:bg-slate-55 dark:hover:bg-slate-800 rounded transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 8 && (
                        <button
                          onClick={() => addOption(qIndex)}
                          className="text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-[10px] font-bold flex items-center gap-1 mt-2 transition-colors"
                        >
                          <Plus size={12} /> Tambah Pilihan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add actions */}
          <div className="border border-dashed border-slate-250 dark:border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tambah Pertanyaan:</span>
            <div className="flex gap-2 w-full sm:w-auto">
              {(['multiple_choice', 'multiple_selection', 'rating'] as const).map((type) => {
                const info = TYPE_LABELS[type];
                return (
                  <button
                    key={type}
                    onClick={() => addQuestion(type)}
                    className="flex-1 sm:flex-initial bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-55 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    + {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 pb-8">
            <button
              onClick={handleLaunch}
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Play size={16} />
                  Mulai Sesi Presentasi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
