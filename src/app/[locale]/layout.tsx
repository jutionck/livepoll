import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeInit } from '@/components/ThemeInit';
import Providers from './providers';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const BASE_URL = 'https://livepoll.mipdevp.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';

  const title = isEn ? 'LivePoll — Real-time Interactive Polling' : 'LivePoll — Polling Interaktif Real-time';
  const description = isEn
    ? 'Create live polls for webinars, seminars, and classes. Audience joins via QR code and results appear in real-time on your screen. Free forever, no sign-up.'
    : 'Buat polling langsung untuk webinar, seminar, dan kelas. Audiens bergabung via QR code dan hasil muncul real-time di layar Anda. Gratis selamanya, tanpa daftar.';

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        id: '/id',
        en: '/en',
      },
    },
    openGraph: {
      type: 'website',
      url: `${BASE_URL}/${locale}`,
      title,
      description,
      siteName: 'LivePoll',
      locale: isEn ? 'en_US' : 'id_ID',
      alternateLocale: isEn ? ['id_ID'] : ['en_US'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeInit />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
