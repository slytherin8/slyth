import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '../utils/storage';
import { API } from '../constants/api';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class NotificationService {
    constructor() {
        this.token = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    async registerForPushNotificationsAsync() {
        if (Platform.OS === 'web') {
            console.log('Push notifications are not configured for web yet.');
            return null;
        }

        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return null;
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: 'your-project-id',
            });
            this.token = tokenData.data;

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            await this.updateTokenOnBackend(this.token);
            return this.token;
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    }

    async updateTokenOnBackend(token) {
        try {
            const authToken = await AsyncStorage.getItem('token');
            if (!authToken) return;

            await fetch(`${API}/api/auth/push-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ pushToken: token }),
            });
            console.log('Push token updated on backend');
        } catch (error) {
            console.error('Error updating push token on backend:', error);
        }
    }

    initListeners(navigation) {
        // Listener for when a notification is received while the app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received in foreground:', notification);
        });

        // Listener for when a user interacts with a notification (taps it)
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const { data } = response.notification.request.content;
            console.log('Notification interaction data:', data);

            if (data.type === 'direct_chat') {
                navigation.navigate('DirectChat', {
                    userId: data.senderId,
                    userName: data.senderName,
                    userAvatar: data.senderAvatar,
                    userRole: data.senderRole
                });
            } else if (data.type === 'group_chat') {
                navigation.navigate('GroupChat', {
                    groupId: data.groupId,
                    groupName: data.groupName
                });
            } else if (data.type === 'work_assigned' || data.type === 'work_updated') {
                // Navigate based on role
                AsyncStorage.getItem('role').then(role => {
                    if (role === 'admin') {
                        navigation.navigate('AdminWork');
                    } else {
                        navigation.navigate('EmployeeWork');
                    }
                });
            }
        });
    }

    cleanup() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;
