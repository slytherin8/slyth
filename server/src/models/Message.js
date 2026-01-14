const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    channelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    encryptionIV: String, // For end-to-end encryption
    type: {
        type: String,
        enum: ['text', 'file', 'system'],
        default: 'text'
    },
    fileAttachments: [{
        fileId: mongoose.Schema.Types.ObjectId,
        fileName: String,
        fileSize: Number,
        mimeType: String
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
        timestamp: { type: Date, default: Date.now }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    },
    isEdited: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for pagination and performance
messageSchema.index({ channelId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
