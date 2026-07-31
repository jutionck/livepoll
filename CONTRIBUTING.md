# Contributing to LivePoll

Thank you for your interest in contributing to LivePoll! Here is a quick guide.

## How to Contribute

1. **Fork** this repository
2. **Clone** your fork
3. Create a new **feature branch**
4. Make your changes
5. Run `npm run build` to ensure there are no errors
6. Submit a **Pull Request**

## Guidelines

- Follow the existing code style (Prettier + ESLint)
- Ensure there are no TypeScript errors (`tsc -b`)
- Write clean, readable code

## Development Setup

```bash
git clone https://github.com/jutionck/livepoll.git
cd livepoll
npm install
cp .env.example .env.development.local
# Fill in DATABASE_URL with your local PostgreSQL connection
npm run dev
```

## Reporting Issues

Use the provided issue templates on GitHub.
