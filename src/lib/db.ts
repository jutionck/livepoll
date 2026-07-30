import postgres from 'postgres';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
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

function getDb(): postgres.Sql {
  if (globalForDb.conn) return globalForDb.conn;

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!rawUrl.startsWith('postgres://') && !rawUrl.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must start with "postgres://" or "postgresql://". ' +
        'Current value starts with: ' + rawUrl.substring(0, 20) + '...',
    );
  }

  const url = encodeDbUrl(rawUrl);
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  try {
    globalForDb.conn = postgres(url, {
      ssl: isLocal ? false : 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  } catch (err: any) {
    throw new Error(
      `Database connection failed: ${err.message}. ` +
        `Check that your DATABASE_URL environment variable is correct.`,
    );
  }

  return globalForDb.conn;
}

const db = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_target, _thisArg, args) {
    return getDb()(args[0] as TemplateStringsArray, ...args.slice(1));
  },
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export default db;
