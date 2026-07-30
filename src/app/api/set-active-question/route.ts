import { NextResponse } from 'next/server';
import conn from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { code, question_id } = await request.json();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code || !question_id) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const sessionResult = await conn`SELECT * FROM sessions WHERE code = ${code.toUpperCase()}`;
    if (sessionResult.length === 0) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    const session = sessionResult[0];

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== session.host_token_hash) {
      return NextResponse.json({ error: 'Akses ditolak. Token host tidak valid.' }, { status: 403 });
    }

    const qResult =
      await conn`SELECT id FROM questions WHERE session_code = ${code.toUpperCase()} AND q_id = ${question_id}`;
    if (qResult.length === 0) {
      return NextResponse.json({ error: 'Pertanyaan tidak ditemukan.' }, { status: 404 });
    }

    await conn`
      UPDATE sessions 
      SET active_question_id = ${question_id},
          active_question_activated_at = ${Math.floor(Date.now() / 1000)},
          status = 'active',
          version = version + 1
      WHERE code = ${code.toUpperCase()}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
