import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';

export async function POST(request: Request) {
  const lang = getLang(request);
  try {
    const { code, participant_id, participant_name } = await request.json();
    const sessionCode = String(code || '').toUpperCase();
    const participantId = String(participant_id || '').slice(0, 100);

    if (!sessionCode || !participantId) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code: sessionCode } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
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
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
