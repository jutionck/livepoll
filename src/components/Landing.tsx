'use client';

import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  ArrowRight,
  Play,
  QrCode,
  Shield,
  Layers,
  Tv,
  Users,
  Clock,
  Star,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Copy,
  MessageCircle,
  Send,
  Share2,
  Quote,
  Heart,
  Code,
  Trophy,
  UserCheck,
  Check,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ThemeToggle } from './ThemeToggle';
import { LanguageToggle } from './LanguageToggle';
import { API_BASE_URL, apiFetch } from '../config';

interface LandingProps {
  navigate: (path: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Landing: React.FC<LandingProps> = ({ navigate, theme, toggleTheme }) => {
  const [code, setCode] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [stats, setStats] = useState<{ sessions: number; votes: number } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [testimonials, setTestimonials] = useState<
    { id: string; name: string; role: string; message: string; rating: number }[]
  >([]);

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/testimonials`)
      .then((r) => r.json())
      .then((d) => {
        if (d.testimonials) setTestimonials(d.testimonials);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('https://api.github.com/repos/jutionck/livepoll')
      .then((r) => r.json())
      .then((d) => {
        if (d.stargazers_count !== undefined) setStars(d.stargazers_count);
      })
      .catch(() => {});
  }, []);
  const t = useTranslations('landing');
  const tn = useTranslations('nav');
  const locale = useLocale();
  const siteUrl = `https://livepoll.mipdevp.com/${locale}`;

  useEffect(() => {
    apiFetch(`${API_BASE_URL}/stats`)
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

  const handleDemo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'LivePoll Demo Session',
          questions: [
            {
              type: 'multiple_choice',
              title: 'Seberapa tertarik Anda mencoba LivePoll?',
              options: ['Sangat tertarik!', 'Lumayan', 'Masih ragu'],
              timer: 60,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal.');
      navigate(`/join/${data.code}`);
    } catch {
      alert(t('ctaDemoLoading'));
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dots flex flex-col font-sans selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={20} className="text-slate-900 dark:text-white shrink-0" />
            <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {tn('brand')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <a
              href="https://github.com/jutionck/livepoll"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 transition-colors"
              aria-label="GitHub stars"
            >
              <Star size={13} className="fill-amber-400 text-amber-400" />
              {stars !== null ? stars : 'GitHub'}
            </a>
            <LanguageToggle />
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <button
              onClick={() => navigate('/host/new')}
              className="text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 px-2.5 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
              title={tn('createPoll')}
            >
              <PlusCircle size={16} />
              <span className="hidden sm:inline">{tn('createPoll')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <span className="inline-block text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
              {t('badge')}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {t('headline')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
              {t('subheadline')}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => navigate('/host/new')}
                className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-all whitespace-nowrap"
              >
                <PlusCircle size={14} /> {t('ctaPrimary')}
              </button>
              <button
                onClick={handleDemo}
                disabled={demoLoading}
                className="inline-flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 font-bold px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-all bg-white dark:bg-slate-900 whitespace-nowrap disabled:opacity-60"
              >
                <Play size={14} />
                {demoLoading ? t('ctaDemoLoading') : t('ctaDemo')}
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-3.5 py-2.5 rounded-lg text-xs sm:text-sm transition-all bg-white dark:bg-slate-900 whitespace-nowrap"
              >
                {t('ctaSecondary')}
              </a>
            </div>
          </div>

          {/* Right Column: Code Entry Form */}
          <div className="lg:col-span-5">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-slate-500 dark:text-slate-500" />
                <h3 className="font-bold text-xs text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                  {t('forParticipants')}
                </h3>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 text-left">{t('joinTitle')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed text-left">
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
          <div className="max-w-3xl mx-auto flex flex-row items-center justify-center flex-wrap gap-x-6 sm:gap-x-10 gap-y-2">
            {stats.sessions > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 shrink-0">
                  <Layers size={13} />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  <span className="text-slate-900 dark:text-white">{stats.sessions}</span> {t('statsSessions')}
                </p>
              </div>
            )}
            {stats.votes > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 shrink-0">
                  <CheckCircle size={13} />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
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
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('howItWorksSubtitle')}</p>
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
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-transparent'
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
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600"></div>
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
                        {t('mockupQuestionLabel')}
                      </label>
                      <div className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-slate-50">
                        {t('mockupQuestion')}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {t('mockupTypeLabel')}
                        </label>
                        <div className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold bg-white">
                          {t('mockupTypeSingle')}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {t('mockupTimerLabel')}
                        </label>
                        <div className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold bg-white">
                          {t('mockupTimer30')}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1.5">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('mockupOptionsLabel')}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center border border-slate-200">
                          A
                        </span>
                        <div className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-[10px] bg-white font-medium">
                          {t('mockupOptionA')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 text-[9px] font-black flex items-center justify-center border border-slate-200">
                          B
                        </span>
                        <div className="flex-1 px-3 py-1 border border-slate-200 rounded-lg text-[10px] bg-white font-medium">
                          {t('mockupOptionB')}
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
                      {t('mockupJoinInfo')}
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
                          {window.location.host}/{locale}/join/MG84BX
                        </span>
                        <div className="text-slate-400 p-1 shrink-0">
                          <Copy size={12} />
                        </div>
                      </div>
                      <div className="w-full border-t border-slate-100 pt-3 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {t('mockupSessionCode')}
                        </span>
                        <span className="bg-slate-900 text-white font-bold px-2 py-0.5 rounded text-[10px] tracking-widest">
                          MG84BX
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-4 animate-fade-in text-left bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs text-slate-900 dark:text-white">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-700 mb-3 text-slate-400 dark:text-slate-500 text-[9px] font-bold">
                    <span>{t('mockupResults')}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> {t('mockupResponses', { n: 10 })}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-4">{t('mockupQuestion')}</h3>
                  <div className="space-y-3.5 flex-grow text-slate-700 dark:text-slate-300">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-700">
                            A
                          </span>{' '}
                          {t('mockupOptionA')}
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
                          <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black flex items-center justify-center uppercase border border-slate-200 dark:border-slate-700">
                            B
                          </span>{' '}
                          {t('mockupOptionB')}
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
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('whySubtitle')}</p>
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
              {
                icon: Trophy,
                title: t('feature7Title'),
                desc: t('feature7Desc'),
              },
              {
                icon: UserCheck,
                title: t('feature8Title'),
                desc: t('feature8Desc'),
              },
              {
                icon: Layers,
                title: t('feature9Title'),
                desc: t('feature9Desc'),
              },
            ].map((feat, idx) => (
              <div
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-start gap-4 hover:border-slate-400 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900"
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

      {/* Video Demo Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('videoTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('videoSubtitle')}</p>
          </div>

          <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
            <iframe
              className="w-full h-full"
              src="https://www.youtube.com/embed/4pAcFzw8B6w"
              title="LivePoll Demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('compareTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('compareSubtitle')}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider">
              <span className="text-slate-400 dark:text-slate-500">{t('compareFeature')}</span>
              <span className="text-center text-slate-900 dark:text-white">{t('compareWe')}</span>
              <span className="text-center text-slate-400 dark:text-slate-500">{t('compareThem')}</span>
            </div>
            {[
              { feature: t('compareFree'), we: true, them: false },
              { feature: t('compareLimits'), we: false, them: true },
              { feature: t('compareAccount'), we: true, them: false },
              { feature: t('compareTimer'), we: true, them: false },
              { feature: t('compareOpen'), we: true, them: false },
            ].map((row, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-3 gap-2 px-5 py-3 text-xs font-semibold ${
                  idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <span className="text-slate-700 dark:text-slate-300">{row.feature}</span>
                <span className="flex justify-center text-emerald-500">
                  {row.we ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                </span>
                <span className="flex justify-center text-red-400">
                  {row.them ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('faqTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('faqSubtitle')}</p>
          </div>

          <div className="space-y-3">
            {t.raw('faqItems').map((item: { q: string; a: string }, idx: number) => (
              <details
                key={idx}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer select-none text-sm font-bold text-slate-900 dark:text-white list-none">
                  {item.q}
                  <ChevronDown
                    size={16}
                    className="text-slate-400 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="px-5 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Share Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-3xl mx-auto w-full text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            {t('shareTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">{t('shareDesc')}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent('LivePoll — ' + siteUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              <MessageCircle size={16} />
              {t('shareWhatsapp')}
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=LivePoll`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              <Send size={16} />
              {t('shareTelegram')}
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('LivePoll — Real-time interactive polling')}&url=${encodeURIComponent(siteUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm transition-all"
            >
              <Share2 size={16} />
              {t('shareX')}
            </a>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 px-6 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-3xl mx-auto w-full text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            {t('testimonialTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">{t('testimonialSubtitle')}</p>

          {testimonials.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10">
              <Quote size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400 italic max-w-md mx-auto leading-relaxed">
                {t('testimonialPlaceholder')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {testimonials.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5"
                >
                  <div className="flex gap-0.5 text-amber-400 mb-3">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    &ldquo;{item.message}&rdquo;
                  </p>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{item.name}</p>
                    {item.role && <p className="text-[10px] text-slate-400">{item.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
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
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-4 text-xs font-semibold text-slate-400">
          {/* Row 1: Brand + Language toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Layers size={16} />
              <span className="text-slate-900 dark:text-white">LivePoll</span>
            </div>
            <LanguageToggle />
          </div>

          {/* Row 2: Links */}
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

          {/* Row 3: Divider + attribution */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-col sm:flex-row items-center justify-between gap-1.5">
            <span>&copy; {new Date().getFullYear()} LivePoll</span>
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
