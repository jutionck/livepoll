import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import crypto from 'crypto';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code) {
      return err('CODE_REQUIRED', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== session.hostTokenHash) {
      return err('ACCESS_DENIED', 403, lang);
    }

    const questions = await prisma.question.findMany({
      where: { sessionCode: code },
      orderBy: { qId: 'asc' },
    });

    const votes = await prisma.vote.findMany({
      where: { sessionCode: code },
    });

    // Build participant scores
    const participantMap = new Map<
      string,
      {
        name: string;
        correct: number;
        total: number;
        points: number;
        answers: {
          question_id: string;
          question_title: string;
          answer: string;
          is_correct: boolean;
          correct_answer: string;
          points: number;
        }[];
      }
    >();

    // Kahoot-style: faster correct answers earn more points (up to 1000)
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
        answers: [] as {
          question_id: string;
          question_title: string;
          answer: string;
          is_correct: boolean;
          correct_answer: string;
          points: number;
        }[],
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

        const points = computePoints(question, isCorrect, v);
        entry.points += points;

        const labels = Object.fromEntries(
          Object.entries((question.options as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)]),
        );
        const formatAnswer = (keys: string[]) => keys.map((k) => labels[k] || k).join(', ');

        entry.answers.push({
          question_id: question.qId,
          question_title: question.title,
          answer: Array.isArray(voteVal) ? formatAnswer(voteVal) : formatAnswer([voteVal]),
          is_correct: isCorrect,
          correct_answer: formatAnswer(correctArr),
          points,
        });
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
        points: data.points,
        answers: data.answers,
      }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

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
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
