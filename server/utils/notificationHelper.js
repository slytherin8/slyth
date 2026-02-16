const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

const expo = new Expo();

/**
 * Send push notification to a specific user
 * @param {string} userId - Target user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Extra data for deep linking
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
    try {
        const user = await User.findById(userId).select('pushToken');
        if (!user || !user.pushToken) {
            console.log(`Notification skipped: User ${userId} has no push token`);
            return;
        }

        if (!Expo.isExpoPushToken(user.pushToken)) {
            console.error(`Push token ${user.pushToken} is not a valid Expo push token`);
            return;
        }

        const messages = [{
            to: user.pushToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Notification sent successfully:', ticketChunk);
            } catch (error) {
                console.error('Error sending notification chunk:', error);
            }
        }
    } catch (error) {
        console.error('Push notification failed:', error);
    }
};

module.exports = {
    sendPushNotification
};
