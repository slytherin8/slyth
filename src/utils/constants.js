// API Configuration
export const API_CONFIG = {
    BASE_URL: __DEV__ ? 'http://localhost:5000/api/v1' : 'https://api.securecollab.com/v1',
    SOCKET_URL: __DEV__ ? 'http://localhost:5000' : 'https://api.securecollab.com',
    TIMEOUT: 10000,
};

// App Constants
export const APP_CONSTANTS = {
    USE_MOCK_DATA: true, // Set to true to run without a backend
    SESSION_TIMEOUT: 30 * 60 * 1000,
    PIN_LENGTH: 4,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    SUPPORTED_FILE_TYPES: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'],
};

// User Roles
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
};

// Message Types
export const MESSAGE_TYPES = {
    TEXT: 'text',
    FILE: 'file',
    SYSTEM: 'system',
};

// Call Types
export const CALL_TYPES = {
    AUDIO: 'audio',
    VIDEO: 'video',
    SCREEN_SHARE: 'screen-share',
};

// Notification Types
export const NOTIFICATION_TYPES = {
    MESSAGE: 'message',
    MENTION: 'mention',
    CALL: 'call',
    FILE: 'file',
    SYSTEM: 'system',
};

// Colors
export const COLORS = {
    primary: '#0066FF',
    secondary: '#6C63FF',
    success: '#28A745',
    danger: '#DC3545',
    warning: '#FFC107',
    dark: '#1A1A2E',
    light: '#F8F9FA',
    white: '#FFFFFF',
    gray: '#6C757D',
    background: '#F5F7FA',
    cardBackground: '#FFFFFF',
    border: '#E1E8ED',
    text: '#2D3436',
    textSecondary: '#636E72',
    online: '#28A745',
    away: '#FFC107',
    busy: '#DC3545',
    offline: '#6C757D',
};

// Theme
export const THEME = {
    colors: COLORS,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 999,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
    fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        lg: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 5,
        },
    },
};
