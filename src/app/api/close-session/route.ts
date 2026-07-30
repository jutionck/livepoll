import { NextResponse } from 'next/server';
import conn from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { code, status } = await request.json();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code || !status) {
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

    await conn`
      UPDATE sessions 
      SET status = ${status},
          version = version + 1
      WHERE code = ${code.toUpperCase()}
    `;

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
