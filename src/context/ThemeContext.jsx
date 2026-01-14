import React, { createContext, useContext, useState } from 'react';
import { THEME } from '../utils/constants';

const ThemeContext = createContext({});

export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const theme = {
        ...THEME,
        colors: {
            ...THEME.colors,
            ...(isDarkMode && {
                background: '#1A1A2E',
                cardBackground: '#16213E',
                text: '#FFFFFF',
                textSecondary: '#B0B3B8',
                border: '#2C3E50',
            }),
        },
    };

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    const value = {
        theme,
        isDarkMode,
        toggleTheme,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

export default ThemeContext;
