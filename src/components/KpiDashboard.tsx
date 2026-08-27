'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Users,
  Vote,
  Trophy,
  Radio,
  Eye,
  UserCheck,
  AlertCircle,
  Link2,
  Check,
  ChevronDown,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../config';

interface KpiDashboardProps {
  token: string;
  theme: 'light' | 'dark';
}

type PresetRange = '24h' | '7d' | '28d' | '3m' | '6m' | '12m' | '16m';
type KpiRangeKey = PresetRange | 'custom';

interface RangeSelection {
  key: KpiRangeKey;
  from?: string;
  to?: string;
}

const PRIMARY_RANGE_OPTIONS: { value: PresetRange; labelKey: string }[] = [
  { value: '24h', labelKey: 'range24h' },
  { value: '7d', labelKey: 'range7d' },
  { value: '28d', labelKey: 'range28d' },
  { value: '3m', labelKey: 'range3m' },
];

const MORE_RANGE_OPTIONS: { value: PresetRange; labelKey: string }[] = [
  { value: '6m', labelKey: 'range6m' },
  { value: '12m', labelKey: 'range12m' },
  { value: '16m', labelKey: 'range16m' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function rangeQuery(sel: RangeSelection): string {
  if (sel.key === 'custom' && sel.from && sel.to) {
    return `range=custom&from=${sel.from}&to=${sel.to}`;
  }
  return `range=${sel.key}`;
}

interface KpiTotals {
  sessions: number;
  votes: number;
  participants: number;
  selfPaced: number;
  presenter: number;
  quizzes: number;
}

interface DayCount {
  date: string;
  count: number;
}

interface TrafficDay {
  date: string;
  pageviews: number;
  visitors: number;
}

interface Traffic {
  connected: boolean;
  error: boolean;
  status?: number;
  detail?: string;
  pageviews?: number;
  visitors?: number;
  trend?: TrafficDay[];
}

interface KpiData {
  range: KpiRangeKey;
  totals: KpiTotals;
  sessionsTrend: DayCount[];
  traffic: Traffic | null;
}

const CHART_W = 600;
const CHART_H = 160;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 24;

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Infers bucket spacing from the first two points so charts don't need to know the range key. */
function bucketSpacingMs(dates: string[]): number {
  if (dates.length < 2) return DAY_MS;
  return new Date(dates[1]).getTime() - new Date(dates[0]).getTime();
}

function formatBucket(dateStr: string, locale: string, spacingMs: number, withYear: boolean) {
  const d = new Date(dateStr);
  const l = locale === 'id' ? 'id-ID' : 'en-US';
  if (spacingMs <= HOUR_MS * 1.5) {
    return d.toLocaleTimeString(l, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });
  }
  if (spacingMs >= DAY_MS * 27) {
    return d.toLocaleDateString(l, { month: 'short', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' });
  }
  return d.toLocaleDateString(l, { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function clampPct(p: number) {
  return Math.min(92, Math.max(8, p));
}

const ChartTooltip: React.FC<{ leftPct: number; children: React.ReactNode }> = ({ leftPct, children }) => (
  <div
    className="absolute top-1 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-2.5 py-1.5 text-[11px] leading-snug text-slate-700 dark:text-slate-200 pointer-events-none whitespace-nowrap z-10"
    style={{ left: `${leftPct}%` }}
  >
    {children}
  </div>
);

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string; accent: string }> = ({
  icon: Icon,
  label,
  value,
  accent,
}) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${accent}`}>
      <Icon size={15} />
    </div>
    <p className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">{value}</p>
    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
  </div>
);

const TrendBarChart: React.FC<{
  data: DayCount[];
  theme: 'light' | 'dark';
  locale: string;
  totalLabel: string;
}> = ({ data, theme, locale, totalLabel }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const labelColor = theme === 'dark' ? '#64748b' : '#94a3b8';
  const crosshairColor = theme === 'dark' ? '#475569' : '#cbd5e1';
  const max = Math.max(1, ...data.map((d) => d.count));
  const innerH = CHART_H - PAD_T - PAD_B;
  const innerW = CHART_W - PAD_L - PAD_R;
  const slot = innerW / data.length;
  const barW = Math.min(28, slot * 0.55);
  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  const spacing = bucketSpacingMs(data.map((d) => d.date));

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const xUser = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.floor((xUser - PAD_L) / slot);
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx !== null ? PAD_L + hoverIdx * slot + slot / 2 : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label="Sessions trend chart"
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <line
          x1={PAD_L}
          y1={CHART_H - PAD_B}
          x2={CHART_W - PAD_R}
          y2={CHART_H - PAD_B}
          stroke={gridColor}
          strokeWidth={1}
        />
        {hoveredX !== null && (
          <line
            x1={hoveredX}
            y1={PAD_T}
            x2={hoveredX}
            y2={CHART_H - PAD_B}
            stroke={crosshairColor}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          const x = PAD_L + i * slot + (slot - barW) / 2;
          const y = CHART_H - PAD_B - h;
          const r = Math.min(4, barW / 2, Math.max(h, 1));
          const showLabel = i % labelStep === 0;
          const dimmed = hoverIdx !== null && hoverIdx !== i;
          return (
            <g key={d.date}>
              <path
                d={
                  h <= r
                    ? `M${x},${CHART_H - PAD_B} L${x},${y} L${x + barW},${y} L${x + barW},${CHART_H - PAD_B} Z`
                    : `M${x},${CHART_H - PAD_B} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${CHART_H - PAD_B} Z`
                }
                fill="#10b981"
                opacity={dimmed ? 0.35 : 1}
                style={{ transition: 'opacity 0.1s ease' }}
              />
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={CHART_H - 6}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill={labelColor}
                >
                  {formatBucket(d.date, locale, spacing, false)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && hoveredX !== null && (
        <ChartTooltip leftPct={clampPct((hoveredX / CHART_W) * 100)}>
          <div className="font-bold text-slate-900 dark:text-white">
            {formatBucket(hovered.date, locale, spacing, true)}: {hovered.count}
          </div>
          <div className="text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
            {totalLabel}
          </div>
        </ChartTooltip>
      )}
    </div>
  );
};

const TrendLineChart: React.FC<{
  data: TrafficDay[];
  theme: 'light' | 'dark';
  locale: string;
  totalLabel: string;
  pageviewsLabel: string;
  visitorsLabel: string;
}> = ({ data, theme, locale, totalLabel, pageviewsLabel, visitorsLabel }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0';
  const labelColor = theme === 'dark' ? '#64748b' : '#94a3b8';
  const crosshairColor = theme === 'dark' ? '#475569' : '#cbd5e1';
  const max = Math.max(1, ...data.map((d) => Math.max(d.pageviews, d.visitors)));
  const innerH = CHART_H - PAD_T - PAD_B;
  const innerW = CHART_W - PAD_L - PAD_R;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  const spacing = bucketSpacingMs(data.map((d) => d.date));

  const points = (key: 'pageviews' | 'visitors') =>
    data.map((d, i) => {
      const x = PAD_L + i * step;
      const y = CHART_H - PAD_B - (d[key] / max) * innerH;
      return { x, y };
    });

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  const pv = points('pageviews');
  const vi = points('visitors');

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || step === 0) return;
    const xUser = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const idx = Math.round((xUser - PAD_L) / step);
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;
  const hoveredX = hoverIdx !== null ? pv[hoverIdx].x : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label="Traffic trend chart"
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIdx(null)}
      >
        <line
          x1={PAD_L}
          y1={CHART_H - PAD_B}
          x2={CHART_W - PAD_R}
          y2={CHART_H - PAD_B}
          stroke={gridColor}
          strokeWidth={1}
        />
        {hoveredX !== null && (
          <line
            x1={hoveredX}
            y1={PAD_T}
            x2={hoveredX}
            y2={CHART_H - PAD_B}
            stroke={crosshairColor}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
        <path
          d={toPath(pv)}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={toPath(vi)}
          fill="none"
          stroke="#f43f5e"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const isHovered = i === hoverIdx;
          return (
            <g key={d.date}>
              <circle cx={pv[i].x} cy={pv[i].y} r={isHovered ? 4 : 2.5} fill="#0ea5e9" />
              <circle cx={vi[i].x} cy={vi[i].y} r={isHovered ? 4 : 2.5} fill="#f43f5e" />
              {i % labelStep === 0 && (
                <text x={pv[i].x} y={CHART_H - 6} textAnchor="middle" fontSize={8} fontWeight={700} fill={labelColor}>
                  {formatBucket(d.date, locale, spacing, false)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && hoveredX !== null && (
        <ChartTooltip leftPct={clampPct((hoveredX / CHART_W) * 100)}>
          <div className="font-bold text-slate-900 dark:text-white mb-0.5">
            {formatBucket(hovered.date, locale, spacing, true)}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" /> {pageviewsLabel}: {hovered.pageviews}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> {visitorsLabel}: {hovered.visitors}
          </div>
          <div className="text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
            {totalLabel}
          </div>
        </ChartTooltip>
      )}
    </div>
  );
};

const DateRangeModal: React.FC<{
  initial: RangeSelection;
  onCancel: () => void;
  onApply: (sel: RangeSelection) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}> = ({ initial, onCancel, onApply, t }) => {
  const [choice, setChoice] = useState<PresetRange | 'custom'>(
    initial.key === 'custom' || MORE_RANGE_OPTIONS.some((o) => o.value === initial.key)
      ? (initial.key as PresetRange | 'custom')
      : '6m',
  );
  const [from, setFrom] = useState(initial.from || todayStr());
  const [to, setTo] = useState(initial.to || todayStr());

  const canApply = choice !== 'custom' || (from && to && from <= to);

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-xl text-slate-900 dark:text-white">
        <h3 className="text-base font-bold mb-4">{t('kpiDateRangeTitle')}</h3>

        <div className="space-y-1">
          {MORE_RANGE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 py-2 px-1 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  choice === opt.value ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {choice === opt.value && <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />}
              </span>
              <input
                type="radio"
                name="kpi-range"
                className="sr-only"
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
              />
              <span className="text-sm">{t(opt.labelKey)}</span>
            </label>
          ))}

          <label className="flex items-center gap-2.5 py-2 px-1 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                choice === 'custom' ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {choice === 'custom' && <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white" />}
            </span>
            <input
              type="radio"
              name="kpi-range"
              className="sr-only"
              checked={choice === 'custom'}
              onChange={() => setChoice('custom')}
            />
            <span className="text-sm">{t('kpiCustomRange')}</span>
          </label>
        </div>

        {choice === 'custom' && (
          <div className="flex items-center gap-2 mt-2 mb-1 pl-7">
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t('kpiStartDate')}
              </label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t('kpiEndDate')}
              </label>
              <input
                type="date"
                value={to}
                min={from}
                max={todayStr()}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => onApply(choice === 'custom' ? { key: 'custom', from, to } : { key: choice })}
            className="px-4 py-2 text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 rounded-lg disabled:opacity-40 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const KpiDashboard: React.FC<KpiDashboardProps> = ({ token, theme }) => {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [range, setRangeState] = useState<RangeSelection>({ key: '28d' });
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (data) setRefreshing(true);
    else setLoading(true);
    apiFetch(`${API_BASE_URL}/admin/kpi?${rangeQuery(range)}`, { headers: { 'X-Admin-Token': token } })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load KPI data');
        if (!cancelled) {
          setData(json);
          setError('');
          setLastUpdated(new Date());
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range, refreshKey]);

  const fmt = (n: number) => n.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US');

  const isMoreActive = range.key === 'custom' || MORE_RANGE_OPTIONS.some((o) => o.value === range.key);
  const activeRangeLabel =
    range.key === 'custom'
      ? `${range.from} — ${range.to}`
      : t(
          (PRIMARY_RANGE_OPTIONS.find((o) => o.value === range.key) ||
            MORE_RANGE_OPTIONS.find((o) => o.value === range.key))!.labelKey,
        );
  const moreLabel = isMoreActive ? activeRangeLabel : t('kpiMore');

  const rangeFilter = (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
          {PRIMARY_RANGE_OPTIONS.map((opt) => {
            const active = range.key === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRangeState({ key: opt.value })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {active && <Check size={11} />}
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[11px] font-bold transition-colors ${
            isMoreActive
              ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          {isMoreActive ? <Check size={11} /> : <Calendar size={11} />}
          <span className="max-w-[160px] truncate">{moreLabel}</span>
          <ChevronDown size={12} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {lastUpdated && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            {t('kpiLastUpdated', {
              time: lastUpdated.toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            })}
          </span>
        )}
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={refreshing || loading}
          aria-label={t('kpiRefresh')}
          title={t('kpiRefresh')}
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );

  if (loading || error || !data) {
    return (
      <div className="space-y-6">
        {rangeFilter}
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">{t('kpiLoading')}</p>
        ) : (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs text-red-700 dark:text-red-400">
            {error || t('genericError')}
          </div>
        )}
        {showModal && (
          <DateRangeModal
            initial={range}
            t={t}
            onCancel={() => setShowModal(false)}
            onApply={(sel) => {
              setRangeState(sel);
              setShowModal(false);
            }}
          />
        )}
      </div>
    );
  }

  const { totals, sessionsTrend, traffic } = data;

  return (
    <div className="space-y-6">
      {rangeFilter}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Radio}
          label={t('kpiSessions')}
          value={fmt(totals.sessions)}
          accent="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={Vote}
          label={t('kpiVotes')}
          value={fmt(totals.votes)}
          accent="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={Users}
          label={t('kpiParticipants')}
          value={fmt(totals.participants)}
          accent="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400"
        />
        <StatCard
          icon={Trophy}
          label={t('kpiQuizzes')}
          value={fmt(totals.quizzes)}
          accent="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={UserCheck}
          label={t('kpiSelfPaced')}
          value={fmt(totals.selfPaced)}
          accent="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400"
        />
        <StatCard
          icon={UserCheck}
          label={t('kpiPresenter')}
          value={fmt(totals.presenter)}
          accent="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
          {t('kpiSessionsTrend', { range: activeRangeLabel })}
        </h3>
        <TrendBarChart
          data={sessionsTrend}
          theme={theme}
          locale={locale}
          totalLabel={t('kpiTooltipTotal', { total: fmt(totals.sessions) })}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">{t('kpiTraffic')}</h3>

        {!traffic || !traffic.connected ? (
          <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg p-3">
            <Link2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('kpiTrafficNotConnected')}
            </p>
          </div>
        ) : traffic.error ? (
          <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3">
            <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <p>{t('kpiTrafficError')}</p>
              {(traffic.status || traffic.detail) && (
                <p className="mt-1 font-mono text-[10px] opacity-80 break-all">
                  {traffic.status ? `HTTP ${traffic.status}` : ''}
                  {traffic.status && traffic.detail ? ' — ' : ''}
                  {traffic.detail}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard
                icon={Eye}
                label={t('kpiPageviews')}
                value={fmt(traffic.pageviews || 0)}
                accent="bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400"
              />
              <StatCard
                icon={Users}
                label={t('kpiVisitors')}
                value={fmt(traffic.visitors || 0)}
                accent="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
              />
            </div>

            <div className="flex items-center gap-4 mb-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> {t('kpiPageviews')}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> {t('kpiVisitors')}
              </span>
            </div>
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              {t('kpiTrafficTrend', { range: activeRangeLabel })}
            </h4>
            <TrendLineChart
              data={traffic.trend || []}
              theme={theme}
              locale={locale}
              pageviewsLabel={t('kpiPageviews')}
              visitorsLabel={t('kpiVisitors')}
              totalLabel={t('kpiTooltipTrafficTotal', {
                pageviews: fmt(traffic.pageviews || 0),
                visitors: fmt(traffic.visitors || 0),
              })}
            />
          </>
        )}
      </div>

      {showModal && (
        <DateRangeModal
          initial={range}
          t={t}
          onCancel={() => setShowModal(false)}
          onApply={(sel) => {
            setRangeState(sel);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};
