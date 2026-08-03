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

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ testimonials });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, role, message, rating, isActive } = await request.json();
    if (!name || !message) {
      return NextResponse.json({ error: 'Nama dan pesan wajib diisi.' }, { status: 400 });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name: String(name).slice(0, 100),
        role: String(role || '').slice(0, 150),
        message: String(message),
        rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
