import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-slate-500 dark:text-slate-400"
      title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};
