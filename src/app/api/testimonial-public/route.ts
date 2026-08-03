import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hasOffensiveContent, getModerationError } from '@/lib/moderation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Public endpoint for hosts to submit testimonials (no admin auth)
export async function POST(request: Request) {
  // Rate limit: 5 submissions per minute per IP
  if (!rateLimit(`testimonial:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });
  }

  try {
    const { name, role, message, rating, code } = await request.json();
    if (!name || !message) {
      return NextResponse.json({ error: 'Nama dan pesan wajib diisi.' }, { status: 400 });
    }

    // Content moderation check
    if (hasOffensiveContent(name, role, message)) {
      return NextResponse.json({ error: getModerationError() }, { status: 422 });
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
