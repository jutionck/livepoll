import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { code, participant_id, participant_name } = await request.json();
    const sessionCode = String(code || '').toUpperCase();
    const participantId = String(participant_id || '').slice(0, 100);

    if (!sessionCode || !participantId) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    const session = await prisma.session.findUnique({ where: { code: sessionCode } });
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 });
    }

    await prisma.joinedParticipant.upsert({
      where: { sessionCode_participantId: { sessionCode, participantId } },
      create: {
        sessionCode,
        participantId,
        participantName: participant_name ? String(participant_name).slice(0, 100) : null,
      },
      update: {
        participantName: participant_name ? String(participant_name).slice(0, 100) : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
