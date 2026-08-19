import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getLang, msg, err } from '@/lib/api-errors';
import crypto from 'crypto';

export async function GET(request: Request) {
  const lang = getLang(request);
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();
    const tokenHeader = request.headers.get('X-Host-Token') || searchParams.get('token') || '';

    if (!code) {
      return err('CODE_REQUIRED', 400, lang);
    }

    const session = await prisma.session.findUnique({ where: { code } });
    if (!session) {
      return err('SESSION_NOT_FOUND', 404, lang);
    }

    // Check host token if provided or enforce if private
    if (tokenHeader) {
      const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
      if (hash !== session.hostTokenHash) {
        return err('ACCESS_DENIED', 403, lang);
      }
    }

    const questions = await prisma.question.findMany({
      where: { sessionCode: code },
      orderBy: { createdAt: 'asc' },
    });

    const votes = await prisma.vote.findMany({
      where: { sessionCode: code },
      orderBy: { updatedAt: 'asc' },
    });

    const isQuiz = questions.some((q) => q.correctAnswer);

    // Helpers for XML Excel
    const esc = (v: unknown) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const cell = (value: string | number, type: 'String' | 'Number' = 'String') =>
      `<Cell><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
    const row = (cells: string) => `<Row>${cells}</Row>`;
    const sheet = (name: string, rows: string) =>
      `<Worksheet ss:Name="${esc(name)}"><Table>${rows}</Table></Worksheet>`;

    // --- Sheet 1: Ringkasan Polling ---
    const summaryRows: string[] = [
      row(cell(`Rekap Hasil Polling: ${session.title}`)),
      row(cell(`Kode Sesi: ${session.code}`)),
      row(cell(`Dibuat Pada: ${session.createdAt.toLocaleString('id-ID')}`)),
      row(cell(`Total Pertanyaan: ${questions.length}`) + cell(`Total Respon Suara: ${votes.length}`)),
      row(''), // Empty row separator
      row(
        cell('No') +
          cell('ID Soal') +
          cell('Pertanyaan') +
          cell('Tipe Polling') +
          cell('Total Respon') +
          cell('Distribusi Hasil') +
          (isQuiz ? cell('Kunci Jawaban') : ''),
      ),
    ];

    questions.forEach((q, idx) => {
      const qVotes = votes.filter((v) => v.questionId === q.qId);
      const type = q.type;
      let distribution = '';
      let correctLabel = '';

      const options = (q.options as Record<string, string>) || {};

      if (type === 'multiple_choice' || type === 'multiple_selection') {
        const counts: Record<string, number> = {};
        Object.keys(options).forEach((k) => (counts[k] = 0));

        qVotes.forEach((v) => {
          const val = v.vote;
          if (type === 'multiple_choice' && typeof val === 'string' && counts[val] !== undefined) {
            counts[val]++;
          } else if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === 'string' && counts[item] !== undefined) {
                counts[item]++;
              }
            });
          }
        });

        const totalV = qVotes.length;
        distribution = Object.entries(options)
          .map(([k, label]) => {
            const count = counts[k] || 0;
            const pct = totalV > 0 ? Math.round((count / totalV) * 100) : 0;
            return `[${k}] ${label}: ${count} (${pct}%)`;
          })
          .join(' | ');

        if (q.correctAnswer) {
          const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
          correctLabel = (correctArr as string[]).map((k) => `[${k}] ${options[k] || k}`).join(', ');
        }
      } else if (type === 'rating') {
        const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let count = 0;

        qVotes.forEach((v) => {
          const r = parseInt(String(v.vote), 10);
          if (!isNaN(r) && r >= 1 && r <= 5) {
            starCounts[r]++;
            sum += r;
            count++;
          }
        });

        const avg = count > 0 ? (sum / count).toFixed(2) : '0';
        distribution = `Rata-rata: ${avg}/5.0 (★5: ${starCounts[5]}, ★4: ${starCounts[4]}, ★3: ${starCounts[3]}, ★2: ${starCounts[2]}, ★1: ${starCounts[1]})`;
      }

      summaryRows.push(
        row(
          cell(idx + 1, 'Number') +
            cell(q.qId) +
            cell(q.title) +
            cell(
              type === 'multiple_choice'
                ? 'Pilihan Tunggal'
                : type === 'multiple_selection'
                  ? 'Pilihan Ganda'
                  : 'Rating 1-5',
            ) +
            cell(qVotes.length, 'Number') +
            cell(distribution) +
            (isQuiz ? cell(correctLabel || '-') : ''),
        ),
      );
    });

    // --- Sheet 2: Detail Respon Peserta ---
    const computePoints = (question: (typeof questions)[number], isCorrect: boolean, vote: (typeof votes)[number]) => {
      if (!isCorrect) return 0;
      const timer = question.timer;
      const activatedAt = session.activeQuestionActivatedAt;
      if (!timer || !activatedAt) return 1000;
      const elapsed = Math.max(0, Math.min(timer, vote.updatedAt.getTime() / 1000 - activatedAt));
      const factor = Math.max(0.1, 1 - elapsed / timer);
      return Math.round(1000 * factor);
    };

    const detailHeader =
      cell('No') +
      cell('Nama Peserta') +
      cell('ID Peserta') +
      cell('Pertanyaan') +
      cell('Jawaban') +
      (isQuiz ? cell('Status Jawaban') + cell('Poin') : '') +
      cell('Waktu Vote');

    const detailRows: string[] = [row(detailHeader)];

    votes.forEach((v, idx) => {
      const q = questions.find((item) => item.qId === v.questionId);
      const qTitle = q ? q.title : v.questionId;
      const options = (q?.options as Record<string, string>) || {};

      let answerDisplay = '';
      if (q?.type === 'rating') {
        answerDisplay = `${v.vote} Bintang`;
      } else if (Array.isArray(v.vote)) {
        answerDisplay = v.vote.map((k) => (options[String(k)] ? `[${k}] ${options[String(k)]}` : String(k))).join(', ');
      } else {
        const k = String(v.vote);
        answerDisplay = options[k] ? `[${k}] ${options[k]}` : k;
      }

      let isCorrect = false;
      let points = 0;
      if (q?.correctAnswer) {
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        const correctSet = new Set<string>((correctArr as string[]).map(String));
        const voteVal = Array.isArray(v.vote) ? v.vote : [v.vote];
        const voteSet = new Set<string>(voteVal.map(String));
        isCorrect = correctSet.size === voteSet.size && [...correctSet].every((x) => voteSet.has(x));
        points = computePoints(q, isCorrect, v);
      }

      detailRows.push(
        row(
          cell(idx + 1, 'Number') +
            cell(v.participantName || 'Tanpa Nama') +
            cell(v.participantId) +
            cell(qTitle) +
            cell(answerDisplay) +
            (isQuiz ? cell(q?.correctAnswer ? (isCorrect ? 'Benar' : 'Salah') : '-') + cell(points, 'Number') : '') +
            cell(v.updatedAt.toLocaleString('id-ID')),
        ),
      );
    });

    // --- Sheet 3: Rekap Skor Kuis (Jika ada pertanyaan kuis) ---
    let quizLeaderboardSheet = '';
    if (isQuiz) {
      const participantScores = new Map<
        string,
        {
          name: string;
          correct: number;
          total: number;
          points: number;
        }
      >();

      votes.forEach((v) => {
        const q = questions.find((item) => item.qId === v.questionId);
        if (!q?.correctAnswer) return;

        const entry = participantScores.get(v.participantId) || {
          name: v.participantName || 'Tanpa Nama',
          correct: 0,
          total: 0,
          points: 0,
        };

        entry.total++;
        const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        const correctSet = new Set<string>((correctArr as string[]).map(String));
        const voteVal = Array.isArray(v.vote) ? v.vote : [v.vote];
        const voteSet = new Set<string>(voteVal.map(String));
        const isCorrect = correctSet.size === voteSet.size && [...correctSet].every((x) => voteSet.has(x));

        if (isCorrect) {
          entry.correct++;
        }
        entry.points += computePoints(q, isCorrect, v);
        participantScores.set(v.participantId, entry);
      });

      const sortedParticipants = [...participantScores.entries()]
        .map(([id, d]) => ({ id, ...d }))
        .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

      const quizRows = [
        row(
          cell('Peringkat') +
            cell('Nama Peserta') +
            cell('Jawaban Benar') +
            cell('Total Soal Kuis') +
            cell('Total Skor (Poin)'),
        ),
        ...sortedParticipants.map((p, i) =>
          row(
            cell(i + 1, 'Number') +
              cell(p.name) +
              cell(p.correct, 'Number') +
              cell(p.total, 'Number') +
              cell(p.points, 'Number'),
          ),
        ),
      ];

      quizLeaderboardSheet = sheet('Peringkat Kuis', quizRows.join(''));
    }

    const xml =
      `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
      sheet('Ringkasan Polling', summaryRows.join('')) +
      sheet('Detail Respon Peserta', detailRows.join('')) +
      (quizLeaderboardSheet || '') +
      `</Workbook>`;

    const slug = (session.title || code)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `session-${code.toLowerCase()}`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slug}.xls"`,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || msg('SERVER_ERROR', lang) }, { status: 500 });
  }
}
