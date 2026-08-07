import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, generateAuthToken } from '@/lib/host-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  if (!rateLimit(`host-login:${getClientIp(request)}`, 10, 600_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });
  }

  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    const account = await prisma.hostAccount.findUnique({ where: { email: cleanEmail } });
    if (!account || account.passwordHash !== hashPassword(String(password || ''))) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    const { token, hash } = generateAuthToken();
    await prisma.hostAccount.update({
      where: { id: account.id },
      data: { authTokenHash: hash },
    });

    return NextResponse.json({ token, account: { id: account.id, email: account.email } });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
