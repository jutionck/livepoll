'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Landing } from './Landing';
import { HostNew } from './HostNew';
import { HostControl } from './HostControl';
import { Presentation } from './Presentation';
import { Join } from './Join';
import { JoinSession } from './JoinSession';
import { Admin } from './Admin';
import { ResultsPage } from './ResultsPage';

export default function App() {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Initialize Theme following system preference by default
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navigate = (path: string) => {
    router.push(path);
  };

  if (pathname === '/') {
    return <Landing navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (pathname === '/host/new') {
    return <HostNew navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (pathname === '/join') {
    return <Join navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (pathname === '/admin') {
    return <Admin navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const hostMatch = pathname.match(/^\/host\/([A-Za-z0-9]+)$/);
  if (hostMatch) {
    const code = hostMatch[1].toUpperCase();
    return <HostControl code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const presentMatch = pathname.match(/^\/present\/([A-Za-z0-9]+)$/);
  if (presentMatch) {
    const code = presentMatch[1].toUpperCase();
    return <Presentation code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const joinMatch = pathname.match(/^\/join\/([A-Za-z0-9]+)$/);
  if (joinMatch) {
    const code = joinMatch[1].toUpperCase();
    return <JoinSession code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const hasilMatch = pathname.match(/^\/hasil\/([A-Za-z0-9]+)$/);
  if (hasilMatch) {
    const code = hasilMatch[1].toUpperCase();
    return <ResultsPage code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  return <Landing navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
}
