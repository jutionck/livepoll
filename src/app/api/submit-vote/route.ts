import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit: 30 votes per minute per IP
  if (!rateLimit(`vote:${getClientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });
  }

  try {
    const { code, question_id, participant_id, participant_name, vote } = await request.json();

    if (!code || !question_id || !participant_id || vote === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Voting sudah ditutup.' }, { status: 400 });
    }

    if (session.activeQuestionId !== question_id) {
      return NextResponse.json({ error: 'Pertanyaan ini sedang tidak aktif.' }, { status: 400 });
    }

    const question = await prisma.question.findUnique({
      where: { sessionCode_qId: { sessionCode: code.toUpperCase(), qId: question_id } },
    });
    if (!question) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan.' }, { status: 404 });
    }

    // Check timer limit on server side
    if (question.timer && session.activeQuestionActivatedAt) {
      const now = Math.floor(Date.now() / 1000);
      const passed = now - session.activeQuestionActivatedAt;
      if (passed > question.timer) {
        return NextResponse.json({ error: 'Waktu voting telah habis.' }, { status: 400 });
      }
    }

    // Validate vote values based on question type
    const options = question.options as Record<string, string> | null;
    if (question.type === 'multiple_choice') {
      if (typeof vote !== 'string' || !options || !options[vote]) {
        return NextResponse.json({ error: 'Jawaban tidak valid.' }, { status: 400 });
      }
    } else if (question.type === 'multiple_selection') {
      if (!Array.isArray(vote)) {
        return NextResponse.json({ error: 'Jawaban harus berupa pilihan ganda.' }, { status: 400 });
      }
      for (const v of vote) {
        if (typeof v !== 'string' || !options || !options[v]) {
          return NextResponse.json({ error: 'Jawaban tidak valid.' }, { status: 400 });
        }
      }
    } else if (question.type === 'rating') {
      const voteNum = parseInt(String(vote), 10);
      if (isNaN(voteNum) || voteNum < 1 || voteNum > 5) {
        return NextResponse.json({ error: 'Rating harus antara 1-5 bintang.' }, { status: 400 });
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
      await prisma.$transaction([
        prisma.vote.upsert({
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
        }),
        prisma.session.update({
          where: { code: code.toUpperCase() },
          data: { version: { increment: 1 } },
        }),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
