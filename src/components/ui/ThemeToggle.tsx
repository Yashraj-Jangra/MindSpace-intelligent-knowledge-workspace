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
      document.body?.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body?.classList.remove('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('mindspace-theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
      document.body?.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body?.classList.remove('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-1.5 border border-[#262626] text-[#FAFAFA] hover:text-[#FF3D00] hover:border-[#FF3D00] transition-colors flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider bg-[#1A1A1A] cursor-pointer"
      title={`Switch to ${theme === 'dark' ? 'White/Light' : 'Dark'} Theme`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-[#FF3D00]" />
          <span className="hidden sm:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-[#FF3D00]" />
          <span className="hidden sm:inline text-[#0F172A]">Dark Mode</span>
        </>
      )}
    </button>
  );
}
