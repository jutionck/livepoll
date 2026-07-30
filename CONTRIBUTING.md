# Contributing to LivePoll

Terima kasih sudah tertarik berkontribusi pada LivePoll! Berikut panduan singkatnya.

## Cara Berkontribusi

1. **Fork** repositori ini
2. **Clone** fork Anda
3. Buat **branch fitur** baru
4. Lakukan perubahan
5. Jalankan `npm run build` untuk memastikan tidak ada error
6. Buat **Pull Request**

## Aturan

- Ikuti kode style yang sudah ada (Prettier + ESLint)
- Pastikan tidak ada error TypeScript (`tsc -b`)
- Tulis kode yang bersih dan mudah dibaca

## Setup Development

```bash
git clone https://github.com/jutionck/live-polling-webinar.git
cd live-polling-webinar
npm install
cp .env.example .env.development.local
# Isi DATABASE_URL dengan koneksi PostgreSQL lokal
npm run dev
```

## Melaporkan Issue

Gunakan template issue yang sudah disediakan di GitHub.
