import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import crypto from 'crypto';

import { isHostAuthorized } from '@/lib/host-auth';

export async function POST(request: Request) {
  const lang = getLang(request);
  try {
    const { code, question_id } = await request.json();

    if (!code || !question_id) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    if (!(await isHostAuthorized(session, request))) {
      return err('ACCESS_DENIED', 403, lang);
    }

    const question = await prisma.question.findUnique({
      where: { sessionCode_qId: { sessionCode: code.toUpperCase(), qId: question_id } },
    });
    if (!question) {
      return err('QUESTION_NOT_FOUND', 404, lang);
    }

    await prisma.session.update({
      where: { code: code.toUpperCase() },
      data: {
        activeQuestionId: question_id,
        activeQuestionActivatedAt: Math.floor(Date.now() / 1000),
        status: 'active',
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
