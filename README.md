# LivePoll — Real-time Interactive Polling

Interactive polling platform for webinars, seminars, training, and presentations. Participants join via QR code from their phones, and results appear instantly on the presenter's screen in real-time.

![Next.js](https://img.shields.io/badge/Next.js-16-000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- Real-time polling with 1-second updates
- Multiple Choice, Multiple Selection, Rating 1-5
- QR Code join & session code
- Dark Mode / Light Mode (follows system preference)
- Automatic timer per question
- Fullscreen presentation mode
- No registration required for participants
- Open source & free

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Fullstack React framework |
| **PostgreSQL** | Database via Supabase / Neon / local |
| **Prisma ORM** | Type-safe database client & migrations |
| **Tailwind CSS v4** | Styling |
| **Lucide React** | Icons |
| **qrcode.react** | QR Code generation |

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/jutionck/livepoll.git
cd livepoll
npm install
```

### 2. Setup Database

Use a local PostgreSQL or Supabase/Neon.

```bash
# Create local database
createdb livepoll
# Apply migrations
npx prisma migrate dev
```

### 3. Configure Environment

```bash
cp .env.example .env.development.local
# Adjust DATABASE_URL if needed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push the repo to GitHub
2. Import the project into [Vercel](https://vercel.com)
3. Set the `DATABASE_URL` environment variable in the Vercel dashboard (use Supabase Transaction Pooler, port 6543)
4. Run migrations against Supabase using the Session Pooler (port 5432):
   ```bash
   npx prisma migrate deploy
   ```
5. Deploy

## Support

If this project is helpful to you, consider supporting the developer:

[![Saweria](https://img.shields.io/badge/Saweria-Support%20Developer-red)](https://saweria.co/jutionck)

## License

[MIT](LICENSE)
