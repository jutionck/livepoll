import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { isHostAuthorized } from '@/lib/host-auth';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return err('CODE_REQUIRED', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return err('SESSION_NOT_FOUND_OR_EXPIRED', 404, lang);
    }

    // Check host token or host account
    const requireHost =
      request.headers.get('X-Require-Host') === '1' ||
      request.headers.get('X-Host-Token') !== null ||
      searchParams.get('host_token') !== null ||
      searchParams.get('token') !== null;

    const isHost = await isHostAuthorized(session, request);

    if (requireHost && !isHost) {
      return err('ACCESS_DENIED', 403, lang);
    }

    if (isHost) {
      // Get all questions
      const questions = await prisma.question.findMany({
        where: { sessionCode: code },
        orderBy: { qId: 'asc' },
      });

      const questionsMap: Record<string, any> = {};

      questions.forEach((q) => {
        questionsMap[q.qId] = {
          id: q.qId,
          type: q.type,
          title: q.title,
          options: q.options,
          timer: q.timer,
          correct_answer: q.correctAnswer,
        };
      });

      return NextResponse.json({
        code: session.code,
        title: session.title,
        status: session.status,
        pace_mode: session.paceMode || 'presenter',
        host_name: session.hostName,
        host_org: session.hostOrg,
        active_question_id: session.activeQuestionId,
        active_question_activated_at: session.activeQuestionActivatedAt,
        questions: questionsMap,
        version: session.version,
        is_host: true,
      });
    } else {
      const questions = await prisma.question.findMany({
        where: { sessionCode: code },
        orderBy: { qId: 'asc' },
      });

      const isQuiz = questions.some((q) => q.correctAnswer);
      const questionsMap: Record<string, any> = {};

      questions.forEach((q) => {
        questionsMap[q.qId] = {
          id: q.qId,
          type: q.type,
          title: q.title,
          options: q.options,
          timer: q.timer,
          has_answer: !!q.correctAnswer,
        };
      });

      const activeQId = session.activeQuestionId || questions[0]?.qId || null;
      let activeQuestion = null;
      if (activeQId && questionsMap[activeQId]) {
        activeQuestion = questionsMap[activeQId];
      }

      return NextResponse.json({
        code: session.code,
        title: session.title,
        status: session.status,
        pace_mode: session.paceMode || 'presenter',
        active_question_id: activeQId,
        active_question: activeQuestion,
        active_question_activated_at: session.activeQuestionActivatedAt,
        questions: questionsMap,
        is_quiz: isQuiz,
        version: session.version,
      });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
