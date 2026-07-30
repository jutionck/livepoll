# LivePoll — Polling Interaktif Real-time

Platform polling interaktif untuk webinar, seminar, training, dan presentasi. Peserta bergabung melalui QR code dari ponsel, hasil langsung tampil di layar presenter secara real-time.

![Next.js](https://img.shields.io/badge/Next.js-16-000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![License](https://img.shields.io/badge/License-MIT-green)

## Fitur

- Polling real-time dengan update setiap 1 detik
- Multiple Choice, Multiple Selection, Rating 1-5
- QR Code join & kode sesi
- Dark Mode / Light Mode (ikuti sistem)
- Timer otomatis per pertanyaan
- Mode presentasi layar penuh
- Tanpa registrasi untuk peserta
- Open source & gratis

## Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| **Next.js 16** | Framework React fullstack |
| **PostgreSQL** | Database via Supabase / Neon / lokal |
| **Tailwind CSS v4** | Styling |
| **Lucide React** | Ikon |
| **qrcode.react** | Generate QR Code |

## Cara Install & Jalankan

### 1. Clone & Install

```bash
git clone https://github.com/jutionck/live-polling-webinar.git
cd live-polling-webinar
npm install
```

### 2. Setup Database

Jalankan PostgreSQL lokal atau gunakan Supabase/Neon.

```bash
# Buat database lokal
createdb livepoll
# Jalankan migrasi
psql -d livepoll -f db/schema.sql
```

### 3. Konfigurasi Environment

```bash
cp .env.example .env.development.local
# Sesuaikan DATABASE_URL jika perlu
```

### 4. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Deploy ke Vercel

1. Push repo ke GitHub
2. Import project ke [Vercel](https://vercel.com)
3. Set environment variable `DATABASE_URL` di dashboard Vercel (gunakan Supabase/Neon)
4. Deploy

## Dukungan

Jika project ini bermanfaat, Anda bisa mendukung pengembang melalui:

[![Saweria](https://img.shields.io/badge/Saweria-Dukung%20Developer-red)](https://saweria.co/jutionck)

## Lisensi

[MIT](LICENSE)
