import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

const envFile = process.env.NODE_ENV === 'production' ? '.env.production.local' : '.env.development.local';
dotenv.config({ path: envFile });
dotenv.config();

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

const rawUrl = process.env['MIGRATE_DATABASE_URL'] || process.env['DATABASE_URL'] || '';
const dbUrl = encodeDbUrl(rawUrl);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: dbUrl || undefined,
  },
});
