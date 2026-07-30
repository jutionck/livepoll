import { NextResponse } from 'next/server';
import conn from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Kode sesi harus diisi.' }, { status: 400 });
    }

    const sessionResult = await conn`SELECT * FROM sessions WHERE code = ${code}`;
    if (sessionResult.length === 0) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan atau telah kedaluwarsa.' }, { status: 404 });
    }

    const session = sessionResult[0];

    // Check host token
    const tokenHeader = request.headers.get('X-Host-Token') || searchParams.get('host_token') || '';
    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    const isHost = hash === session.host_token_hash;

    if (isHost) {
      // Get all questions
      const questionsResult = await conn`SELECT * FROM questions WHERE session_code = ${code} ORDER BY q_id ASC`;
      const questionsMap: Record<string, any> = {};
      
      questionsResult.forEach((q) => {
        questionsMap[q.q_id] = {
          id: q.q_id,
          type: q.type,
          title: q.title,
          options: q.options,
          timer: q.timer,
        };
      });

      return NextResponse.json({
        code: session.code,
        title: session.title,
        status: session.status,
        active_question_id: session.active_question_id,
        active_question_activated_at: session.active_question_activated_at,
        questions: questionsMap,
        version: session.version,
      });
    } else {
      // Get active question only
      const activeQId = session.active_question_id;
      let activeQuestion = null;

      if (activeQId) {
        const qResult = await conn`SELECT * FROM questions WHERE session_code = ${code} AND q_id = ${activeQId}`;
        if (qResult.length > 0) {
          const q = qResult[0];
          activeQuestion = {
            id: q.q_id,
            type: q.type,
            title: q.title,
            options: q.options,
            timer: q.timer,
          };
        }
      }

      return NextResponse.json({
        code: session.code,
        title: session.title,
        status: session.status,
        active_question_id: activeQId,
        active_question: activeQuestion,
        active_question_activated_at: session.active_question_activated_at,
        version: session.version,
      });
    }
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
