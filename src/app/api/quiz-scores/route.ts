import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code) {
      return NextResponse.json({ error: 'Kode sesi wajib diisi.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== session.hostTokenHash) {
      return NextResponse.json({ error: 'Akses ditolak. Token host tidak valid.' }, { status: 403 });
    }

    const questions = await prisma.question.findMany({
      where: { sessionCode: code },
      orderBy: { qId: 'asc' },
    });

    const votes = await prisma.vote.findMany({
      where: { sessionCode: code },
    });

    // Build participant scores
    const participantMap = new Map<string, { name: string; correct: number; total: number }>();

    votes.forEach((v) => {
      const entry = participantMap.get(v.participantId) || {
        name: v.participantName || 'Tanpa Nama',
        correct: 0,
        total: 0,
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
      }

      participantMap.set(v.participantId, entry);
    });

    // Build leaderboard
    const leaderboard = [...participantMap.entries()]
      .map(([participantId, data]) => ({
        participant_id: participantId,
        name: data.name,
        correct: data.correct,
        total: data.total,
        score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name));

    // Question stats
    const questionStats = questions.map((q) => {
      const qVotes = votes.filter((v) => v.questionId === q.qId);
      let correctCount = 0;
      if (q.correctAnswer) {
        const correctArr = JSON.parse(JSON.stringify(q.correctAnswer)) as string[];
        const correctSet = new Set<string>(correctArr);
        qVotes.forEach((v) => {
          const voteRaw = JSON.parse(JSON.stringify(v.vote)) as string | string[];
          const voteSet = new Set<string>(Array.isArray(voteRaw) ? voteRaw : [voteRaw]);
          if (correctSet.size === voteSet.size && [...correctSet].every((x) => voteSet.has(x))) {
            correctCount++;
          }
        });
      }
      return {
        question_id: q.qId,
        title: q.title,
        has_answer: !!q.correctAnswer,
        total_answers: qVotes.length,
        correct_count: correctCount,
      };
    });

    return NextResponse.json({
      code,
      is_quiz: questions.some((q) => q.correctAnswer),
      leaderboard,
      question_stats: questionStats,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
