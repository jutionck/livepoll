import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - files in /public
  // - api routes
  // - files with extensions (.png, .ico, etc.)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
