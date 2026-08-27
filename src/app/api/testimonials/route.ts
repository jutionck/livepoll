import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import { hasOffensiveContent } from '@/lib/moderation';
import crypto from 'crypto';

function isAdmin(request: Request): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const token = request.headers.get('X-Admin-Token') || '';
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expected = crypto.createHash('sha256').update(adminPassword).digest('hex');
  return hash === expected;
}

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return NextResponse.json({ testimonials });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const lang = getLang(request);
  if (!isAdmin(request)) {
    return err('UNAUTHORIZED', 401, lang);
  }

  try {
    const { name, role, message, rating, isActive } = await request.json();
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
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
