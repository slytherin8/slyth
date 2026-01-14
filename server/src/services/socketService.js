class SocketService {
    io = null;
    users = new Map(); // userId -> socketId

    init(io) {
        this.io = io;
        this.io.on('connection', (socket) => {
            console.log('New socket connection:', socket.id);

            socket.on('authenticate', (userId) => {
                this.users.set(userId, socket.id);
                socket.join(userId);
                console.log(`User ${userId} authenticated on socket ${socket.id}`);
            });

            socket.on('join_channel', ({ channelId }) => {
                socket.join(channelId);
                console.log(`Socket ${socket.id} joined channel ${channelId}`);
            });

            socket.on('send_message', (data) => {
                // Broadcast to channel
                this.io.to(data.channelId).emit('new_message', data);
            });

            socket.on('typing', ({ channelId, userId, username, isTyping }) => {
                socket.to(channelId).emit('user_typing', { channelId, userId, username, isTyping });
            });

            socket.on('disconnect', () => {
                // Remove from users map
                for (let [userId, socketId] of this.users.entries()) {
                    if (socketId === socket.id) {
                        this.users.delete(userId);
                        break;
                    }
                }
                console.log('Socket disconnected:', socket.id);
            });
        });
    }

    sendToUser(userId, event, data) {
        if (this.io) {
            this.io.to(userId).emit(event, data);
        }
    }
}

module.exports = new SocketService();
