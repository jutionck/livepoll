import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json({ error: 'Kode sesi wajib diisi.' }, { status: 400 });
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
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
