import api from './api';
import { APP_CONSTANTS } from '../utils/constants';
import { MOCK_ADMIN, MOCK_EMPLOYEE, MOCK_USER } from '../utils/mockData';

/**
 * Authentication Service
 */
const authService = {
    /**
     * Register new user
     */
    register: async (userData) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => resolve({
                data: { success: true, user: MOCK_USER, accessToken: 'mock-token', refreshToken: 'mock-refresh' }
            }), 1000));
        }
        const response = await api.post('/auth/register', userData);
        return response.data;
    },

    /**
     * Login user
     */
    login: async (credentials) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            // Priority: explicit selection > email detection
            let user = MOCK_EMPLOYEE;
            if (credentials.role === 'admin' || (credentials.email?.includes('admin') && !credentials.role)) {
                user = MOCK_ADMIN;
            }

            return new Promise((resolve) => setTimeout(() => resolve({
                data: { success: true, user: user, accessToken: 'mock-token', refreshToken: 'mock-refresh' }
            }), 1000));
        }
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    /**
     * Verify 2FA token
     */
    verify2FA: async (userId, token) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { success: true } };
        const response = await api.post('/auth/verify-2fa', { userId, token });
        return response.data;
    },

    /**
     * Verify PIN
     */
    verifyPIN: async (pin) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { success: true } };
        const response = await api.post('/auth/verify-pin', { pin });
        return response.data;
    },

    /**
     * Logout user
     */
    logout: async () => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { success: true } };
        const response = await api.post('/auth/logout');
        return response.data;
    },

    /**
     * Refresh access token
     */
    refreshToken: async (refreshToken) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { token: 'mock-token' } };
        const response = await api.post('/auth/refresh', { refreshToken });
        return response.data;
    },

    /**
     * Get current user profile
     */
    getCurrentUser: async () => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { user: MOCK_USER } };
        const response = await api.get('/users/me');
        return response.data;
    },

    /**
     * Update user profile
     */
    updateProfile: async (updates) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { user: { ...MOCK_USER, ...updates } } };
        const response = await api.put('/users/me', updates);
        return response.data;
    },

    /**
     * Set PIN lock
     */
    setPIN: async (pin, currentPassword) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { success: true } };
        const response = await api.post('/users/me/pin', { pin, currentPassword });
        return response.data;
    },

    /**
     * Enable/disable 2FA
     */
    toggle2FA: async (enabled) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) return { data: { success: true, twoFactorEnabled: enabled } };
        const response = await api.post('/auth/2fa/toggle', { enabled });
        return response.data;
    },
};

export default authService;
