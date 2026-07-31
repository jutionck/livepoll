import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function encodeDbUrl(rawUrl: string): string {
  try {
    const protocol = rawUrl.startsWith('postgresql://') ? 'postgresql://' : 'postgres://';
    const rest = rawUrl.slice(protocol.length);
    const lastAt = rest.lastIndexOf('@');
    if (lastAt === -1) return rawUrl;

    const userinfo = rest.slice(0, lastAt);
    const hostPart = rest.slice(lastAt + 1);

    const firstColon = userinfo.indexOf(':');
    if (firstColon === -1) return rawUrl;

    const password = userinfo.slice(firstColon + 1);
    if (!password) return rawUrl;

    const encodedPassword = encodeURIComponent(password);
    if (encodedPassword === password) return rawUrl;

    const username = userinfo.slice(0, firstColon);
    return `${protocol}${username}:${encodedPassword}@${hostPart}`;
  } catch {
    return rawUrl;
  }
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString: encodeDbUrl(rawUrl) });
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return globalForPrisma.prisma;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrismaClient() as any)[prop];
  },
});

export default prisma;
