import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTimeBasedTheme } from '../TimeBasedTheme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [timeTheme, setTimeTheme] = useState(getTimeBasedTheme());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTheme(getTimeBasedTheme());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <ThemeContext.Provider value={timeTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
