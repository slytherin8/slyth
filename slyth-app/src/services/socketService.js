import { io } from 'socket.io-client';
import { API } from '../constants/api';
import AsyncStorage from '../utils/storage';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      // Extract user ID from token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id;

      this.socket = io(API, {
        transports: ['websocket'],
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket.id);
        this.isConnected = true;
        
        // Join user's room for receiving messages
        this.socket.emit('join_room', userId);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
      });

      // Listen for direct messages
      this.socket.on('direct_message', (message) => {
        this.emit('direct_message', message);
      });

      // Listen for group messages
      this.socket.on('group_message', (message) => {
        this.emit('group_message', message);
      });

      // Listen for unread count updates
      this.socket.on('unread_count_update', (data) => {
        this.emit('unread_count_update', data);
      });

    } catch (error) {
      console.error('Socket connection failed:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Socket event callback error:', error);
        }
      });
    }
  }

  // Send message to server
  sendMessage(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;