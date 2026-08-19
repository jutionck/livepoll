import crypto from 'crypto';
import prisma from './db';

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

export const isHostAuthorized = async (
  session: { hostTokenHash: string; hostAccountId?: string | null },
  request: Request,
): Promise<boolean> => {
  try {
    const url = new URL(request.url);
    const tokenHeader =
      request.headers.get('X-Host-Token') || url.searchParams.get('host_token') || url.searchParams.get('token') || '';
    if (tokenHeader) {
      const hash = crypto.createHash('sha256').update(tokenHeader).digest('hex');
      if (hash === session.hostTokenHash) return true;
    }
    const accountToken = request.headers.get('X-Host-Account-Token') || url.searchParams.get('account_token') || '';
    if (accountToken && session.hostAccountId) {
      const accountHash = hashAuthToken(accountToken);
      const account = await prisma.hostAccount.findFirst({
        where: { authTokenHash: accountHash, id: session.hostAccountId },
        select: { id: true },
      });
      if (account) return true;
    }
  } catch {}
  return false;
};
