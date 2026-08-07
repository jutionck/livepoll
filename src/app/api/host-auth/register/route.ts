import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { hashPassword, generateAuthToken } from '@/lib/host-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const lang = getLang(request);
  if (!rateLimit(`host-register:${getClientIp(request)}`, 5, 600_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return err('INVALID_EMAIL', 400, lang);
    }
    if (!password || String(password).length < 6) {
      return err('PASSWORD_TOO_SHORT', 400, lang);
    }

    const existing = await prisma.hostAccount.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return err('EMAIL_EXISTS', 409, lang);
    }

    const { token, hash } = generateAuthToken();
    const account = await prisma.hostAccount.create({
      data: {
        email: cleanEmail,
        passwordHash: hashPassword(String(password)),
        authTokenHash: hash,
      },
      select: { id: true, email: true },
    });

    return NextResponse.json({ token, account });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
