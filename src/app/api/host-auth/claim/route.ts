import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

// Attach guest sessions created in this browser (host_id) to the logged-in account.
// Called automatically after login/register so previously created sessions appear
// under "My Sessions" without exposing other browsers' sessions.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('X-Host-Account-Token') || '';
    const hostId = request.headers.get('X-Host-Id') || '';
    if (!token || !hostId) {
      return NextResponse.json({ claimed: 0 });
    }

    const account = await prisma.hostAccount.findFirst({
      where: { authTokenHash: crypto.createHash('sha256').update(token).digest('hex') },
      select: { id: true },
    });
    if (!account) {
      return NextResponse.json({ claimed: 0 });
    }

    const hostIdHash = crypto.createHash('sha256').update(hostId).digest('hex');
    const result = await prisma.session.updateMany({
      where: { hostIdHash, hostAccountId: null },
      data: { hostAccountId: account.id },
    });

    return NextResponse.json({ claimed: result.count });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
