import React, { createContext, useState, useContext } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("dark");
  const [primaryColor, setPrimaryColor] = useState("#ff4757");

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const changePrimaryColor = (color) => {
    setPrimaryColor(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, primaryColor, changePrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);