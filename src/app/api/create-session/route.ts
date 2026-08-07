import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { hasOffensiveContent } from '@/lib/moderation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(request: Request) {
  const lang = getLang(request);
  // Rate limit: 10 session creations per 10 minutes per IP
  if (!rateLimit(`create-session:${getClientIp(request)}`, 10, 600_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { title, questions, host_name, host_org, host_id, start_now, auth_token } = await request.json();

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    // Content moderation check (SARA/hate speech)
    const flaggedTexts: (string | undefined)[] = [title, host_name, host_org];
    for (const q of questions) {
      flaggedTexts.push(String(q.title ?? ''));
      if (Array.isArray(q.options)) {
        q.options.forEach((o: unknown) => flaggedTexts.push(String(o ?? '')));
      } else if (q.options && typeof q.options === 'object') {
        Object.values(q.options).forEach((o) => flaggedTexts.push(String(o ?? '')));
      }
    }
    if (hasOffensiveContent(...flaggedTexts)) {
      return err('MODERATION', 422, lang);
    }

    // Generate unique session code
    let code = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await prisma.session.findUnique({ where: { code } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return err('UNIQUE_CODE_FAIL', 500, lang);
    }
    // Generate host token
    const hostToken = crypto.randomBytes(16).toString('hex');
    const hostTokenHash = crypto.createHash('sha256').update(hostToken).digest('hex');
    const hostIdHash = host_id ? crypto.createHash('sha256').update(String(host_id)).digest('hex') : null;

    // Optional account login: link session to the host account
    let hostAccountId: string | null = null;
    if (auth_token) {
      const account = await prisma.hostAccount.findFirst({
        where: { authTokenHash: crypto.createHash('sha256').update(String(auth_token)).digest('hex') },
        select: { id: true },
      });
      hostAccountId = account?.id ?? null;
    }
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours
    const startNow = start_now !== false;
    const status = startNow ? 'active' : 'closed';
    const firstQId = 'q1';
    const activeQuestionId = startNow ? firstQId : null;
    const activeQuestionActivatedAt = startNow ? Math.floor(Date.now() / 1000) : null;

    const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    // Transaction to insert session and questions
    await prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          code,
          title,
          status,
          hostName: host_name ? String(host_name).slice(0, 100) : null,
          hostOrg: host_org ? String(host_org).slice(0, 150) : null,
          activeQuestionId,
          activeQuestionActivatedAt,
          hostTokenHash,
          hostIdHash,
          hostAccountId,
          expiresAt,
        },
      });

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = `q${i + 1}`;
        const timerVal = q.timer !== undefined ? q.timer : null;

        // Convert array options to key-value object
        const optionsObj: Record<string, string> = {};
        if (q.type !== 'rating' && Array.isArray(q.options)) {
          q.options.forEach((opt: string, idx: number) => {
            const trimmed = opt.trim();
            if (trimmed) {
              const key = idx < labels.length ? labels[idx] : `opt${idx + 1}`;
              optionsObj[key] = trimmed;
            }
          });
        }

        await tx.question.create({
          data: {
            sessionCode: code,
            qId,
            type: q.type,
            title: q.title,
            options: optionsObj,
            timer: timerVal,
            correctAnswer: q.correct_answer
              ? Array.isArray(q.correct_answer)
                ? q.correct_answer
                : [q.correct_answer]
              : undefined,
          },
        });
      }
    });

    return NextResponse.json(
      {
        code,
        host_token: hostToken,
        title,
        active_question_id: firstQId,
        active_question_activated_at: Math.floor(Date.now() / 1000),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
