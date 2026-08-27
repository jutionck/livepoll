import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { hasOffensiveContent } from '@/lib/moderation';

export async function POST(request: Request) {
  const lang = getLang(request);
  // Rate limit: 30 votes per minute per IP
  if (!rateLimit(`vote:${getClientIp(request)}`, 30, 60_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { code, question_id, participant_id, participant_name, vote } = await request.json();

    if (!code || !question_id || !participant_id || vote === undefined) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    if (session.status !== 'active') {
      return err('VOTING_CLOSED', 400, lang);
    }

    if (session.paceMode !== 'self_paced' && session.activeQuestionId !== question_id) {
      return err('QUESTION_INACTIVE', 400, lang);
    }

    const question = await prisma.question.findUnique({
      where: { sessionCode_qId: { sessionCode: code.toUpperCase(), qId: question_id } },
    });
    if (!question) {
      return err('QUESTION_NOT_FOUND', 404, lang);
    }

    // Check timer limit on server side (only in presenter-led mode)
    if (session.paceMode !== 'self_paced' && question.timer && session.activeQuestionActivatedAt) {
      const now = Math.floor(Date.now() / 1000);
      const passed = now - session.activeQuestionActivatedAt;
      if (passed > question.timer) {
        return err('TIME_EXPIRED', 400, lang);
      }
    }

    // Validate vote values based on question type
    const options = question.options as Record<string, string> | null;
    if (question.type === 'multiple_choice') {
      if (typeof vote !== 'string' || !options || !options[vote]) {
        return err('INVALID_ANSWER', 400, lang);
      }
    } else if (question.type === 'multiple_selection') {
      if (!Array.isArray(vote)) {
        return err('INVALID_SINGLE_CHOICE', 400, lang);
      }
      for (const v of vote) {
        if (typeof v !== 'string' || !options || !options[v]) {
          return err('INVALID_ANSWER', 400, lang);
        }
      }
    } else if (question.type === 'rating') {
      const voteNum = parseInt(String(vote), 10);
      if (isNaN(voteNum) || voteNum < 1 || voteNum > 5) {
        return NextResponse.json({ error: 'Rating harus antara 1-5 bintang.' }, { status: 400 });
      }
    } else if (question.type === 'open_text') {
      if (typeof vote !== 'string' || !vote.trim()) {
        return err('INVALID_ANSWER', 400, lang);
      }
      if (hasOffensiveContent(vote)) {
        return err('MODERATION', 422, lang);
      }
    }

    // Save vote with duplicate prevention (UPSERT)
    const existingVote = await prisma.vote.findUnique({
      where: {
        sessionCode_questionId_participantId: {
          sessionCode: code.toUpperCase(),
          questionId: question_id,
          participantId: participant_id,
        },
      },
    });

    const hasChanged = !existingVote || JSON.stringify(existingVote.vote) !== JSON.stringify(vote);

    if (hasChanged) {
      await prisma.vote.upsert({
        where: {
          sessionCode_questionId_participantId: {
            sessionCode: code.toUpperCase(),
            questionId: question_id,
            participantId: participant_id,
          },
        },
        update: { vote },
        create: {
          sessionCode: code.toUpperCase(),
          questionId: question_id,
          participantId: participant_id,
          participantName: participant_name ? String(participant_name).slice(0, 100) : null,
          vote,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
