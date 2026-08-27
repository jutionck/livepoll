import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, err } from '@/lib/api-errors';
import crypto from 'crypto';

export type PresetRange = '24h' | '7d' | '28d' | '3m' | '6m' | '12m' | '16m';
export type KpiRangeKey = PresetRange | 'custom';
type Granularity = 'hour' | 'day' | 'week' | 'month';

const PRESET_HOURS: Record<PresetRange, number> = {
  '24h': 24,
  '7d': 7 * 24,
  '28d': 28 * 24,
  '3m': 90 * 24,
  '6m': 182 * 24,
  '12m': 365 * 24,
  '16m': 486 * 24,
};

const MAX_CUSTOM_SPAN_DAYS = 400;
const MAX_BUCKETS = 400;

function isAdmin(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const token = request.headers.get('X-Admin-Token') || '';
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expected = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return hash === expected;
}

function pickGranularity(spanDays: number): Granularity {
  if (spanDays <= 2) return 'hour';
  if (spanDays <= 60) return 'day';
  if (spanDays <= 210) return 'week';
  return 'month';
}

interface ResolvedRange {
  rangeKey: KpiRangeKey;
  since: Date;
  until: Date;
  granularity: Granularity;
}

function resolveRange(request: Request): ResolvedRange | null {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('range');
  const until = new Date();

  if (raw === 'custom') {
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    if (!fromStr || !toStr) return null;
    const since = new Date(`${fromStr}T00:00:00.000Z`);
    const untilCustom = new Date(`${toStr}T23:59:59.999Z`);
    if (isNaN(since.getTime()) || isNaN(untilCustom.getTime())) return null;
    if (since.getTime() > untilCustom.getTime()) return null;
    const cappedUntil = untilCustom.getTime() > until.getTime() ? until : untilCustom;
    const spanDays = (cappedUntil.getTime() - since.getTime()) / (24 * 3600 * 1000);
    if (spanDays > MAX_CUSTOM_SPAN_DAYS) return null;
    return { rangeKey: 'custom', since, until: cappedUntil, granularity: pickGranularity(spanDays) };
  }

  const presetKeys: PresetRange[] = ['24h', '7d', '28d', '3m', '6m', '12m', '16m'];
  const rangeKey = presetKeys.includes(raw as PresetRange) ? (raw as PresetRange) : '28d';
  const hours = PRESET_HOURS[rangeKey];
  const since = new Date();
  since.setUTCHours(since.getUTCHours() - hours);
  const granularity: Granularity =
    hours <= 24 ? 'hour' : hours <= 28 * 24 ? 'day' : hours <= 90 * 24 ? 'week' : 'month';
  return { rangeKey, since, until, granularity };
}

function bucketStart(date: Date, granularity: Granularity): Date {
  const d = new Date(date);
  if (granularity === 'hour') {
    d.setUTCMinutes(0, 0, 0);
  } else if (granularity === 'day') {
    d.setUTCHours(0, 0, 0, 0);
  } else if (granularity === 'week') {
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay();
    const diff = (day === 0 ? -6 : 1) - day; // align to Monday, matches Postgres date_trunc('week', ...)
    d.setUTCDate(d.getUTCDate() + diff);
  } else {
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(1);
  }
  return d;
}

function stepBucket(date: Date, granularity: Granularity, steps: number): Date {
  const d = new Date(date);
  if (granularity === 'hour') d.setUTCHours(d.getUTCHours() + steps);
  else if (granularity === 'day') d.setUTCDate(d.getUTCDate() + steps);
  else if (granularity === 'week') d.setUTCDate(d.getUTCDate() + steps * 7);
  else d.setUTCMonth(d.getUTCMonth() + steps);
  return d;
}

function buildBucketList(since: Date, until: Date, granularity: Granularity): Date[] {
  const list: Date[] = [];
  let cur = bucketStart(since, granularity);
  const endBucket = bucketStart(until, granularity);
  while (cur.getTime() <= endBucket.getTime() && list.length < MAX_BUCKETS) {
    list.push(new Date(cur));
    cur = stepBucket(cur, granularity, 1);
  }
  return list;
}

interface BucketCount {
  bucket: Date;
  count: bigint;
}

function fillBuckets(rows: BucketCount[], bucketList: Date[]): { date: string; count: number }[] {
  const byBucket = new Map(rows.map((r) => [new Date(r.bucket).toISOString(), Number(r.count)]));
  return bucketList.map((b) => ({ date: b.toISOString(), count: byBucket.get(b.toISOString()) || 0 }));
}

async function fetchVercelTraffic(since: Date, until: Date, granularity: Granularity, bucketList: Date[]) {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !projectId) return null;

  const base = 'https://api.vercel.com/v1/query/web-analytics';
  const commonParams = new URLSearchParams({ projectId, since: since.toISOString(), until: until.toISOString() });
  if (teamId) commonParams.set('teamId', teamId);

  try {
    const countUrl = `${base}/visits/count?${commonParams.toString()}`;

    const aggregateParams = new URLSearchParams(commonParams);
    aggregateParams.set('by', granularity);
    const aggregateUrl = `${base}/visits/aggregate?${aggregateParams.toString()}`;

    const [countRes, aggregateRes] = await Promise.all([
      fetch(countUrl, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }),
      fetch(aggregateUrl, { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } }),
    ]);

    if (!countRes.ok || !aggregateRes.ok) {
      const failed = !countRes.ok ? countRes : aggregateRes;
      const body = await failed.text().catch(() => '');
      console.error('[kpi] Vercel Web Analytics request failed', failed.status, body);
      return { connected: true, error: true, status: failed.status, detail: body.slice(0, 300) } as const;
    }

    const countData = await countRes.json();
    const aggregateData = await aggregateRes.json();

    const byBucket = new Map<string, { pageviews: number; visitors: number }>(
      (aggregateData.data || []).map((row: any) => [
        new Date(row.timestamp).toISOString(),
        { pageviews: row.pageviews || 0, visitors: row.visitors || 0 },
      ]),
    );
    const trend = bucketList.map((b) => {
      const found = byBucket.get(b.toISOString());
      return { date: b.toISOString(), pageviews: found?.pageviews || 0, visitors: found?.visitors || 0 };
    });

    return {
      connected: true,
      error: false,
      pageviews: countData.data?.pageviews || 0,
      visitors: countData.data?.visitors || 0,
      trend,
    } as const;
  } catch (e: any) {
    console.error('[kpi] Vercel Web Analytics fetch threw', e);
    return { connected: true, error: true, status: 0, detail: e?.message || 'Network error' } as const;
  }
}

export async function GET(request: Request) {
  const lang = getLang(request);
  if (!isAdmin(request)) {
    return err('UNAUTHORIZED', 401, lang);
  }

  const resolved = resolveRange(request);
  if (!resolved) {
    return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 });
  }
  const { rangeKey, since, until, granularity } = resolved;

  try {
    const bucketList = buildBucketList(since, until, granularity);

    const [totalSessions, totalVotes, totalParticipants, selfPacedCount, quizSessionRows, sessionsPerBucket] =
      await Promise.all([
        prisma.session.count({ where: { createdAt: { gte: since, lte: until } } }),
        prisma.vote.count({ where: { updatedAt: { gte: since, lte: until } } }),
        prisma.joinedParticipant.count({ where: { createdAt: { gte: since, lte: until } } }),
        prisma.session.count({ where: { paceMode: 'self_paced', createdAt: { gte: since, lte: until } } }),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT count(DISTINCT s.code) as count
          FROM sessions s
          JOIN questions q ON q.session_code = s.code
          WHERE q.correct_answer IS NOT NULL AND s.created_at >= ${since} AND s.created_at <= ${until}
        `,
        prisma.$queryRaw<BucketCount[]>`
          SELECT date_trunc(${granularity}, created_at) as bucket, count(*) as count
          FROM sessions
          WHERE created_at >= ${since} AND created_at <= ${until}
          GROUP BY bucket ORDER BY bucket ASC
        `,
      ]);

    const traffic = await fetchVercelTraffic(since, until, granularity, bucketList);

    return NextResponse.json({
      range: rangeKey,
      since: since.toISOString(),
      until: until.toISOString(),
      totals: {
        sessions: totalSessions,
        votes: totalVotes,
        participants: totalParticipants,
        selfPaced: selfPacedCount,
        presenter: totalSessions - selfPacedCount,
        quizzes: Number(quizSessionRows[0]?.count || 0),
      },
      sessionsTrend: fillBuckets(sessionsPerBucket, bucketList),
      traffic,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
