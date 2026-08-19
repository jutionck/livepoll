import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
  const lang = getLang(request);
  if (!rateLimit(`clone-session:${getClientIp(request)}`, 10, 600_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { code, host_id, auth_token } = await request.json();
    const originalCode = String(code || '').toUpperCase();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!originalCode) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const original = await prisma.session.findUnique({ where: { code: originalCode } });
    if (!original) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== original.hostTokenHash) {
      return err('ACCESS_DENIED', 403, lang);
    }

    const questions = await prisma.question.findMany({
      where: { sessionCode: originalCode },
      orderBy: { qId: 'asc' },
    });
    if (questions.length === 0) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    // Generate a unique new session code
    let newCode = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let isUnique = false;
    for (let attempt = 0; attempt < 10 && !isUnique; attempt++) {
      newCode = '';
      for (let i = 0; i < 6; i++) {
        newCode += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await prisma.session.findUnique({ where: { code: newCode } });
      if (!existing) isUnique = true;
    }
    if (!isUnique) {
      return err('UNIQUE_CODE_FAIL', 500, lang);
    }

    const hostToken = crypto.randomBytes(16).toString('hex');
    const hostTokenHash = crypto.createHash('sha256').update(hostToken).digest('hex');
    const hostIdHash = host_id ? crypto.createHash('sha256').update(String(host_id)).digest('hex') : null;

    let hostAccountId: string | null = null;
    if (auth_token) {
      const account = await prisma.hostAccount.findFirst({
        where: { authTokenHash: crypto.createHash('sha256').update(String(auth_token)).digest('hex') },
        select: { id: true },
      });
      hostAccountId = account?.id ?? null;
    }

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          code: newCode,
          title: original.title,
          status: 'closed',
          paceMode: original.paceMode,
          activeQuestionId: null,
          activeQuestionActivatedAt: null,
          hostTokenHash,
          hostIdHash,
          hostAccountId,
          expiresAt,
        },
      });

      for (let i = 0; i < questions.length; i++) {
        const src = questions[i];
        await tx.question.create({
          data: {
            sessionCode: newCode,
            qId: `q${i + 1}`,
            type: src.type,
            title: src.title,
            options: JSON.parse(JSON.stringify(src.options ?? {})),
            timer: src.timer,
            correctAnswer: JSON.parse(JSON.stringify(src.correctAnswer ?? null)),
          },
        });
      }
    });

    return NextResponse.json({ code: newCode, host_token: hostToken });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
