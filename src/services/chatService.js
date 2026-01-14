import api from './api';
import { encryptData, decryptData } from '../utils/encryption';
import { APP_CONSTANTS } from '../utils/constants';
import { MOCK_CHANNELS, MOCK_MESSAGES, MOCK_DIRECT_MESSAGES } from '../utils/mockData';

/**
 * Chat Service
 */

export const chatService = {
    /**
     * Get all channels
     */
    getChannels: async (filters = {}) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => resolve({
                data: MOCK_CHANNELS
            }), 500));
        }
        const response = await api.get('/channels', { params: filters });
        return response.data;
    },

    /**
     * Create new channel
     */
    createChannel: async (channelData) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return { data: { success: true, channel: { ...channelData, _id: 'new_chan' } } };
        }
        const response = await api.post('/channels', channelData);
        return response.data;
    },

    /**
     * Get channel messages
     */
    getChannelMessages: async (channelId, options = {}) => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return { data: { messages: MOCK_MESSAGES } };
        }
        const response = await api.get(`/channels/${channelId}/messages`, {
            params: options,
        });

        // Decrypt messages
        if (response.data.data && response.data.data.messages) {
            response.data.data.messages = await Promise.all(
                response.data.data.messages.map(async (msg) => {
                    if (msg.content && msg.encryptionIV) {
                        try {
                            // In production, use proper key exchange
                            const decryptedContent = decryptData(
                                msg.content,
                                'shared-channel-key', // Replace with actual key
                                msg.encryptionIV
                            );
                            return { ...msg, content: decryptedContent };
                        } catch (error) {
                            console.error('Failed to decrypt message:', error);
                            return msg;
                        }
                    }
                    return msg;
                })
            );
        }

        return response.data;
    },

    /**
     * Send message to channel
     */
    sendChannelMessage: async (channelId, messageData) => {
        // Encrypt message content
        if (messageData.content) {
            const { encrypted, iv } = await encryptData(
                messageData.content,
                'shared-channel-key' // Replace with actual key
            );
            messageData.content = encrypted;
            messageData.encryptionIV = iv;
        }

        const response = await api.post(`/channels/${channelId}/messages`, messageData);
        return response.data;
    },

    /**
     * Get direct message conversations
     */
    getDirectMessages: async () => {
        if (APP_CONSTANTS.USE_MOCK_DATA) {
            return new Promise((resolve) => setTimeout(() => resolve({
                data: MOCK_DIRECT_MESSAGES
            }), 500));
        }
        const response = await api.get('/direct-messages');
        return response.data;
    },

    /**
     * Get DM conversation history
     */
    getDMHistory: async (conversationId, options = {}) => {
        const response = await api.get(`/direct-messages/${conversationId}`, {
            params: options,
        });
        return response.data;
    },

    /**
     * Send direct message
     */
    sendDirectMessage: async (userId, messageData) => {
        // Encrypt message content
        if (messageData.content) {
            const { encrypted, iv } = await encryptData(
                messageData.content,
                'dm-encryption-key' // Replace with actual key
            );
            messageData.content = encrypted;
            messageData.encryptionIV = iv;
        }

        const response = await api.post(`/direct-messages/${userId}`, messageData);
        return response.data;
    },

    /**
     * Delete message
     */
    deleteMessage: async (messageId) => {
        const response = await api.delete(`/messages/${messageId}`);
        return response.data;
    },

    /**
     * Add reaction to message
     */
    addReaction: async (messageId, emoji) => {
        const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
        return response.data;
    },

    /**
     * Search messages
     */
    searchMessages: async (query, filters = {}) => {
        const response = await api.get('/messages/search', {
            params: { query, ...filters },
        });
        return response.data;
    },
};

export default chatService;
