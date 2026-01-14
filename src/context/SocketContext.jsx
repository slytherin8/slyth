import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});
    const [onlineUsers, setOnlineUsers] = useState({});

    useEffect(() => {
        if (isAuthenticated) {
            connectSocket();
        } else {
            disconnectSocket();
        }

        return () => {
            disconnectSocket();
        };
    }, [isAuthenticated]);

    const connectSocket = async () => {
        try {
            await socketService.connect();
            setConnected(true);

            // Set up event listeners
            socketService.onNewMessage(handleNewMessage);
            socketService.onUserTyping(handleUserTyping);
            socketService.onPresenceUpdate(handlePresenceUpdate);
        } catch (error) {
            console.error('Socket connection error:', error);
            setConnected(false);
        }
    };

    const disconnectSocket = () => {
        socketService.removeAllListeners();
        socketService.disconnect();
        setConnected(false);
    };

    const handleNewMessage = (data) => {
        setMessages((prev) => [...prev, data.message]);
    };

    const handleUserTyping = (data) => {
        const { channelId, userId, username, isTyping } = data;

        setTypingUsers((prev) => {
            const channelTyping = prev[channelId] || {};

            if (isTyping) {
                return {
                    ...prev,
                    [channelId]: { ...channelTyping, [userId]: username },
                };
            } else {
                const updated = { ...channelTyping };
                delete updated[userId];
                return { ...prev, [channelId]: updated };
            }
        });
    };

    const handlePresenceUpdate = (data) => {
        const { userId, status } = data;
        setOnlineUsers((prev) => ({ ...prev, [userId]: status }));
    };

    const joinChannel = (channelId) => {
        socketService.joinChannel(channelId);
    };

    const leaveChannel = (channelId) => {
        socketService.leaveChannel(channelId);
    };

    const sendMessage = (messageData) => {
        socketService.sendMessage(messageData);
    };

    const emitTyping = (channelId, isTyping) => {
        socketService.emitTyping(channelId, isTyping);
    };

    const value = {
        connected,
        messages,
        typingUsers,
        onlineUsers,
        joinChannel,
        leaveChannel,
        sendMessage,
        emitTyping,
        socketService, // Expose service for advanced usage
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export default SocketContext;
