'use client';

import { useState, useEffect } from 'react';
import { Landing } from './Landing';
import { HostNew } from './HostNew';
import { HostControl } from './HostControl';
import { Presentation } from './Presentation';
import { Join } from './Join';
import { JoinSession } from './JoinSession';

export default function App() {
  const [hash, setHash] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setHash(window.location.hash || '#/');

    const handleHashChange = () => {
      setHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);

    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemDark ? 'dark' : 'light');
    setTheme(initialTheme);

    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
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
    window.location.hash = path;
  };

  if (hash === '#/' || hash === '') {
    return <Landing navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (hash === '#/host/new') {
    return <HostNew navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (hash === '#/join') {
    return <Join navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const hostMatch = hash.match(/^#\/host\/([A-Za-z0-9]+)$/);
  if (hostMatch) {
    const code = hostMatch[1].toUpperCase();
    return <HostControl code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const presentMatch = hash.match(/^#\/present\/([A-Za-z0-9]+)$/);
  if (presentMatch) {
    const code = presentMatch[1].toUpperCase();
    return <Presentation code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  const joinMatch = hash.match(/^#\/join\/([A-Za-z0-9]+)$/);
  if (joinMatch) {
    const code = joinMatch[1].toUpperCase();
    return <JoinSession code={code} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
  }

  return <Landing navigate={navigate} theme={theme} toggleTheme={toggleTheme} />;
}
