import crypto from 'crypto';

const PEPPER = process.env.HOST_AUTH_PEPPER || 'livepoll-host-auth';

export const hashPassword = (password: string): string => {
  const salted = `${PEPPER}:${password}`;
  return crypto.createHash('sha256').update(salted).digest('hex');
};

export const generateAuthToken = (): { token: string; hash: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

export const hashAuthToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
