import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { hashPassword, generateAuthToken } from '@/lib/host-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const lang = getLang(request);
  if (!rateLimit(`host-login:${getClientIp(request)}`, 10, 600_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    const account = await prisma.hostAccount.findUnique({ where: { email: cleanEmail } });
    if (!account || account.passwordHash !== hashPassword(String(password || ''))) {
      return err('WRONG_CREDENTIALS', 401, lang);
    }

    const { token, hash } = generateAuthToken();
    await prisma.hostAccount.update({
      where: { id: account.id },
      data: { authTokenHash: hash },
    });

    return NextResponse.json({ token, account: { id: account.id, email: account.email } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
