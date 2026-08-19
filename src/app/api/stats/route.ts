import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const [sessionCount, voteCount] = await Promise.all([prisma.session.count(), prisma.vote.count()]);

    return NextResponse.json({
      sessions: sessionCount,
      votes: voteCount,
    });
  } catch {
    return NextResponse.json({ sessions: 0, votes: 0 });
  }
}
