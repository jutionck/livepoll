import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Kode sesi wajib diisi.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    const questions = await prisma.question.findMany({
      where: { sessionCode: code },
      orderBy: { qId: 'asc' },
    });

    const votes = await prisma.vote.findMany({
      where: { sessionCode: code },
    });

    const isQuiz = questions.some((q) => q.correctAnswer);

    const participantMap = new Map<string, { name: string; correct: number; total: number; points: number }>();

    const computePoints = (question: (typeof questions)[number], isCorrect: boolean, vote: (typeof votes)[number]) => {
      if (!isCorrect) return 0;
      const timer = question.timer;
      const activatedAt = session.activeQuestionActivatedAt;
      if (!timer || !activatedAt) return 1000;
      const elapsed = Math.max(0, Math.min(timer, vote.updatedAt.getTime() / 1000 - activatedAt));
      const factor = Math.max(0.1, 1 - elapsed / timer);
      return Math.round(1000 * factor);
    };

    votes.forEach((v) => {
      const entry = participantMap.get(v.participantId) || {
        name: v.participantName || 'Tanpa Nama',
        correct: 0,
        total: 0,
        points: 0,
      };

      const question = questions.find((q) => q.qId === v.questionId);
      if (question?.correctAnswer) {
        entry.total++;
        const correctArr = JSON.parse(JSON.stringify(question.correctAnswer)) as string[];
        const correctSet = new Set<string>(correctArr);
        const voteVal = JSON.parse(JSON.stringify(v.vote)) as string | string[];
        const voteSet = new Set<string>(Array.isArray(voteVal) ? voteVal : [voteVal]);

        const isCorrect = correctSet.size === voteSet.size && [...correctSet].every((x) => voteSet.has(x));
        if (isCorrect) entry.correct++;
        entry.points += computePoints(question, isCorrect, v);
      }

      participantMap.set(v.participantId, entry);
    });

    const leaderboard = [...participantMap.entries()]
      .map(([participantId, data]) => ({
        participant_id: participantId,
        name: data.name,
        correct: data.correct,
        total: data.total,
        points: data.points,
      }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

    return NextResponse.json({
      code,
      is_quiz: isQuiz,
      leaderboard,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
