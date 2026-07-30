import postgres from 'postgres';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getDb(): postgres.Sql {
  if (globalForDb.conn) return globalForDb.conn;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  globalForDb.conn = postgres(url, {
    ssl: isLocal ? false : 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

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
