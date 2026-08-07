import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const accountToken = request.headers.get('X-Host-Account-Token') || '';
    const hostId = request.headers.get('X-Host-Id') || '';

    let accountId: string | null = null;
    if (accountToken) {
      const account = await prisma.hostAccount.findFirst({
        where: { authTokenHash: crypto.createHash('sha256').update(accountToken).digest('hex') },
        select: { id: true },
      });
      accountId = account?.id ?? null;
    }

    const hostIdHash = hostId ? crypto.createHash('sha256').update(hostId).digest('hex') : null;

    if (!accountId && !hostIdHash) {
      return NextResponse.json({ account_id: null, sessions: [] });
    }

    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: { gt: new Date() },
        OR: accountId
          ? [{ hostAccountId: accountId }, ...(hostIdHash ? [{ hostIdHash }] : [])]
          : hostIdHash
            ? [{ hostIdHash }]
            : [],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        title: true,
        status: true,
        createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({
      account_id: accountId ?? null,
      sessions: sessions.map((s) => ({
        code: s.code,
        title: s.title,
        status: s.status,
        question_count: s._count.questions,
        created_at: s.createdAt,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
