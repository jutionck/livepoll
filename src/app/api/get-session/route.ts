import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Kode sesi harus diisi.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan atau telah kedaluwarsa.' }, { status: 404 });
    }

    // Check host token
    const tokenHeader = request.headers.get('X-Host-Token') || searchParams.get('host_token') || '';
    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    const isHost = hash === session.hostTokenHash;

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
        host_name: session.hostName,
        host_org: session.hostOrg,
        active_question_id: session.activeQuestionId,
        active_question_activated_at: session.activeQuestionActivatedAt,
        questions: questionsMap,
        version: session.version,
      });
    } else {
      // Get active question only
      const activeQId = session.activeQuestionId;
      let activeQuestion = null;

      const sessionQuestions = await prisma.question.findMany({
        where: { sessionCode: code },
        select: { correctAnswer: true },
      });
      const isQuiz = sessionQuestions.some((q) => q.correctAnswer);

      if (activeQId) {
        const q = await prisma.question.findUnique({
          where: { sessionCode_qId: { sessionCode: code, qId: activeQId } },
        });
        if (q) {
          activeQuestion = {
            id: q.qId,
            type: q.type,
            title: q.title,
            options: q.options,
            timer: q.timer,
            has_answer: !!q.correctAnswer,
          };
        }
      }

      return NextResponse.json({
        code: session.code,
        title: session.title,
        status: session.status,
        active_question_id: activeQId,
        active_question: activeQuestion,
        active_question_activated_at: session.activeQuestionActivatedAt,
        is_quiz: isQuiz,
        version: session.version,
      });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
