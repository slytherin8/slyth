const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
    cors: {
        origin: '*', // In production, restrict to your frontend domain
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/securecollab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes placeholders
app.use('/api/v1/auth', require('./src/routes/auth.routes'));
app.use('/api/v1/users', require('./src/routes/user.routes'));
app.use('/api/v1/channels', require('./src/routes/channel.routes'));
app.use('/api/v1/messages', require('./src/routes/message.routes'));
app.use('/api/v1/vault', require('./src/routes/vault.routes'));
app.use('/api/v1/calls', require('./src/routes/call.routes'));
app.use('/api/v1/notifications', require('./src/routes/notification.routes'));
app.use('/api/v1/games', require('./src/routes/game.routes'));

// Basic error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Socket.io connection handling
const socketService = require('./src/services/socketService');
socketService.init(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
