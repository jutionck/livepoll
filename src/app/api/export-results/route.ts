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

    // Check host token if provided
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

    const makeBar = (pct: number) => {
      const totalBlocks = 20;
      const filled = Math.min(totalBlocks, Math.max(0, Math.round((pct / 100) * totalBlocks)));
      const empty = totalBlocks - filled;
      return `${'█'.repeat(filled)}${'░'.repeat(empty)}  ${pct}%`;
    };

    const cell = (
      value: string | number,
      type: 'String' | 'Number' = 'String',
      styleId = 'Td',
      mergeAcross?: number,
    ) => {
      const mergeAttr = mergeAcross ? ` ss:MergeAcross="${mergeAcross}"` : '';
      const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : '';
      return `<Cell${styleAttr}${mergeAttr}><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
    };

    const row = (cells: string, height?: number) => {
      const hAttr = height ? ` ss:Height="${height}" ss:AutoFitHeight="0"` : '';
      return `<Row${hAttr}>${cells}</Row>`;
    };

    const sheet = (name: string, cols: string, rows: string) =>
      `<Worksheet ss:Name="${esc(name)}"><Table>${cols}${rows}</Table></Worksheet>`;

    // --- XML Styles ---
    const stylesXml = `
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#0F172A"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#475569"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaVal">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SectionBanner">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="QBanner">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
  <Style ss:ID="Th">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="ThLeft">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="Td">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdNum">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdPct">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdBar">
   <Font ss:FontName="Consolas" ss:Size="9" ss:Bold="1" ss:Color="#0284C7"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdCorrect">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#16A34A"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdWrong">
   <Font ss:FontName="Calibri" ss:Color="#DC2626"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="TdTotal">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
 </Styles>`;

    // --- SHEET 1: RINGKASAN & GRAFIK HASIL POLLING ---
    const sheet1Cols = `
  <Column ss:Width="45"/>
  <Column ss:Width="300"/>
  <Column ss:Width="95"/>
  <Column ss:Width="85"/>
  <Column ss:Width="240"/>
  <Column ss:Width="110"/>
`;

    const summaryRows: string[] = [];

    // Header Meta
    summaryRows.push(row(cell('LAPORAN HASIL POLLING LIVEPOLL', 'String', 'Title', 5), 24));
    summaryRows.push(row(cell('Judul Sesi:', 'String', 'MetaLabel') + cell(session.title, 'String', 'MetaVal', 4), 18));
    summaryRows.push(
      row(
        cell('Kode Sesi:', 'String', 'MetaLabel') +
          cell(session.code, 'String', 'MetaVal') +
          cell('Waktu Export:', 'String', 'MetaLabel') +
          cell(new Date().toLocaleString('id-ID'), 'String', 'MetaVal', 2),
        18,
      ),
    );
    summaryRows.push(
      row(
        cell('Total Soal:', 'String', 'MetaLabel') +
          cell(questions.length, 'Number', 'MetaVal') +
          cell('Total Respon Masuk:', 'String', 'MetaLabel') +
          cell(votes.length, 'Number', 'MetaVal', 2),
        18,
      ),
    );
    summaryRows.push(row('', 10)); // Spacer

    // Overview Table
    summaryRows.push(row(cell('I. RINGKASAN KESELURUHAN PERTANYAAN', 'String', 'SectionBanner', 5), 20));
    summaryRows.push(
      row(
        cell('No', 'String', 'Th') +
          cell('Pertanyaan', 'String', 'ThLeft') +
          cell('Tipe Polling', 'String', 'Th') +
          cell('Total Respon', 'String', 'Th') +
          cell('Hasil Utama / Opsi Terbanyak', 'String', 'ThLeft', 1),
        20,
      ),
    );

    questions.forEach((q, idx) => {
      const qVotes = votes.filter((v) => v.questionId === q.qId);
      const totalV = qVotes.length;
      let topSummary = '-';

      const typeLabel =
        q.type === 'multiple_choice'
          ? 'Pilihan Tunggal'
          : q.type === 'multiple_selection'
            ? 'Pilihan Ganda'
            : q.type === 'open_text'
              ? 'Teks Terbuka / Word Cloud'
              : 'Rating 1-5';

      if (q.type === 'rating') {
        let sum = 0;
        let count = 0;
        qVotes.forEach((v) => {
          const r = parseInt(String(v.vote), 10);
          if (!isNaN(r) && r >= 1 && r <= 5) {
            sum += r;
            count++;
          }
        });
        const avg = count > 0 ? (sum / count).toFixed(2) : '0';
        topSummary = `Rata-rata: ${avg} / 5.0 Bintang (${count} responden)`;
      } else if (q.type === 'open_text') {
        const wordFreq: Record<string, number> = {};
        qVotes.forEach((v) => {
          const text = String(v.vote || '').trim();
          if (text) wordFreq[text] = (wordFreq[text] || 0) + 1;
        });
        const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
          const top = sorted.slice(0, 3).map(([w, c]) => `"${w}" (${c})`).join(', ');
          topSummary = `${sorted.length} kata unik. Terbanyak: ${top}`;
        } else {
          topSummary = 'Belum ada respon teks';
        }
      } else {
        const options = (q.options as Record<string, string>) || {};
        const counts: Record<string, number> = {};
        Object.keys(options).forEach((k) => (counts[k] = 0));

        qVotes.forEach((v) => {
          const val = v.vote;
          if (q.type === 'multiple_choice' && typeof val === 'string' && counts[val] !== undefined) {
            counts[val]++;
          } else if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === 'string' && counts[item] !== undefined) {
                counts[item]++;
              }
            });
          }
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0 && sorted[0][1] > 0) {
          const topKey = sorted[0][0];
          const topCount = sorted[0][1];
          const pct = totalV > 0 ? Math.round((topCount / totalV) * 100) : 0;
          topSummary = `[${topKey.toUpperCase()}] ${options[topKey] || topKey}: ${topCount} suara (${pct}%)`;
        } else {
          topSummary = 'Belum ada suara';
        }
      }

      summaryRows.push(
        row(
          cell(idx + 1, 'Number', 'TdCenter') +
            cell(q.title, 'String', 'Td') +
            cell(typeLabel, 'String', 'TdCenter') +
            cell(totalV, 'Number', 'TdNum') +
            cell(topSummary, 'String', 'Td', 1),
          20,
        ),
      );
    });

    summaryRows.push(row('', 12)); // Spacer

    // Detailed Breakdown with Visual Progress Bars per Question
    summaryRows.push(
      row(cell('II. RINCIAN PERSENTASE & GRAFIK DISTRIBUSI PER SOAL', 'String', 'SectionBanner', 5), 20),
    );
    summaryRows.push(row('', 8));

    questions.forEach((q, idx) => {
      const qVotes = votes.filter((v) => v.questionId === q.qId);
      const totalV = qVotes.length;
      const typeLabel =
        q.type === 'multiple_choice'
          ? 'Pilihan Tunggal'
          : q.type === 'multiple_selection'
            ? 'Pilihan Ganda'
            : q.type === 'open_text'
              ? 'Teks Terbuka / Word Cloud'
              : 'Rating 1-5';

      // Question Title Banner
      summaryRows.push(
        row(cell(`Q${idx + 1}: ${q.title}  [${typeLabel} • ${totalV} Respon]`, 'String', 'QBanner', 5), 22),
      );

      // Sub-table Header
      summaryRows.push(
        row(
          cell('Opsi', 'String', 'Th') +
            cell('Pilihan / Kategori Jawaban', 'String', 'ThLeft') +
            cell('Jumlah Suara', 'String', 'Th') +
            cell('Persentase', 'String', 'Th') +
            cell('Visual Grafik Bar', 'String', 'ThLeft') +
            cell('Keterangan', 'String', 'Th'),
          20,
        ),
      );

      if (q.type === 'rating') {
        const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
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

        const starLabels: Record<number, string> = {
          5: '★★★★★ (5 Bintang - Sangat Baik)',
          4: '★★★★☆ (4 Bintang - Baik)',
          3: '★★★☆☆ (3 Bintang - Cukup)',
          2: '★★☆☆☆ (2 Bintang - Kurang)',
          1: '★☆☆☆☆ (1 Bintang - Sangat Kurang)',
        };

        [5, 4, 3, 2, 1].forEach((star) => {
          const votesForStar = starCounts[star] || 0;
          const pct = totalV > 0 ? Math.round((votesForStar / totalV) * 100) : 0;
          summaryRows.push(
            row(
              cell(`★ ${star}`, 'String', 'TdCenter') +
                cell(starLabels[star], 'String', 'Td') +
                cell(votesForStar, 'Number', 'TdNum') +
                cell(`${pct}%`, 'String', 'TdPct') +
                cell(makeBar(pct), 'String', 'TdBar') +
                cell('-', 'String', 'TdCenter'),
              19,
            ),
          );
        });

        const avg = count > 0 ? (sum / count).toFixed(2) : '0';
        summaryRows.push(
          row(
            cell('RATA-RATA', 'String', 'TdTotal') +
              cell(`Rata-rata Rating: ${avg} / 5.0 Bintang`, 'String', 'TdTotal') +
              cell(totalV, 'Number', 'TdTotal') +
              cell('100%', 'String', 'TdTotal') +
              cell(`Skor: ${avg} / 5.0`, 'String', 'TdTotal') +
              cell('-', 'String', 'TdTotal'),
            20,
          ),
        );
      } else if (q.type === 'open_text') {
        const wordFreq: Record<string, number> = {};
        qVotes.forEach((v) => {
          const text = String(v.vote || '').trim();
          if (text) wordFreq[text] = (wordFreq[text] || 0) + 1;
        });

        const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
        sorted.forEach(([w, count], wordIdx) => {
          const pct = totalV > 0 ? Math.round((count / totalV) * 100) : 0;
          summaryRows.push(
            row(
              cell(wordIdx + 1, 'Number', 'TdCenter') +
                cell(`"${w}"`, 'String', 'Td') +
                cell(count, 'Number', 'TdNum') +
                cell(`${pct}%`, 'String', 'TdPct') +
                cell(makeBar(pct), 'String', 'TdBar') +
                cell('-', 'String', 'TdCenter'),
              19,
            ),
          );
        });

        summaryRows.push(
          row(
            cell('TOTAL', 'String', 'TdTotal') +
              cell(`Total ${sorted.length} Kata / Respon Unik`, 'String', 'TdTotal') +
              cell(totalV, 'Number', 'TdTotal') +
              cell('100%', 'String', 'TdTotal') +
              cell(makeBar(100), 'String', 'TdBar') +
              cell('-', 'String', 'TdTotal'),
            20,
          ),
        );
      } else {
        const options = (q.options as Record<string, string>) || {};
        const counts: Record<string, number> = {};
        Object.keys(options).forEach((k) => (counts[k] = 0));

        qVotes.forEach((v) => {
          const val = v.vote;
          if (q.type === 'multiple_choice' && typeof val === 'string' && counts[val] !== undefined) {
            counts[val]++;
          } else if (Array.isArray(val)) {
            val.forEach((item) => {
              if (typeof item === 'string' && counts[item] !== undefined) {
                counts[item]++;
              }
            });
          }
        });

        const correctArr = q.correctAnswer
          ? Array.isArray(q.correctAnswer)
            ? q.correctAnswer
            : [q.correctAnswer]
          : [];
        const correctSet = new Set<string>((correctArr as string[]).map(String));

        Object.entries(options).forEach(([k, label]) => {
          const count = counts[k] || 0;
          const pct = totalV > 0 ? Math.round((count / totalV) * 100) : 0;
          const isCorrectKey = correctSet.has(k);

          summaryRows.push(
            row(
              cell(k.toUpperCase(), 'String', 'TdCenter') +
                cell(label, 'String', 'Td') +
                cell(count, 'Number', 'TdNum') +
                cell(`${pct}%`, 'String', 'TdPct') +
                cell(makeBar(pct), 'String', 'TdBar') +
                (isCorrectKey ? cell('✓ Kunci Jawaban', 'String', 'TdCorrect') : cell('-', 'String', 'TdCenter')),
              19,
            ),
          );
        });

        summaryRows.push(
          row(
            cell('TOTAL', 'String', 'TdTotal') +
              cell('Total Respon Masuk', 'String', 'TdTotal') +
              cell(totalV, 'Number', 'TdTotal') +
              cell('100%', 'String', 'TdTotal') +
              cell(makeBar(100), 'String', 'TdBar') +
              cell('-', 'String', 'TdTotal'),
            20,
          ),
        );
      }

      summaryRows.push(row('', 10)); // Spacer between questions
    });

    // --- SHEET 2: DETAIL RESPON PESERTA ---
    const computePoints = (question: (typeof questions)[number], isCorrect: boolean, vote: (typeof votes)[number]) => {
      if (!isCorrect) return 0;
      const timer = question.timer;
      const activatedAt = session.activeQuestionActivatedAt;
      if (!timer || !activatedAt) return 1000;
      const elapsed = Math.max(0, Math.min(timer, vote.updatedAt.getTime() / 1000 - activatedAt));
      const factor = Math.max(0.1, 1 - elapsed / timer);
      return Math.round(1000 * factor);
    };

    const sheet2Cols = `
  <Column ss:Width="40"/>
  <Column ss:Width="130"/>
  <Column ss:Width="170"/>
  <Column ss:Width="120"/>
  <Column ss:Width="60"/>
  <Column ss:Width="280"/>
  <Column ss:Width="220"/>
  ${isQuiz ? '<Column ss:Width="90"/><Column ss:Width="70"/>' : ''}
`;

    const detailRows: string[] = [];
    detailRows.push(row(cell('LOG DETAIL RESPON PESERTA', 'String', 'Title', isQuiz ? 8 : 6), 22));
    detailRows.push(
      row(
        cell('No', 'String', 'Th') +
          cell('Waktu Vote', 'String', 'Th') +
          cell('Nama Peserta', 'String', 'ThLeft') +
          cell('ID Peserta', 'String', 'Th') +
          cell('ID Soal', 'String', 'Th') +
          cell('Pertanyaan', 'String', 'ThLeft') +
          cell('Jawaban Peserta', 'String', 'ThLeft') +
          (isQuiz ? cell('Status', 'String', 'Th') + cell('Poin', 'String', 'Th') : ''),
        20,
      ),
    );

    votes.forEach((v, idx) => {
      const q = questions.find((item) => item.qId === v.questionId);
      const qTitle = q ? q.title : v.questionId;
      const options = (q?.options as Record<string, string>) || {};

      let answerDisplay = '';
      if (q?.type === 'rating') {
        answerDisplay = `${v.vote} Bintang (★ ${v.vote})`;
      } else if (q?.type === 'open_text') {
        answerDisplay = String(v.vote || '');
      } else if (Array.isArray(v.vote)) {
        answerDisplay = v.vote
          .map((k) => (options[String(k)] ? `[${String(k).toUpperCase()}] ${options[String(k)]}` : String(k)))
          .join(', ');
      } else {
        const k = String(v.vote);
        answerDisplay = options[k] ? `[${k.toUpperCase()}] ${options[k]}` : k;
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
          cell(idx + 1, 'Number', 'TdCenter') +
            cell(v.updatedAt.toLocaleString('id-ID'), 'String', 'TdCenter') +
            cell(v.participantName || 'Tanpa Nama', 'String', 'Td') +
            cell(v.participantId, 'String', 'TdCenter') +
            cell(v.questionId, 'String', 'TdCenter') +
            cell(qTitle, 'String', 'Td') +
            cell(answerDisplay, 'String', 'Td') +
            (isQuiz
              ? (q?.correctAnswer
                  ? isCorrect
                    ? cell('✓ Benar', 'String', 'TdCorrect')
                    : cell('✗ Salah', 'String', 'TdWrong')
                  : cell('-', 'String', 'TdCenter')) + cell(points, 'Number', 'TdNum')
              : ''),
          20,
        ),
      );
    });

    // --- SHEET 3: REKAP KUIS (Jika ada pertanyaan kuis) ---
    let quizLeaderboardSheet = '';
    if (isQuiz) {
      const sheet3Cols = `
  <Column ss:Width="70"/>
  <Column ss:Width="180"/>
  <Column ss:Width="120"/>
  <Column ss:Width="110"/>
  <Column ss:Width="90"/>
  <Column ss:Width="90"/>
  <Column ss:Width="120"/>
`;
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
        row(cell('PAPAN PERINGKAT KUIS (LEADERBOARD)', 'String', 'Title', 6), 22),
        row(
          cell('Peringkat', 'String', 'Th') +
            cell('Nama Peserta', 'String', 'ThLeft') +
            cell('ID Peserta', 'String', 'Th') +
            cell('Jawaban Benar', 'String', 'Th') +
            cell('Total Soal', 'String', 'Th') +
            cell('Akurasi (%)', 'String', 'Th') +
            cell('Total Skor (Poin)', 'String', 'Th'),
          20,
        ),
        ...sortedParticipants.map((p, i) => {
          const rankBadge = i === 0 ? '🥇 1' : i === 1 ? '🥈 2' : i === 2 ? '🥉 3' : `${i + 1}`;
          const accuracy = p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0;
          return row(
            cell(rankBadge, 'String', 'TdCenter') +
              cell(p.name, 'String', 'Td') +
              cell(p.id, 'String', 'TdCenter') +
              cell(p.correct, 'Number', 'TdNum') +
              cell(p.total, 'Number', 'TdNum') +
              cell(`${accuracy}%`, 'String', 'TdPct') +
              cell(p.points, 'Number', 'TdNum'),
            20,
          );
        }),
      ];

      quizLeaderboardSheet = sheet('Peringkat Kuis', sheet3Cols, quizRows.join(''));
    }

    const xml =
      `<?xml version="1.0"?>` +
      `<?mso-application progid="Excel.Sheet"?>` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"` +
      ` xmlns:o="urn:schemas-microsoft-com:office:office"` +
      ` xmlns:x="urn:schemas-microsoft-com:office:excel"` +
      ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"` +
      ` xmlns:html="http://www.w3.org/TR/REC-html40">` +
      `<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">` +
      `<Author>LivePoll</Author>` +
      `<Created>${new Date().toISOString()}</Created>` +
      `</DocumentProperties>` +
      stylesXml +
      sheet('Ringkasan Polling', sheet1Cols, summaryRows.join('')) +
      sheet('Detail Respon Peserta', sheet2Cols, detailRows.join('')) +
      (quizLeaderboardSheet || '') +
      `</Workbook>`;

    const slug =
      (session.title || code)
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
