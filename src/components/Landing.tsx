'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  ArrowRight,
  QrCode,
  Shield,
  Layers,
  Tv,
  Users,
  Clock,
  Star,
  CheckCircle,
  ChevronRight,
  Copy,
  Heart,
  Code,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from './ThemeToggle';
import { API_BASE_URL } from '../config';

interface LandingProps {
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Landing: React.FC<LandingProps> = ({ navigate, theme, toggleTheme }) => {
  const [code, setCode] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [stats, setStats] = useState<{ sessions: number; votes: number } | null>(null);
  const t = useTranslations('landing');
  const tn = useTranslations('nav');

  useEffect(() => {
    fetch(`${API_BASE_URL}/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/join/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-slate-900 dark:text-white" />
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{tn('brand')}</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <button
              onClick={() => navigate('/host/new')}
              className="text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 px-4 py-2 rounded-lg transition-all"
            >
              {tn('createPoll')}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-block text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {t('badge')}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {t('headline')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
              {t('subheadline')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/host/new')}
                className="w-full sm:w-auto justify-center bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-5 py-3 rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <PlusCircle size={16} /> {t('ctaPrimary')}
              </button>
              <a
                href="#features"
                className="w-full sm:w-auto justify-center border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-650 dark:text-slate-300 font-bold px-5 py-3 rounded-lg text-sm transition-all flex items-center bg-white dark:bg-slate-900"
              >
                {t('ctaSecondary')}
              </a>
            </div>
          </div>

          {/* Right Column: Code Entry Form */}
          <div className="lg:col-span-5">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-slate-500 dark:text-slate-450" />
                <h3 className="font-bold text-xs text-slate-500 dark:text-slate-450 uppercase tracking-wider">
                  {t('forParticipants')}
                </h3>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 text-left">{t('joinTitle')}</h2>
              <p className="text-xs text-slate-450 dark:text-slate-400 mb-5 leading-relaxed text-left">
                {t('joinDesc')}
              </p>

              <form onSubmit={handleJoin} className="space-y-3">
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder={t('joinPlaceholder')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-base font-bold text-center focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
                    maxLength={8}
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 py-3 px-5 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-sm"
                  >
                    <span>{t('joinButton')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      {stats && (stats.sessions > 0 || stats.votes > 0) && (
        <section className="py-8 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-x-8 gap-y-3">
            {stats.sessions > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shrink-0">
                  <Layers size={14} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-slate-900 dark:text-white">{stats.sessions}</span> {t('statsSessions')}
                </p>
              </div>
            )}
            {stats.votes > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 shrink-0">
                  <CheckCircle size={14} />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-slate-900 dark:text-white">{stats.votes}</span> {t('statsVotes')}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* How it Works Section */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-xs text-slate-450 dark:text-slate-400">{t('howItWorksSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Vertical Steps */}
          <div className="lg:col-span-5 space-y-4">
            {[
              {
                step: 1,
                title: t('step1Title'),
                desc: t('step1Desc'),
              },
              {
                step: 2,
                title: t('step2Title'),
                desc: t('step2Desc'),
              },
              {
                step: 3,
                title: t('step3Title'),
                desc: t('step3Desc'),
              },
            ].map((item) => (
              <div
                key={item.step}
                onMouseEnter={() => setActiveStep(item.step)}
                onClick={() => setActiveStep(item.step)}
                className={`p-5 rounded-xl border text-left cursor-pointer transition-all ${
                  activeStep === item.step
                    ? 'border-slate-800 dark:border-slate-100 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-transparent'
                }`}
              >
                <h3
                  className={`font-bold text-sm ${activeStep === item.step ? 'text-slate-950 dark:text-white' : 'text-slate-700 dark:text-slate-400'}`}
                >
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Right Column: Live High-Fidelity Mockup */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[380px] flex flex-col justify-between relative overflow-hidden">
            {/* Header bar mock */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-650"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-650"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-350 dark:bg-slate-650"></div>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 ml-2">
                {t('previewLabel')} {activeStep}
              </span>
            </div>

            <div className="pt-6 h-full flex flex-col justify-center flex-grow">
              {activeStep === 1 && (
                <div className="space-y-4 animate-fade-in text-left">
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3 shadow-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Pertanyaan
                      </label>
                      <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50">
                        Bagaimana efisiensi kode dengan AI?
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Tipe
                        </label>
                        <div className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold bg-white">
                          Pilihan Tunggal
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Timer
                        </label>
                        <div className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold bg-white">
                          30 Detik
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Opsi Pilihan
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center border border-slate-200">
                          A
                        </span>
                        <div className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-[10px] bg-white font-medium">
                          Sangat Efisien
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center border border-slate-200">
                          B
                        </span>
                        <div className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-[10px] bg-white font-medium">
                          Cukup Efisien
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-4 animate-fade-in text-left max-w-sm mx-auto w-full">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl text-center flex flex-col items-center shadow-xs">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Informasi Sesi Bergabung
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                      <svg
                        width="110"
                        height="110"
                        className="text-slate-900"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="2" y="2" width="6" height="6" />
                        <rect x="2" y="16" width="6" height="6" />
                        <rect x="16" y="2" width="6" height="6" />
                        <rect x="18" y="18" width="4" height="4" />
                        <path d="M10 2h2M10 6h2M14 2h2M10 10h4M18 10h4M2 12h4M16 14h2M12 18h2M10 14h2M14 18h2" />
                      </svg>
                    </div>
                    <div className="w-full">
                      <div className="bg-slate-50 px-2.5 py-1.5 border border-slate-100 rounded-lg flex items-center justify-between gap-2 mb-3">
                        <span className="text-slate-500 text-[10px] font-mono truncate">
                          livepoll.com/id/join/MG84BX
                        </span>
                        <div className="text-slate-400 p-1 shrink-0">
                          <Copy size={12} />
                        </div>
                      </div>
                      <div className="w-full border-t border-slate-100 pt-3 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kode Sesi</span>
                        <span className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-widest">
                          MG84BX
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4 animate-fade-in text-left bg-white dark:bg-slate-850 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-slate-900 dark:text-white">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-750 mb-3 text-slate-400 dark:text-slate-500 text-[9px] font-bold">
                    <span>Hasil Polling Real-time</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> 10 Respon
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-4">
                    Bagaimana efisiensi kode dengan AI?
                  </h3>
                  <div className="space-y-3.5 flex-grow text-slate-700 dark:text-slate-300">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-750">
                            A
                          </span>{' '}
                          Sangat Efisien
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          7 <span className="text-slate-400 dark:text-slate-500 text-[9px] font-normal">(70%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 dark:bg-white rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-750">
                            B
                          </span>{' '}
                          Cukup Efisien
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          2 <span className="text-slate-400 dark:text-slate-500 text-[9px] font-normal">(20%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-400 dark:bg-slate-300 rounded-full"
                          style={{ width: '20%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-white dark:bg-slate-900/60 border-t border-b border-slate-200 dark:border-slate-800 py-16 px-6"
      >
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('whyTitle')}
            </h2>
            <p className="text-xs text-slate-450 dark:text-slate-400">{t('whySubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: t('feature1Title'),
                desc: t('feature1Desc'),
              },
              {
                icon: QrCode,
                title: t('feature2Title'),
                desc: t('feature2Desc'),
              },
              {
                icon: Shield,
                title: t('feature3Title'),
                desc: t('feature3Desc'),
              },
              {
                icon: Tv,
                title: t('feature4Title'),
                desc: t('feature4Desc'),
              },
              {
                icon: Star,
                title: t('feature5Title'),
                desc: t('feature5Desc'),
              },
              {
                icon: CheckCircle,
                title: t('feature6Title'),
                desc: t('feature6Desc'),
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-start gap-4 hover:border-slate-350 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900"
              >
                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white shrink-0 border border-slate-200 dark:border-slate-700">
                  <feat.icon size={16} />
                </div>
                <div className="space-y-1 text-left">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{feat.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-16 px-6 max-w-3xl mx-auto w-full text-center space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('ctaTitle')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
          {t('ctaDesc')}
        </p>
        <div>
          <button
            onClick={() => navigate('/host/new')}
            className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-6 py-3 rounded-lg text-sm shadow transition-all hover:translate-y-[-1px]"
          >
            {t('ctaButton')} <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-3 text-xs font-semibold text-slate-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-400">
              <Layers size={16} />
              <span>LivePoll</span>
            </div>
            <span>&copy; {new Date().getFullYear()} LivePoll</span>
          </div>
          <div className="flex items-center justify-between sm:justify-start sm:gap-6">
            <a
              href="https://github.com/jutionck/livepoll"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <Code size={14} />
              <span>{t('footerOpenSource')}</span>
            </a>
            <a
              href="https://saweria.co/jutionck"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors"
            >
              <Heart size={14} />
              <span>{t('footerSupport')}</span>
            </a>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-center">
            <a
              href="https://mipdevp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <span>{t('footerFrom')}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
