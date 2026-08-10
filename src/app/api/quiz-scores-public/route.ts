import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';

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
      return err('SESSION_NOT_FOUND', 404, lang);
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

    // Per-question breakdown for the public results page
    const questionStats = questions.map((q) => {
      const qVotes = votes.filter((v) => v.questionId === q.qId);
      const opts = (q.options as Record<string, string>) ?? {};
      const counts: Record<string, number> = {};
      Object.keys(opts).forEach((k) => {
        counts[k] = 0;
      });

      let correctArr: string[] | null = null;
      if (q.correctAnswer) {
        correctArr = JSON.parse(JSON.stringify(q.correctAnswer)) as string[];
      }

      let correctCount = 0;
      qVotes.forEach((v) => {
        const raw = JSON.parse(JSON.stringify(v.vote)) as string | string[];
        const arr = Array.isArray(raw) ? raw : [raw];
        arr.forEach((k) => {
          if (k in counts) counts[k]++;
        });
        if (correctArr) {
          const set = new Set(arr);
          if (correctArr.length === set.size && correctArr.every((x) => set.has(x))) correctCount++;
        }
      });

      const labels = Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, String(v)]));

      return {
        question_id: q.qId,
        title: q.title,
        type: q.type,
        has_answer: !!q.correctAnswer,
        correct_answer: correctArr ? correctArr.map((k) => labels[k] || k) : null,
        total_answers: qVotes.length,
        correct_count: correctCount,
        options: Object.entries(opts).map(([k, label]) => ({
          key: k,
          label: String(label),
          count: counts[k] ?? 0,
        })),
      };
    });

    return NextResponse.json({
      code,
      title: session.title,
      is_quiz: isQuiz,
      leaderboard,
      question_stats: questionStats,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
