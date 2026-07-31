# LivePoll — Real-time Interactive Polling

Interactive polling platform for webinars, seminars, training, and presentations. Participants join via QR code from their phones, and results appear instantly on the presenter's screen in real-time.

![Next.js](https://img.shields.io/badge/Next.js-16-000)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Polling
- Real-time results with 1-second updates (powered by TanStack Query)
- Multiple Choice, Multiple Selection, Rating 1-5
- Automatic countdown timer per question (auto-closes voting)
- Duplicate vote prevention (unique participant ID + server validation)
- QR Code join & session code with automatic locale in URL
- Fullscreen presentation mode with live charts

### Internationalization (i18n)
- Full Indonesian (`/id`) and English (`/en`) support via next-intl
- Automatic locale detection based on browser language
- ID/EN language toggle in navbar & footer
- Locale-aware join URLs: `/{locale}/join/{code}`

### Platform
- Path-based routing (no hash router)
- Dark Mode / Light Mode (follows system preference, no flash on switch)
- TanStack Query for efficient polling & caching
- Responsive mobile-first design
- Stats tracking (total sessions & votes)
- Open source & free

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | Fullstack React framework |
| **PostgreSQL** | Database via Supabase / Neon / local |
| **Prisma ORM** | Type-safe database client & migrations |
| **TanStack Query** | Data fetching & polling |
| **next-intl** | Internationalization (ID/EN) |
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

## Deployment to Vercel

1. Push the repo to GitHub
2. Import the project into [Vercel](https://vercel.com)
3. Set the `DATABASE_URL` environment variable in the Vercel dashboard (use Supabase Transaction Pooler, port 6543)
4. Run migrations against Supabase using the Session Pooler (port 5432):
   ```bash
   npx prisma migrate deploy
   ```
5. Deploy

> **Note:** Passwords with special characters (`@`, `?`, etc.) in `DATABASE_URL` are automatically URL-encoded by the app, no manual encoding needed.

## Support

If this project is helpful to you, consider supporting the developer:

[![Saweria](https://img.shields.io/badge/Saweria-Support%20Developer-red)](https://saweria.co/jutionck)

## License

[MIT](LICENSE)
