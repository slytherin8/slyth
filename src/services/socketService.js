import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../utils/constants';

class SocketService {
    socket = null;
    listeners = new Map();

    /**
     * Connect to Socket.io server
     */
    async connect() {
        const token = await AsyncStorage.getItem('accessToken');

        this.socket = io(API_CONFIG.SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return this.socket;
    }

    /**
     * Disconnect from Socket.io server
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Join a channel room
     */
    joinChannel(channelId) {
        if (this.socket) {
            this.socket.emit('join_channel', { channelId });
        }
    }

    /**
     * Leave a channel room
     */
    leaveChannel(channelId) {
        if (this.socket) {
            this.socket.emit('leave_channel', { channelId });
        }
    }

    /**
     * Send message
     */
    sendMessage(data) {
        if (this.socket) {
            this.socket.emit('send_message', data);
        }
    }

    /**
     * Emit typing indicator
     */
    emitTyping(channelId, isTyping) {
        if (this.socket) {
            this.socket.emit('typing', { channelId, isTyping });
        }
    }

    /**
     * Listen for new messages
     */
    onNewMessage(callback) {
        if (this.socket) {
            this.socket.on('new_message', callback);
            this.listeners.set('new_message', callback);
        }
    }

    /**
     * Listen for user typing
     */
    onUserTyping(callback) {
        if (this.socket) {
            this.socket.on('user_typing', callback);
            this.listeners.set('user_typing', callback);
        }
    }

    /**
     * Listen for presence updates
     */
    onPresenceUpdate(callback) {
        if (this.socket) {
            this.socket.on('presence_update', callback);
            this.listeners.set('presence_update', callback);
        }
    }

    /**
     * Listen for call invitations
     */
    onCallInvitation(callback) {
        if (this.socket) {
            this.socket.on('call_invitation', callback);
            this.listeners.set('call_invitation', callback);
        }
    }

    /**
     * Listen for notifications
     */
    onNotification(callback) {
        if (this.socket) {
            this.socket.on('notification', callback);
            this.listeners.set('notification', callback);
        }
    }

    /**
     * WebRTC Signaling - Send offer
     */
    sendWebRTCOffer(callId, offer) {
        if (this.socket) {
            this.socket.emit('webrtc_offer', { callId, offer });
        }
    }

    /**
     * WebRTC Signaling - Send answer
     */
    sendWebRTCAnswer(callId, answer) {
        if (this.socket) {
            this.socket.emit('webrtc_answer', { callId, answer });
        }
    }

    /**
     * WebRTC Signaling - Send ICE candidate
     */
    sendICECandidate(callId, candidate) {
        if (this.socket) {
            this.socket.emit('ice_candidate', { callId, candidate });
        }
    }

    /**
     * WebRTC Signaling - Listen for offer
     */
    onWebRTCOffer(callback) {
        if (this.socket) {
            this.socket.on('webrtc_offer', callback);
        }
    }

    /**
     * WebRTC Signaling - Listen for answer
     */
    onWebRTCAnswer(callback) {
        if (this.socket) {
            this.socket.on('webrtc_answer', callback);
        }
    }

    /**
     * WebRTC Signaling - Listen for ICE candidate
     */
    onICECandidate(callback) {
        if (this.socket) {
            this.socket.on('ice_candidate', callback);
        }
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        if (this.socket) {
            this.listeners.forEach((callback, event) => {
                this.socket.off(event, callback);
            });
            this.listeners.clear();
        }
    }
}

export default new SocketService();
