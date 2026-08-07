import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { hasOffensiveContent } from '@/lib/moderation';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Public endpoint for hosts to submit testimonials (no admin auth)
export async function POST(request: Request) {
  const lang = getLang(request);
  // Rate limit: 5 submissions per minute per IP
  if (!rateLimit(`testimonial:${getClientIp(request)}`, 5, 60_000)) {
    return err('RATE_LIMIT', 429, lang);
  }

  try {
    const { name, role, message, rating, code } = await request.json();
    if (!name || !message) {
      return err('NAME_MESSAGE_REQUIRED', 400, lang);
    }

    // Content moderation check
    if (hasOffensiveContent(name, role, message)) {
      return err('MODERATION', 422, lang);
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
    return NextResponse.json({ error: msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
