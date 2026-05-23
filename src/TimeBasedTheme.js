import { useState, useEffect } from 'react';

const GLASS = {
  blur: '32px',
  scrim: 'rgba(0, 0, 0, 0.45)',
  shadow:
    '0 12px 40px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
  textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
};

/** Sunrise / daylight / sunset / night — each with glass + high-contrast text. */
export const getTimeBasedTheme = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      period: 'morning',
      label: 'Sunrise',
      gradient:
        'linear-gradient(165deg, #0f2744 0%, #1d4ed8 28%, #f59e0b 62%, #fde047 100%)',
      bgColor: '#0a1628',
      surfaceColor: 'rgba(15, 30, 55, 0.55)',
      cardColor: 'rgba(12, 24, 48, 0.62)',
      inputBg: 'rgba(8, 18, 36, 0.75)',
      headerBg: 'rgba(10, 22, 42, 0.72)',
      navBg: 'rgba(10, 22, 42, 0.78)',
      glassBg: 'rgba(255, 255, 255, 0.11)',
      glassBorder: 'rgba(255, 255, 255, 0.28)',
      orbA: 'rgba(251, 191, 36, 0.35)',
      orbB: 'rgba(59, 130, 246, 0.3)',
      text: '#ffffff',
      muted: '#e2e8f0',
      secondaryText: '#f1f5f9',
      accentColor: '#fbbf24',
      accentLight: '#fde68a',
      accentFg: '#0f172a',
      border: 'rgba(255, 255, 255, 0.22)',
      borderM: 'rgba(251, 191, 36, 0.45)',
      red: '#fca5a5',
      green: '#6ee7b7',
      blue: '#93c5fd',
      purple: '#c4b5fd',
      ...GLASS,
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      period: 'afternoon',
      label: 'Daylight',
      gradient:
        'linear-gradient(165deg, #1c1410 0%, #c2410c 35%, #f59e0b 70%, #fef08a 100%)',
      bgColor: '#1a1008',
      surfaceColor: 'rgba(40, 24, 12, 0.55)',
      cardColor: 'rgba(32, 18, 8, 0.62)',
      inputBg: 'rgba(24, 12, 4, 0.75)',
      headerBg: 'rgba(28, 16, 8, 0.72)',
      navBg: 'rgba(28, 16, 8, 0.78)',
      glassBg: 'rgba(255, 255, 255, 0.12)',
      glassBorder: 'rgba(255, 255, 255, 0.3)',
      orbA: 'rgba(251, 146, 60, 0.4)',
      orbB: 'rgba(234, 179, 8, 0.28)',
      text: '#ffffff',
      muted: '#fef3c7',
      secondaryText: '#fffbeb',
      accentColor: '#fb923c',
      accentLight: '#fdba74',
      accentFg: '#1c1917',
      border: 'rgba(255, 255, 255, 0.24)',
      borderM: 'rgba(251, 146, 60, 0.5)',
      red: '#fecaca',
      green: '#86efac',
      blue: '#bfdbfe',
      purple: '#ddd6fe',
      ...GLASS,
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      period: 'evening',
      label: 'Sunset',
      gradient:
        'linear-gradient(165deg, #1a0512 0%, #dc2626 25%, #a855f7 55%, #581c87 100%)',
      bgColor: '#12060e',
      surfaceColor: 'rgba(40, 12, 32, 0.55)',
      cardColor: 'rgba(32, 10, 28, 0.62)',
      inputBg: 'rgba(20, 6, 18, 0.75)',
      headerBg: 'rgba(28, 8, 24, 0.72)',
      navBg: 'rgba(28, 8, 24, 0.78)',
      glassBg: 'rgba(255, 255, 255, 0.1)',
      glassBorder: 'rgba(255, 255, 255, 0.26)',
      orbA: 'rgba(244, 63, 94, 0.38)',
      orbB: 'rgba(168, 85, 247, 0.35)',
      text: '#ffffff',
      muted: '#f3e8ff',
      secondaryText: '#faf5ff',
      accentColor: '#e879f9',
      accentLight: '#f0abfc',
      accentFg: '#1e1033',
      border: 'rgba(255, 255, 255, 0.22)',
      borderM: 'rgba(232, 121, 249, 0.48)',
      red: '#fda4af',
      green: '#86efac',
      blue: '#a5b4fc',
      purple: '#f0abfc',
      ...GLASS,
    };
  }

  return {
    period: 'night',
    label: 'Night',
    gradient:
      'linear-gradient(165deg, #020617 0%, #312e81 45%, #0f172a 100%)',
    bgColor: '#020617',
    surfaceColor: 'rgba(15, 23, 42, 0.58)',
    cardColor: 'rgba(12, 18, 36, 0.65)',
    inputBg: 'rgba(2, 6, 23, 0.78)',
    headerBg: 'rgba(15, 23, 42, 0.75)',
    navBg: 'rgba(15, 23, 42, 0.82)',
    glassBg: 'rgba(255, 255, 255, 0.09)',
    glassBorder: 'rgba(255, 255, 255, 0.22)',
    orbA: 'rgba(99, 102, 241, 0.35)',
    orbB: 'rgba(59, 130, 246, 0.25)',
    text: '#ffffff',
    muted: '#cbd5e1',
    secondaryText: '#e2e8f0',
    accentColor: '#818cf8',
    accentLight: '#a5b4fc',
    accentFg: '#0f172a',
    border: 'rgba(255, 255, 255, 0.2)',
    borderM: 'rgba(129, 140, 248, 0.45)',
    red: '#fca5a5',
    green: '#6ee7b7',
    blue: '#93c5fd',
    purple: '#c4b5fd',
    ...GLASS,
  };
};

export const themeToCssVars = (theme) => ({
  '--ct-bg': theme.bgColor,
  '--ct-surface': theme.surfaceColor,
  '--ct-card': theme.glassBg,
  '--ct-input-bg': theme.inputBg,
  '--ct-header-bg': theme.headerBg,
  '--ct-nav-bg': theme.navBg,
  '--ct-text': theme.text,
  '--ct-muted': theme.muted,
  '--ct-secondary': theme.secondaryText,
  '--ct-accent': theme.accentColor,
  '--ct-accent-light': theme.accentLight,
  '--ct-accent-fg': theme.accentFg,
  '--ct-border': theme.border,
  '--ct-border-m': theme.borderM,
  '--ct-red': theme.red,
  '--ct-green': theme.green,
  '--ct-blue': theme.blue,
  '--ct-purple': theme.purple,
  '--ct-glass-bg': theme.glassBg,
  '--ct-glass-border': theme.glassBorder,
  '--ct-glass-blur': theme.blur,
  '--ct-glass-shadow': theme.shadow,
  '--ct-scrim': theme.scrim,
  '--ct-text-shadow': theme.textShadow,
  '--ct-orb-a': theme.orbA,
  '--ct-orb-b': theme.orbB,
  '--ct-orb-opacity': '0.5',
});

export const useTimeBasedTheme = () => {
  const [theme, setTheme] = useState(getTimeBasedTheme());

  useEffect(() => {
    const updateTheme = () => setTheme(getTimeBasedTheme());
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  return theme;
};
