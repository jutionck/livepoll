import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg } from '@/lib/api-errors';
import crypto from 'crypto';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const accountToken = request.headers.get('X-Host-Account-Token') || '';

    // Sessions are only listed for a logged-in account and owned by it.
    if (!accountToken) {
      return NextResponse.json({ account_id: null, sessions: [] });
    }

    const account = await prisma.hostAccount.findFirst({
      where: { authTokenHash: crypto.createHash('sha256').update(accountToken).digest('hex') },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ account_id: null, sessions: [] });
    }

    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: { gt: new Date() },
        hostAccountId: account.id,
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
      account_id: account.id,
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
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
