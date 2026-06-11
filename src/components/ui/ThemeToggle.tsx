'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('mindspace-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('mindspace-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 border border-[#262626] light:border-[#E2E8F0] text-[#737373] light:text-[#64748B] hover:text-[#FF3D00] light:hover:text-[#FF3D00] transition-colors flex items-center gap-1 text-xs font-mono uppercase tracking-wider"
      title={`Switch to ${theme === 'dark' ? 'White/Light' : 'Dark'} Theme`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-[#FF3D00]" />
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#0F172A]" />
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}
