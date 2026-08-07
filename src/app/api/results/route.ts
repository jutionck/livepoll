import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    const qId = searchParams.get('q');

    if (!code || !qId) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const question = await prisma.question.findUnique({
      where: { sessionCode_qId: { sessionCode: code, qId } },
    });
    if (!question) {
      return err('QUESTION_NOT_FOUND', 404, lang);
    }

    const votes = await prisma.vote.findMany({
      where: { sessionCode: code, questionId: qId },
      select: { vote: true },
    });

    const totalVotes = votes.length;
    const type = question.type;
    const results: Record<string, number> = {};

    if (type === 'multiple_choice' || type === 'multiple_selection') {
      // Initialize options with 0
      Object.keys(question.options || {}).forEach((key) => {
        results[key] = 0;
      });

      votes.forEach((row) => {
        const voteVal = row.vote;
        if (type === 'multiple_choice') {
          if (typeof voteVal === 'string' && results[voteVal] !== undefined) {
            results[voteVal]++;
          }
        } else {
          // multiple selection
          if (Array.isArray(voteVal)) {
            voteVal.forEach((v) => {
              if (typeof v === 'string' && results[v] !== undefined) {
                results[v]++;
              }
            });
          }
        }
      });
    } else if (type === 'rating') {
      // Initialize stars 1 to 5 with 0
      for (let i = 1; i <= 5; i++) {
        results[i] = 0;
      }

      let sum = 0;
      let count = 0;

      votes.forEach((row) => {
        const rating = parseInt(String(row.vote), 10);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
          results[rating]++;
          sum += rating;
          count++;
        }
      });

      const average = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;

      const session = await prisma.session.findUnique({
        where: { code },
        select: { version: true },
      });

      return NextResponse.json({
        code,
        question_id: qId,
        question_type: type,
        total_votes: totalVotes,
        results,
        average_rating: average,
        version: session?.version || 1,
      });
    }

    const session = await prisma.session.findUnique({
      where: { code },
      select: { version: true },
    });

    return NextResponse.json({
      code,
      question_id: qId,
      question_type: type,
      total_votes: totalVotes,
      results,
      version: session?.version || 1,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
