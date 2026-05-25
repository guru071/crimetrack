import { useState, useEffect } from 'react';

const GLASS = {
  blur: '0px',
  scrim: 'rgba(15, 23, 42, 0.02)',
  shadow: '0 10px 24px rgba(15, 23, 42, 0.10)',
  textShadow: 'none',
};

const SUNRISE_THEME = {
  period: 'sunrise',
  label: 'Pro',
  gradient: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
  bgColor: '#f8fafc',
  surfaceColor: '#ffffff',
  cardColor: '#ffffff',
  inputBg: '#ffffff',
  headerBg: 'rgba(255, 255, 255, 0.96)',
  navBg: 'rgba(255, 255, 255, 0.98)',
  glassBg: '#ffffff',
  glassBorder: '#d7dee8',
  orbA: 'transparent',
  orbB: 'transparent',
  text: '#0f172a',
  muted: '#475569',
  secondaryText: '#334155',
  accentColor: '#f59e0b',
  accentLight: '#fbbf24',
  accentFg: '#111827',
  border: '#d7dee8',
  borderM: '#f59e0b',
  red: '#dc2626',
  green: '#059669',
  blue: '#2563eb',
  purple: '#7c3aed',
  ...GLASS,
};

export const getTimeBasedTheme = () => ({ ...SUNRISE_THEME });

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
    setTheme(getTimeBasedTheme());
  }, []);

  return theme;
};
