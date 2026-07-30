import { NextResponse } from 'next/server';
import conn from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    const qId = searchParams.get('q');

    if (!code || !qId) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const qResult = await conn`
      SELECT type, options FROM questions 
      WHERE session_code = ${code} AND q_id = ${qId}
    `;
    if (qResult.length === 0) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan.' }, { status: 404 });
    }

    const question = qResult[0];
    const votesResult = await conn`
      SELECT vote FROM votes 
      WHERE session_code = ${code} AND question_id = ${qId}
    `;

    const totalVotes = votesResult.length;
    const type = question.type;
    const results: Record<string, number> = {};

    if (type === 'multiple_choice' || type === 'multiple_selection') {
      // Initialize options with 0
      Object.keys(question.options || {}).forEach((key) => {
        results[key] = 0;
      });

      votesResult.forEach((row) => {
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

      votesResult.forEach((row) => {
        const rating = parseInt(row.vote, 10);
        if (!isNaN(rating) && rating >= 1 && rating <= 5) {
          results[rating]++;
          sum += rating;
          count++;
        }
      });

      const average = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      
      const sessionResult = await conn`SELECT version FROM sessions WHERE code = ${code}`;

      return NextResponse.json({
        code,
        question_id: qId,
        question_type: type,
        total_votes: totalVotes,
        results,
        average_rating: average,
        version: sessionResult[0]?.version || 1,
      });
    }

    const sessionResult = await conn`SELECT version FROM sessions WHERE code = ${code}`;

    return NextResponse.json({
      code,
      question_id: qId,
      question_type: type,
      total_votes: totalVotes,
      results,
      version: sessionResult[0]?.version || 1,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
