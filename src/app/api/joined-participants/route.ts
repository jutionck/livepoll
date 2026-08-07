import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return err('CODE_REQUIRED', 400, lang);
    }

    const joined = await prisma.joinedParticipant.findMany({
      where: { sessionCode: code },
      orderBy: { createdAt: 'asc' },
      take: 300,
      select: { participantId: true, participantName: true, createdAt: true },
    });

    return NextResponse.json({
      count: joined.length,
      participants: joined.map((j) => ({
        participant_id: j.participantId,
        name: j.participantName || 'Tanpa Nama',
        joined_at: j.createdAt,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
