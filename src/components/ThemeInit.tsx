'use client';

import { useLayoutEffect } from 'react';

export function ThemeInit() {
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', dark);
    } catch {
      // ignore
    }
  }, []);

  return null;
}
