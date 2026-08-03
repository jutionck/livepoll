import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import crypto from 'crypto';

function isAdmin(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const token = request.headers.get('X-Admin-Token') || '';
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expected = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return hash === expected;
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Testimonial tidak ditemukan.' }, { status: 404 });
  }
}
