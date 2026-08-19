import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, err } from '@/lib/api-errors';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // basic check if secret is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return err('UNAUTHORIZED', 401, lang);
    }

    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan.' }, { status: 500 });
  }
}
