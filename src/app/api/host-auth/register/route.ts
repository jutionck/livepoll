import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword, generateAuthToken } from '@/lib/host-auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  if (!rateLimit(`host-register:${getClientIp(request)}`, 5, 600_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });
  }

  try {
    const { email, password } = await request.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    const existing = await prisma.hostAccount.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan masuk.' }, { status: 409 });
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
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
