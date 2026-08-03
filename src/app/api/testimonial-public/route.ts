import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Public endpoint for hosts to submit testimonials (no admin auth)
export async function POST(request: Request) {
  try {
    const { name, role, message, rating, code } = await request.json();
    if (!name || !message) {
      return NextResponse.json({ error: 'Nama dan pesan wajib diisi.' }, { status: 400 });
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name: String(name).slice(0, 100),
        role: String(role || '').slice(0, 150),
        message: String(message),
        rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
        isActive: true,
      },
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
