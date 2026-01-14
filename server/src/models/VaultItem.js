const mongoose = require('mongoose');

const vaultItemSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: Number,
    mimeType: String,
    encryptedContent: {
        type: String, // S3 URL or encrypted blob placeholder
        required: true
    },
    encryptionIV: {
        type: String,
        required: true
    },
    metadata: {
        title: String,
        description: String,
        tags: [String]
    },
    sharedWith: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permissions: {
            type: String,
            enum: ['read', 'write'],
            default: 'read'
        },
        sharedAt: { type: Date, default: Date.now }
    }],
    accessLog: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        action: String,
        timestamp: { type: Date, default: Date.now },
        ip: String
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

vaultItemSchema.index({ ownerId: 1, isDeleted: 1 });

const VaultItem = mongoose.model('VaultItem', vaultItemSchema);
module.exports = VaultItem;
