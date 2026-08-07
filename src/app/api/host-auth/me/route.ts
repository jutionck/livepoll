import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashAuthToken } from '@/lib/host-auth';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('X-Host-Account-Token') || '';
    if (!token) {
      return NextResponse.json({ account: null });
    }

    const account = await prisma.hostAccount.findFirst({
      where: { authTokenHash: hashAuthToken(token) },
      select: { id: true, email: true },
    });

    return NextResponse.json({ account });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
