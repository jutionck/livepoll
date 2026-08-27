# Contributing to LivePoll

Thank you for your interest in contributing to LivePoll! Here is a quick guide.

## How to Contribute

1. **Fork** this repository
2. **Clone** your fork
3. Create a new **feature branch**
4. Make your changes
5. Run `npm run lint`, `npm test`, and `npm run build` to make sure everything still passes
6. Submit a **Pull Request**

## Guidelines

- Follow the existing code style (Prettier + ESLint)
- Ensure there are no TypeScript errors (`tsc -b`)
- Write clean, readable code
- Add tests for new logic in `src/lib/` (see `src/lib/__tests__/` for examples). CI runs `npm test` on every PR.

## Development Setup

Requires Node.js >= 20.9 (see `.nvmrc` — run `nvm use` if you use nvm).

```bash
git clone https://github.com/jutionck/livepoll.git
cd livepoll
npm install
cp .env.example .env.development.local
# Fill in DATABASE_URL with your local PostgreSQL connection
npm run dev
```

## Reporting Issues

Open a [new issue](https://github.com/jutionck/livepoll/issues/new/choose) and pick the Bug report or Feature request template.

## Submitting a Pull Request

Fill in the PR template — it includes a checklist for lint/typecheck/build and a note to test both light/dark mode and both locales (`/id`, `/en`) if your change touches the UI.
