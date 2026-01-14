import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '../services/api';

const NotificationContext = createContext({});

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationProvider = ({ children }) => {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        registerForPushNotifications();

        // Listen for notifications received while app is foregrounded
        const notificationListener = Notifications.addNotificationReceivedListener(
            (notification) => {
                setNotifications((prev) => [notification, ...prev]);
                setUnreadCount((prev) => prev + 1);
            }
        );

        // Listen for when user taps on notification
        const responseListener = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const notification = response.notification;
                handleNotificationTapped(notification);
            }
        );

        return () => {
            Notifications.removeNotificationSubscription(notificationListener);
            Notifications.removeNotificationSubscription(responseListener);
        };
    }, []);

    const registerForPushNotifications = async () => {
        if (!Device.isDevice) {
            console.log('Push notifications only work on physical devices');
            return;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification');
                return;
            }

            const token = (await Notifications.getExpoPushTokenAsync()).data;
            setExpoPushToken(token);

            // Send token to backend
            await api.post('/notifications/subscribe', {
                token,
                platform: Platform.OS,
            });

            console.log('Push notification token registered:', token);
        } catch (error) {
            console.error('Error registering for push notifications:', error);
        }

        // Android-specific channel setup
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0066FF',
            });
        }
    };

    const handleNotificationTapped = (notification) => {
        console.log('Notification tapped:', notification);
        // Navigate to appropriate screen based on notification type
        // This would integrate with your navigation system
    };

    const sendLocalNotification = async (title, body, data = {}) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
            },
            trigger: null, // Show immediately
        });
    };

    const markAsRead = (notificationId) => {
        setNotifications((prev) =>
            prev.map((notif) =>
                notif.request.identifier === notificationId
                    ? { ...notif, isRead: true }
                    : notif
            )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const clearAllNotifications = async () => {
        await Notifications.dismissAllNotificationsAsync();
        setNotifications([]);
        setUnreadCount(0);
    };

    const value = {
        expoPushToken,
        notifications,
        unreadCount,
        sendLocalNotification,
        markAsRead,
        clearAllNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export default NotificationContext;
