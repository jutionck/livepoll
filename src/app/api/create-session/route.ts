import { NextResponse } from 'next/server';
import conn from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { title, questions } = await request.json();

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    // Generate unique session code
    let code = '';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      const existing = await conn`SELECT code FROM sessions WHERE code = ${code}`;
      if (existing.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Gagal membuat kode sesi unik.' }, { status: 500 });
    }

    // Generate host token
    const hostToken = crypto.randomBytes(16).toString('hex');
    const hostTokenHash = crypto.createHash('sha256').update(hostToken).digest('hex');

    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours
    const firstQId = 'q1';

    // Transaction to insert session and questions
    await conn.begin(async (sql) => {
      await sql`
        INSERT INTO sessions (code, title, status, active_question_id, active_question_activated_at, host_token_hash, expires_at)
        VALUES (${code}, ${title}, 'active', ${firstQId}, ${Math.floor(Date.now() / 1000)}, ${hostTokenHash}, ${expiresAt})
      `;

      const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const qId = `q${i + 1}`;
        const timerVal = q.timer !== undefined ? q.timer : null;

        // Convert array options to key-value object: ["Ya", "Tidak"] -> {"a": "Ya", "b": "Tidak"}
        const optionsObj: Record<string, string> = {};
        if (q.type !== 'rating' && Array.isArray(q.options)) {
          q.options.forEach((opt: string, idx: number) => {
            const trimmed = opt.trim();
            if (trimmed) {
              const key = idx < labels.length ? labels[idx] : `opt${idx + 1}`;
              optionsObj[key] = trimmed;
            }
          });
        }

        await sql`
          INSERT INTO questions (session_code, q_id, type, title, options, timer)
          VALUES (${code}, ${qId}, ${q.type}, ${q.title}, ${optionsObj as any}, ${timerVal})
        `;
      }
    });

    return NextResponse.json(
      {
        code,
        host_token: hostToken,
        title,
        active_question_id: firstQId,
        active_question_activated_at: Math.floor(Date.now() / 1000),
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
