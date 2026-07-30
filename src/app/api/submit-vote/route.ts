import { NextResponse } from 'next/server';
import conn from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, question_id, participant_id, vote } = await request.json();

    if (!code || !question_id || !participant_id || vote === undefined) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const sessionResult = await conn`SELECT * FROM sessions WHERE code = ${code.toUpperCase()}`;
    if (sessionResult.length === 0) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    const session = sessionResult[0];

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Voting sudah ditutup.' }, { status: 400 });
    }

    if (session.active_question_id !== question_id) {
      return NextResponse.json({ error: 'Pertanyaan ini sedang tidak aktif.' }, { status: 400 });
    }

    const qResult =
      await conn`SELECT type, options, timer FROM questions WHERE session_code = ${code.toUpperCase()} AND q_id = ${question_id}`;
    if (qResult.length === 0) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan.' }, { status: 404 });
    }

    const q = qResult[0];

    // Check timer limit on server side
    if (q.timer && session.active_question_activated_at) {
      const now = Math.floor(Date.now() / 1000);
      const passed = now - session.active_question_activated_at;
      if (passed > q.timer) {
        return NextResponse.json({ error: 'Waktu voting telah habis.' }, { status: 400 });
      }
    }

    // Validate vote values based on question type
    if (q.type === 'multiple_choice') {
      if (typeof vote !== 'string' || !q.options[vote]) {
        return NextResponse.json({ error: 'Jawaban tidak valid.' }, { status: 400 });
      }
    } else if (q.type === 'multiple_selection') {
      if (!Array.isArray(vote)) {
        return NextResponse.json({ error: 'Jawaban harus berupa pilihan ganda.' }, { status: 400 });
      }
      for (const v of vote) {
        if (typeof v !== 'string' || !q.options[v]) {
          return NextResponse.json({ error: 'Jawaban tidak valid.' }, { status: 400 });
        }
      }
    } else if (q.type === 'rating') {
      const voteNum = parseInt(vote, 10);
      if (isNaN(voteNum) || voteNum < 1 || voteNum > 5) {
        return NextResponse.json({ error: 'Rating harus antara 1-5 bintang.' }, { status: 400 });
      }
    }

    // Save vote with duplicate prevention (UPSERT)
    await conn.begin(async (sql) => {
      // Check if vote is indeed changing to save database write updates
      const existingVote = await sql`
        SELECT id, vote FROM votes 
        WHERE session_code = ${code.toUpperCase()} AND question_id = ${question_id} AND participant_id = ${participant_id}
      `;

      let hasChanged = true;
      if (existingVote.length > 0) {
        const currentVote = existingVote[0].vote;
        if (JSON.stringify(currentVote) === JSON.stringify(vote)) {
          hasChanged = false;
        }
      }

      if (hasChanged) {
        await sql`
          INSERT INTO votes (session_code, question_id, participant_id, vote)
          VALUES (${code.toUpperCase()}, ${question_id}, ${participant_id}, ${vote as any})
          ON CONFLICT (session_code, question_id, participant_id) 
          DO UPDATE SET vote = EXCLUDED.vote, updated_at = CURRENT_TIMESTAMP
        `;

        // Increment session version
        await sql`
          UPDATE sessions 
          SET version = version + 1 
          WHERE code = ${code.toUpperCase()}
        `;
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
