"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start 'light' so the server HTML and the client's first render match exactly
  // (no hydration mismatch). The actual visual theme is already applied before
  // paint by the inline script in layout.tsx via the data-theme attribute; here
  // we just sync React state to it right after mount.
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark' || attr === 'light') {
      setTheme(attr);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('theme', next); } catch { /* ignore */ }

      const root = document.documentElement;
      // Briefly enable a smooth color transition only during the switch.
      root.classList.add('theme-transitioning');
      root.setAttribute('data-theme', next);
      window.setTimeout(() => root.classList.remove('theme-transitioning'), 320);

      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
