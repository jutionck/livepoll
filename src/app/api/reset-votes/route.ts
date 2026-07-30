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

    await conn.begin(async (sql) => {
      await sql`
        DELETE FROM votes 
        WHERE session_code = ${code.toUpperCase()} AND question_id = ${question_id}
      `;

      await sql`
        UPDATE sessions 
        SET version = version + 1 
        WHERE code = ${code.toUpperCase()}
      `;
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
