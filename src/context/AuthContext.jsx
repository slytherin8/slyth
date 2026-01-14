import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionTimeout, setSessionTimeout] = useState(null);

    // Load user from storage on mount
    useEffect(() => {
        loadUser();
    }, []);

    // Session timeout handler
    useEffect(() => {
        if (isAuthenticated) {
            startSessionTimeout();
        }
        return () => clearSessionTimeout();
    }, [isAuthenticated]);

    const loadUser = async () => {
        console.log('[AuthContext] Starting loadUser...');
        try {
            console.log('[AuthContext] Accessing AsyncStorage...');
            const storedUser = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('accessToken');
            console.log('[AuthContext] AsyncStorage check:', { hasUser: !!storedUser, hasToken: !!token });

            if (storedUser && token) {
                console.log('[AuthContext] Parsing user data...');
                const parsedUser = JSON.parse(storedUser);
                const userObj = parsedUser.user || parsedUser;
                console.log('[AuthContext] User object resolved:', userObj.username);
                setUser(userObj);
                setIsAuthenticated(true);
            } else {
                console.log('[AuthContext] No stored user or token found.');
            }
        } catch (error) {
            console.error('[AuthContext] Error in loadUser:', error);
        } finally {
            console.log('[AuthContext] Finalizing loadUser, setting loading to false');
            setLoading(false);
        }
    };

    const startSessionTimeout = () => {
        // Clear existing timeout
        if (sessionTimeout) {
            clearTimeout(sessionTimeout);
        }

        // Set new timeout (30 minutes)
        const timeout = setTimeout(() => {
            logout();
        }, 30 * 60 * 1000);

        setSessionTimeout(timeout);
    };

    const clearSessionTimeout = () => {
        if (sessionTimeout) {
            clearTimeout(sessionTimeout);
            setSessionTimeout(null);
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authService.login(credentials);
            const { user: userData, accessToken, refreshToken, requires2FA } = response.data;

            if (requires2FA) {
                return { requires2FA: true, userId: userData._id };
            }

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            setIsAuthenticated(true);
            startSessionTimeout();

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const response = await authService.register(userData);
            const { user: newUser, accessToken, refreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);
            await AsyncStorage.setItem('user', JSON.stringify(newUser));

            setUser(newUser);
            setIsAuthenticated(true);
            startSessionTimeout();

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const verify2FA = async (userId, token) => {
        try {
            const response = await authService.verify2FA(userId, token);
            const { accessToken, refreshToken } = response.data;

            await AsyncStorage.setItem('accessToken', accessToken);
            await AsyncStorage.setItem('refreshToken', refreshToken);

            const userResponse = await authService.getCurrentUser();
            const userData = userResponse.data.user || userResponse.data;

            await AsyncStorage.setItem('user', JSON.stringify(userData));

            setUser(userData);
            setIsAuthenticated(true);
            startSessionTimeout();

            return { success: true };
        } catch (error) {
            console.error('2FA verification error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            setUser(null);
            setIsAuthenticated(false);
            clearSessionTimeout();
        }
    };

    const updateUser = async (updates) => {
        try {
            const response = await authService.updateProfile(updates);
            const updatedUser = response.data.user || response.data;

            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            return { success: true };
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        verify2FA,
        logout,
        updateUser,
        startSessionTimeout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export default AuthContext;
