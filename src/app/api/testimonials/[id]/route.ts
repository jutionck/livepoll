import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
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
  const lang = getLang(request);
  if (!isAdmin(request)) {
    return err('UNAUTHORIZED', 401, lang);
  }

  try {
    const { id } = await params;
    await prisma.testimonial.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return err('TESTIMONIAL_NOT_FOUND', 404, lang);
  }
}
