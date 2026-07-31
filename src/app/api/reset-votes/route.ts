import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { code, question_id } = await request.json();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code || !question_id) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== session.hostTokenHash) {
      return NextResponse.json({ error: 'Akses ditolak. Token host tidak valid.' }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.vote.deleteMany({
        where: { sessionCode: code.toUpperCase(), questionId: question_id },
      }),
      prisma.session.update({
        where: { code: code.toUpperCase() },
        data: { version: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
