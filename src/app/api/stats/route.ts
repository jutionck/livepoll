import { NextResponse } from 'next/server';
import conn from '@/lib/db';

export async function GET() {
  try {
    const [sessionResult, votesResult] = await Promise.all([
      conn`SELECT COUNT(*) as count FROM sessions`,
      conn`SELECT COUNT(*) as count FROM votes`,
    ]);

    return NextResponse.json({
      sessions: Number(sessionResult[0]?.count || 0),
      votes: Number(votesResult[0]?.count || 0),
    });
  } catch {
    return NextResponse.json({ sessions: 0, votes: 0 });
  }
}
