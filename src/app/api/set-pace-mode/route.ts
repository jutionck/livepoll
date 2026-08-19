import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import crypto from 'crypto';

export async function POST(request: Request) {
  const lang = getLang(request);
  try {
    const { code, pace_mode } = await request.json();
    const tokenHeader = request.headers.get('X-Host-Token') || '';

    if (!code || !pace_mode || !['presenter', 'self_paced'].includes(pace_mode)) {
      return err('DATA_INCOMPLETE', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code: code.toUpperCase() } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
    if (hash !== session.hostTokenHash) {
      return err('ACCESS_DENIED', 403, lang);
    }

    await prisma.session.update({
      where: { code: code.toUpperCase() },
      data: {
        paceMode: pace_mode,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, pace_mode });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
